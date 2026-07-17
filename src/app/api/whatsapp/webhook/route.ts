import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/evolution";

// Webhook endpoint to receive WhatsApp messages from Evolution API
// Configuration: Configure this webhook in Evolution API to listen for MESSAGES_UPSERT
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[WhatsApp Webhook] Event received:", body.event);

    // Only process message upserts (incoming messages)
    if (body.event !== "messages.upsert" || !body.data) {
      return NextResponse.json({ success: true, message: "Ignored event" });
    }

    const messageData = body.data;
    const isGroup = messageData.key?.remoteJid?.includes("@g.us");
    const fromMe = messageData.key?.fromMe;

    if (isGroup || fromMe) {
      return NextResponse.json({ success: true, message: "Ignored group or outgoing message" });
    }

    const whatsappNumber = messageData.key?.remoteJid?.split("@")[0]; // Clean sender number
    const messageText = (messageData.message?.conversation || 
                         messageData.message?.extendedTextMessage?.text || 
                         "").trim();

    if (!whatsappNumber || !messageText) {
      return NextResponse.json({ success: true, message: "No text message content" });
    }

    console.log(`[WhatsApp Webhook] Message from: ${whatsappNumber}, Content: "${messageText}"`);

    // 1. Identify which User (Barber owner) owns the Evolution Instance that sent this webhook
    const instanceName = body.instance;
    const barberOwner = await prisma.user.findFirst({
      where: {
        evolutionInstance: instanceName,
        hasBarberia: true,
        isActive: true,
      },
    });

    if (!barberOwner) {
      console.warn(`[WhatsApp Webhook] No active BarberOS user found for instance: ${instanceName}`);
      return NextResponse.json({ success: true, message: "No active instance owner found" });
    }

    // 2. Fetch or create the customer in our BarberOS database
    let customer = await prisma.barberCustomer.findUnique({
      where: {
        userId_whatsapp: {
          userId: barberOwner.id,
          whatsapp: whatsappNumber,
        },
      },
    });

    let isNewCustomer = false;
    if (!customer) {
      isNewCustomer = true;
      customer = await prisma.barberCustomer.create({
        data: {
          userId: barberOwner.id,
          whatsapp: whatsappNumber,
          name: messageData.pushName || null,
          cutsCount: 2, // Head Start: 2 stamps free!
        },
      });
    }

    // 3. Conversational State Machine using simple DB checks
    // Check if there is a very recent cut (within last 5 minutes) where rating or staff is missing
    const incompleteCut = await prisma.barberCut.findFirst({
      where: {
        userId: barberOwner.id,
        customerId: customer.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 mins
        },
        OR: [
          { staffId: null },
          { rating: null },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Sub-Flow: Rating / Staff selection is active
    if (incompleteCut) {
      // Step A: We need the staff selection
      if (!incompleteCut.staffId) {
        // Find staff members of this business
        const staffList = await prisma.barberStaff.findMany({
          where: { userId: barberOwner.id },
          orderBy: { name: "asc" },
        });

        const selectedIndex = parseInt(messageText) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= staffList.length) {
          // Send options list again
          let staffPrompt = `Por favor selecciona el número del estilista/peluquero que te atendió:\n\n`;
          staffList.forEach((s, idx) => {
            staffPrompt += `${idx + 1}. ${s.name}\n`;
          });
          await sendWhatsAppMessage(instanceName, whatsappNumber, staffPrompt);
          return NextResponse.json({ success: true });
        }

        const selectedStaff = staffList[selectedIndex];
        await prisma.barberCut.update({
          where: { id: incompleteCut.id },
          data: { staffId: selectedStaff.id },
        });

        // Now immediately request rating
        await sendWhatsAppMessage(
          instanceName,
          whatsappNumber,
          `¡Perfecto! Califica la atención de *${selectedStaff.name}* del 1 al 5:\n\n1. ⭐ (Muy mala)\n2. ⭐⭐\n3. ⭐⭐⭐\n4. ⭐⭐⭐⭐\n5. ⭐⭐⭐⭐⭐ (Excelente)`
        );
        return NextResponse.json({ success: true });
      }

      // Step B: We need the rating
      if (incompleteCut.rating === null) {
        const rating = parseInt(messageText);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          await sendWhatsAppMessage(
            instanceName,
            whatsappNumber,
            `Por favor, responde únicamente con un número del 1 al 5 para calificar la atención. ⭐`
          );
          return NextResponse.json({ success: true });
        }

        // Update the cut with the rating
        await prisma.barberCut.update({
          where: { id: incompleteCut.id },
          data: { rating },
        });

        // Increment cutsCount on the customer
        const updatedCustomer = await prisma.barberCustomer.update({
          where: { id: customer.id },
          data: {
            cutsCount: { increment: 1 },
            lastVisit: new Date(),
          },
        });

        // Generate progress response
        const targetCuts = barberOwner.barberRequiredCuts || 5;
        const currentCount = updatedCustomer.cutsCount % targetCuts;
        const progressFill = "█".repeat(currentCount);
        const progressEmpty = "░".repeat(targetCuts - currentCount);

        let responseMsg = `Perfecto. Tu corte ha quedado registrado. ✂️\n\n`;
        responseMsg += `Llevas: [${progressFill}${progressEmpty}] ${currentCount === 0 ? targetCuts : currentCount} de ${targetCuts}\n\n`;

        if (currentCount === 0) {
          responseMsg += `🎉 ¡Felicidades! Tu próximo corte será totalmente *GRATIS*. Consérvalo para tu siguiente visita.`;
        } else {
          responseMsg += `Te faltan ${targetCuts - currentCount} cortes para obtener un corte *GRATIS*.\n\n`;
          
          // 2. Refuerzo de Razón Variable (Efecto Casino) - A la mitad del camino o en el segundo corte
          if (currentCount === 2 || currentCount === Math.floor(targetCuts / 2)) {
            responseMsg += `🎁 *¡Ojo!* En tu próxima visita podrías recibir una sorpresa especial (desde un sello extra hasta un producto de cortesía para el cabello) 🤫.\n`;
          }
          
          // 3. Near Miss Effect (Efecto de Casi Ganar) - Cuando falta exactamente 1 corte
          if (targetCuts - currentCount === 1) {
            responseMsg += `⚡ *¡Bro, estás a un solo corte de tu premio!* Solo por esta semana, si vienes antes del jueves, tu recompensa se activa inmediatamente.\n`;
          }
        }

        await sendWhatsAppMessage(instanceName, whatsappNumber, responseMsg);

        // 4. FOMO y Urgencia (Pérdidas disfrazadas) para Reseña de Google
        if (rating >= 4 && !customer.hasReviewed && barberOwner.barberGoogleMapsUrl) {
          const reviewMsg = `¿Nos ayudarías con una reseña en Google? Tu opinión vale muchísimo para nosotros:\n\n👉 Escribe una reseña y obtén beneficios en tu próximo corte:\n${barberOwner.barberGoogleMapsUrl}\n\n⏳ *¡Vence en 48 horas!* Escribe la reseña ahora antes de que expire el beneficio especial.`;
          await sendWhatsAppMessage(instanceName, whatsappNumber, reviewMsg);
        }

        return NextResponse.json({ success: true });
      }
    }

    // Default Main Flow: User sent a text message (should be the validation code)
    const codeObj = await prisma.barberCode.findFirst({
      where: {
        userId: barberOwner.id,
        code: messageText.toUpperCase(),
        isUsed: false,
      },
    });

    if (!codeObj) {
      // Check if it looks like a code or general text
      let welcomeMsg = `¡Hola! Bienvenido al Sistema de Fidelización de *${barberOwner.businessName || "nuestra Barbería"}*. 💈\n\n`;
      if (isNewCustomer) {
        welcomeMsg += `🎁 *¡Te damos la bienvenida con un regalo!* Por ser tu primera vez, te regalamos tus primeros *2 sellos* gratis.\n\n`;
      }
      welcomeMsg += `Por favor, escribe el código de 4 dígitos que te entregó la caja para registrar tu corte de hoy.`;
      
      await sendWhatsAppMessage(
        instanceName,
        whatsappNumber,
        welcomeMsg
      );
      return NextResponse.json({ success: true });
    }

    // Code is valid! Block code reuse
    await prisma.barberCode.update({
      where: { id: codeObj.id },
      data: { isUsed: true },
    });

    // Create the pending cut record
    await prisma.barberCut.create({
      data: {
        userId: barberOwner.id,
        customerId: customer.id,
        codeUsed: codeObj.code,
      },
    });

    // Generate a fresh 4-character code for this business automatically
    const nextCodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let nextCode = "";
    for (let i = 0; i < 4; i++) {
      nextCode += nextCodeChars.charAt(Math.floor(Math.random() * nextCodeChars.length));
    }

    await prisma.barberCode.create({
      data: {
        userId: barberOwner.id,
        code: nextCode,
      },
    });

    // Ask who attended the customer (Staff list)
    const staffList = await prisma.barberStaff.findMany({
      where: { userId: barberOwner.id },
      orderBy: { name: "asc" },
    });

    if (staffList.length === 0) {
      // No staff registered, skip to rating
      await sendWhatsAppMessage(
        instanceName,
        whatsappNumber,
        `¡Código validado! Por favor, califica tu atención del 1 al 5:\n\n1. ⭐\n2. ⭐⭐\n3. ⭐⭐⭐\n4. ⭐⭐⭐⭐\n5. ⭐⭐⭐⭐⭐`
      );
    } else {
      let staffPrompt = `¡Código validado! ✂️\n¿Quién te atendió el día de hoy? Selecciona el número:\n\n`;
      staffList.forEach((s, idx) => {
        staffPrompt += `${idx + 1}. ${s.name}\n`;
      });
      await sendWhatsAppMessage(instanceName, whatsappNumber, staffPrompt);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]:", error);
    return NextResponse.json({ error: "Error processing webhook" }, { status: 500 });
  }
}
