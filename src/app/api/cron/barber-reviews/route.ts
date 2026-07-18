import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/evolution";

export const dynamic = "force-dynamic";

// GET - Run cron job to send haircut review reminders after 2 hours
export async function GET(req: NextRequest) {
  try {
    // Auth check via secret cron key if needed, or allow it for trigger
    const authHeader = req.headers.get("authorization");
    
    // We look for customers whose last cut was >= 2 hours ago, and < 24 hours ago,
    // and who haven't received the review request for this cut yet.
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const customersPendingReview = await prisma.barberCustomer.findMany({
      where: {
        lastCutAt: {
          gte: twentyFourHoursAgo,
          lte: twoHoursAgo,
        },
        reviewRequestSent: false,
      },
      include: {
        user: {
          select: {
            evolutionInstance: true,
            businessName: true,
            barberGoogleMapsUrl: true,
          },
        },
      },
    });

    console.log(`[Barber Reviews Cron] Found ${customersPendingReview.length} customers eligible for 2h feedback reminder.`);

    let sentCount = 0;

    for (const customer of customersPendingReview) {
      if (!customer.user.evolutionInstance) {
        continue;
      }

      // Check if they already did review in the chat or we just ask for feedback
      const bizName = customer.user.businessName || "la barbería";
      
      let message = `¡Hola *${customer.name || "amigo"}*! 👋 Hace un rato te cortaste el cabello en *${bizName}*. \n\nEsperamos que hayas tenido una excelente experiencia. ¿Nos ayudarías calificando tu corte respondiendo a este mensaje? ⭐\n\n`;
      
      if (customer.user.barberGoogleMapsUrl) {
        message += `También, si deseas apoyarnos, puedes dejarnos tu opinión en Google aquí: ${customer.user.barberGoogleMapsUrl} 🌐`;
      } else {
        message += `¡Gracias por tu preferencia!`;
      }

      console.log(`[Barber Reviews Cron] Sending 2h review message to ${customer.whatsapp} via ${customer.user.evolutionInstance}`);
      
      const sendResult = await sendWhatsAppMessage(
        customer.user.evolutionInstance,
        customer.whatsapp,
        message
      );

      if (sendResult.success) {
        // Mark as sent
        await prisma.barberCustomer.update({
          where: { id: customer.id },
          data: { reviewRequestSent: true },
        });
        sentCount++;
      } else {
        console.error(`[Barber Reviews Cron] Failed to send message to ${customer.whatsapp}:`, sendResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: customersPendingReview.length,
      sent: sentCount,
    });
  } catch (error) {
    console.error("[Barber Reviews Cron] Error executing cron:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
