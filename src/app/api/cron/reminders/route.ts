import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This endpoint should be called by a cron job (e.g., every hour or every day at 9 AM)
// Example: curl -X POST http://localhost:3000/api/cron/reminders

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find pending reminders for today
    const pendingReminders = await prisma.reminderSchedule.findMany({
      where: {
        status: "pending",
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        record: {
          include: {
            client: true,
            user: {
              select: { businessName: true, whatsappSender: true },
            },
          },
        },
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const reminder of pendingReminders) {
      const { record, reminderNumber } = reminder;
      const businessName = record.user.businessName || "nuestro negocio";

      // Build message based on reminder number
      let message = "";
      const todayStr = new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
      });

      if (reminderNumber === 1) {
        // First reminder - due date
        message = `Hola ${record.client.name} 👋\n`;
        message += `Te recordamos que el día de hoy (${todayStr}) debes devolver: ${record.description}.`;
        if (record.amount) {
          message += ` Monto: $${Number(record.amount).toFixed(2)}`;
        }
        message += `\n¡Gracias por confiar en ${businessName}!`;
      } else {
        // Follow-up reminders
        const daysLate = (reminderNumber - 1) * 2;
        message = `Hola ${record.client.name} 👋\n`;
        message += `Te contactamos de ${businessName}.\n`;
        message += `Tenemos pendiente la devolución de: ${record.description}.`;
        if (record.amount) {
          message += ` Monto: $${Number(record.amount).toFixed(2)}`;
        }
        message += `\nPor favor comunícate con nosotros. Gracias 🙏`;
      }

      try {
        // In production, this would call Evolution API
        // For now, we just log it
        console.log(`[WHATSAPP] Reminder ${reminderNumber} to ${record.client.phone}:`, message);

        // Log the message
        await prisma.messageLog.create({
          data: {
            recordId: record.id,
            messageText: message,
            status: "sent",
          },
        });

        // Mark reminder as sent
        await prisma.reminderSchedule.update({
          where: { id: reminder.id },
          data: {
            status: "sent",
            sentAt: new Date(),
          },
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        
        await prisma.reminderSchedule.update({
          where: { id: reminder.id },
          data: { status: "failed" },
        });

        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingReminders.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json(
      { error: "Error processing reminders" },
      { status: 500 }
    );
  }
}