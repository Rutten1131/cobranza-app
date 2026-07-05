import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { sendWhatsAppMessage } from "@/lib/evolution";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const { id } = await params;

    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const record = await prisma.record.findFirst({
      where: { id, userId: auth.userId },
      include: {
        client: true,
        user: {
          select: { businessName: true, evolutionInstance: true, defaultReminderMessage: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    if (!record.user.evolutionInstance) {
      return NextResponse.json(
        { error: "No tienes una instancia de WhatsApp configurada. Conecta tu WhatsApp primero." },
        { status: 400 }
      );
    }

    // Build reminder message
    const businessName = record.user.businessName || "nuestro negocio";
    const today = new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    });

    let message: string;
    const rawTemplate = record.customMessage || record.user.defaultReminderMessage;
    
    if (rawTemplate) {
      // Use template with placeholder substitution
      message = rawTemplate
        .replace(/{nombre}/g, record.client.name)
        .replace(/{descripcion}/g, record.description)
        .replace(/{monto}/g, record.amount ? `$${Number(record.amount).toFixed(2)}` : "")
        .replace(/{negocio}/g, businessName)
        .replace(/{fecha}/g, today);
    } else {
      // Default built-in message
      message = `Hola ${record.client.name} 👋\n`;
      message += `Te recordamos que el día de hoy (${today}) debes devolver: ${record.description}.`;
      if (record.amount) {
        message += ` Monto: $${Number(record.amount).toFixed(2)}`;
      }
      message += `\n¡Gracias por confiar en ${businessName}!`;
    }

    // Send via Evolution API
    console.log(`[WHATSAPP REMIND] ============================================`);
    console.log(`[WHATSAPP REMIND] Record ID: ${record.id}`);
    console.log(`[WHATSAPP REMIND] Client: ${record.client.name} | Phone: ${record.client.phone}`);
    console.log(`[WHATSAPP REMIND] Evolution Instance: ${record.user.evolutionInstance}`);
    console.log(`[WHATSAPP REMIND] Message: ${message.substring(0, 80)}...`);

    const sendResult = await sendWhatsAppMessage(
      record.user.evolutionInstance,
      record.client.phone,
      message
    );

    console.log(`[WHATSAPP REMIND] Result: success=${sendResult.success}`, sendResult.error || "");
    console.log(`[WHATSAPP REMIND] ============================================`);

    if (!sendResult.success) {
      console.error("[WHATSAPP REMIND] FAILED:", sendResult.error);

      await prisma.messageLog.create({
        data: {
          recordId: record.id,
          messageText: message,
          status: "failed",
        },
      });

      return NextResponse.json(
        { error: `Error al enviar el mensaje: ${sendResult.error}` },
        { status: 500 }
      );
    }

    // Log the message
    await prisma.messageLog.create({
      data: {
        recordId: record.id,
        messageText: message,
        status: "sent",
      },
    });

    // Mark reminder as sent
    await prisma.record.update({
      where: { id },
      data: { reminderSent: true },
    });

    return NextResponse.json({
      message: `Recordatorio enviado a ${record.client.name}`,
      success: true,
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: "Error al enviar el recordatorio" },
      { status: 500 }
    );
  }
}