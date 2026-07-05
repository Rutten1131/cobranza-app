import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/evolution";

// This endpoint should be called by a cron job (e.g., every hour or every day at 9 AM)
// Example: curl -X POST http://localhost:3000/api/cron/reminders

export async function GET() {
  return handleCron();
}

export async function POST() {
  return handleCron();
}

async function handleCron() {
  try {
    const now = new Date();

    // Find pending reminders scheduled for now or in the past
    const pendingReminders = await prisma.reminderSchedule.findMany({
      where: {
        status: "pending",
        scheduledDate: {
          lte: now,
        },
      },
      include: {
        record: {
          include: {
            client: true,
            user: {
              select: { businessName: true, whatsappSender: true, evolutionInstance: true, defaultReminderMessage: true },
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
      const instanceName = record.user.evolutionInstance;

      if (!instanceName) {
        console.error(`[WHATSAPP CRON] User has no evolutionInstance configured for reminder ${reminder.id}`);
        await prisma.reminderSchedule.update({
          where: { id: reminder.id },
          data: { status: "failed" },
        });
        failedCount++;
        continue;
      }

      // Build message based on reminder number or templates
      let message = "";
      const todayStr = new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
      });

      const rawTemplate = record.customMessage || record.user.defaultReminderMessage;

      if (rawTemplate) {
        // Use custom message template with placeholders
        message = rawTemplate
          .replace(/{nombre}/g, record.client.name)
          .replace(/{descripcion}/g, record.description)
          .replace(/{monto}/g, record.amount ? `$${Number(record.amount).toFixed(2)}` : "")
          .replace(/{negocio}/g, businessName)
          .replace(/{fecha}/g, todayStr);
      } else {
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
          message = `Hola ${record.client.name} 👋\n`;
          message += `Te contactamos de ${businessName}.\n`;
          message += `Tenemos pendiente la devolución de: ${record.description}.`;
          if (record.amount) {
            message += ` Monto: $${Number(record.amount).toFixed(2)}`;
          }
          message += `\nPor favor comunícate con nosotros. Gracias 🙏`;
        }
      }

      try {
        console.log(`[WHATSAPP CRON] Sending reminder ${reminderNumber} to ${record.client.phone} using instance ${instanceName}`);
        
        const sendResult = await sendWhatsAppMessage(instanceName, record.client.phone, message);

        if (!sendResult.success) {
          throw new Error(sendResult.error || "Unknown error");
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

        await prisma.messageLog.create({
          data: {
            recordId: record.id,
            messageText: message,
            status: "failed",
          },
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