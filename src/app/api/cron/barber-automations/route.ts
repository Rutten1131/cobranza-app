import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/evolution";

export const dynamic = "force-dynamic";

// GET - Cron: Automated Premium actions (inactive clients, birthdays)
// Only processes users with hasBarberiaPremium = true
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Only process Premium users with active WhatsApp
    const premiumUsers = await prisma.user.findMany({
      where: {
        hasBarberia: true,
        hasBarberiaPremium: true,
        isActive: true,
        evolutionInstance: { not: null },
      },
    });

    console.log(`[Barber Automations] Processing ${premiumUsers.length} Premium users`);

    let totalInactiveSent = 0;
    let totalBirthdaySent = 0;

    for (const user of premiumUsers) {
      if (!user.evolutionInstance) continue;
      const bizName = user.businessName || "la barbería";

      // ============================================================
      // 1. INACTIVE CLIENT REMINDERS (>30 days, not notified in last 7 days)
      // ============================================================
      const inactiveCustomers = await prisma.barberCustomer.findMany({
        where: {
          userId: user.id,
          lastVisit: { lt: thirtyDaysAgo },
          OR: [
            { lastNotifiedInactive: null },
            { lastNotifiedInactive: { lt: sevenDaysAgo } },
          ],
        },
        take: 5, // Max 5 per cron run to avoid rate limits
      });

      for (const customer of inactiveCustomers) {
        const daysSince = Math.floor((now.getTime() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24));

        const msg = `¡Hola ${customer.name || "amigo"}! 👋\n\nTe extrañamos en *${bizName}*. Han pasado *${daysSince} días* desde tu última visita. 💈\n\n🎁 Tenemos algo especial esperándote en tu próximo corte. ¡No te lo pierdas!\n\n¿Te agendamos? Solo responde a este mensaje. 😎`;

        const result = await sendWhatsAppMessage(user.evolutionInstance, customer.whatsapp, msg);
        if (result.success) {
          await prisma.barberCustomer.update({
            where: { id: customer.id },
            data: { lastNotifiedInactive: now },
          });
          totalInactiveSent++;
        }
      }

      // ============================================================
      // 2. BIRTHDAY GREETINGS (today's birthdays)
      // ============================================================
      const customersWithBirthday = await prisma.barberCustomer.findMany({
        where: { userId: user.id, birthday: { not: null } },
      });

      for (const customer of customersWithBirthday) {
        if (!customer.birthday) continue;
        const bday = new Date(customer.birthday);
        // Check if today is the birthday (same month and day)
        if (bday.getMonth() === now.getMonth() && bday.getDate() === now.getDate()) {
          const msg = `🎂 ¡Feliz Cumpleaños, *${customer.name || "amigo"}*! 🎉\n\nDesde *${bizName}* te deseamos un día increíble. 💈\n\n🎁 Como regalo especial, tu próximo corte tiene un *descuento de cumpleaños*. ¡Ven a celebrar con estilo!\n\nVálido toda esta semana. 🥳`;

          const result = await sendWhatsAppMessage(user.evolutionInstance, customer.whatsapp, msg);
          if (result.success) totalBirthdaySent++;
        }
      }
    }

    console.log(`[Barber Automations] Sent ${totalInactiveSent} inactive reminders, ${totalBirthdaySent} birthday greetings`);

    return NextResponse.json({
      success: true,
      premiumUsers: premiumUsers.length,
      inactiveSent: totalInactiveSent,
      birthdaySent: totalBirthdaySent,
    });
  } catch (error) {
    console.error("[Barber Automations Error]:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
