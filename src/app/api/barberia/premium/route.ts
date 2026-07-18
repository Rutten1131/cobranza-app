import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET - Premium Analytics: Reputation, Business Intelligence, Automations data
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: auth.userId, hasBarberia: true, hasBarberiaPremium: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Plan Premium requerido" }, { status: 403 });
    }

    const now = new Date();

    // ============================================================
    // 1. MOTOR DE REPUTACIÓN DIGITAL
    // ============================================================

    // All cuts with ratings
    const allRatedCuts = await prisma.barberCut.findMany({
      where: { userId: user.id, rating: { not: null } },
      include: { staff: true, customer: true },
      orderBy: { createdAt: "asc" },
    });

    // Overall average rating
    const avgRatingResult = await prisma.barberCut.aggregate({
      where: { userId: user.id, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const overallAvgRating = avgRatingResult._avg.rating ? Number(avgRatingResult._avg.rating).toFixed(1) : "0.0";
    const totalRatings = avgRatingResult._count.rating;

    // Star distribution (1-5)
    const starDistribution = [1, 2, 3, 4, 5].map(star => ({
      stars: star,
      count: allRatedCuts.filter(c => c.rating === star).length,
    }));

    // Rating evolution by week (last 12 weeks)
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const ratingEvolution: { week: string; avg: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekCuts = allRatedCuts.filter(c => {
        const d = new Date(c.createdAt);
        return d >= weekStart && d < weekEnd;
      });

      const weekAvg = weekCuts.length > 0
        ? weekCuts.reduce((sum, c) => sum + (c.rating || 0), 0) / weekCuts.length
        : 0;

      const label = weekStart.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
      ratingEvolution.push({
        week: label,
        avg: Number(weekAvg.toFixed(1)),
        count: weekCuts.length,
      });
    }

    // Staff ranking by rating
    const staffRatings = await prisma.barberCut.groupBy({
      by: ["staffId"],
      where: { userId: user.id, rating: { not: null }, staffId: { not: null } },
      _avg: { rating: true },
      _count: { id: true },
    });

    const staffList = await prisma.barberStaff.findMany({ where: { userId: user.id } });
    const staffRanking = staffRatings
      .map(s => ({
        name: staffList.find(st => st.id === s.staffId)?.name || "Sin asignar",
        avgRating: Number(s._avg.rating || 0).toFixed(1),
        totalCuts: s._count.id,
      }))
      .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating));

    // Google reviews tracking
    const googleReviewsCount = await prisma.barberReview.count({
      where: { userId: user.id, googleReview: true },
    });
    const totalReviews = await prisma.barberReview.count({
      where: { userId: user.id },
    });
    const customersWithReview = await prisma.barberCustomer.count({
      where: { userId: user.id, hasReviewed: true },
    });
    const totalCustomers = await prisma.barberCustomer.count({
      where: { userId: user.id },
    });

    // ============================================================
    // 2. INTELIGENCIA COMERCIAL
    // ============================================================

    // All cuts for analysis
    const allCuts = await prisma.barberCut.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    // Cuts by hour of day (0-23)
    const cutsByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, "0")}:00`,
      count: allCuts.filter(c => new Date(c.createdAt).getHours() === h).length,
    }));

    // Filter only business hours (7am-10pm)
    const businessHoursCuts = cutsByHour.filter(h => {
      const hour = parseInt(h.hour);
      return hour >= 7 && hour <= 22;
    });

    // Peak and dead hours
    const peakHour = businessHoursCuts.reduce((max, h) => h.count > max.count ? h : max, businessHoursCuts[0]);
    const deadHour = businessHoursCuts.filter(h => h.count > 0).reduce(
      (min, h) => h.count < min.count ? h : min,
      businessHoursCuts.find(h => h.count > 0) || businessHoursCuts[0]
    );

    // Cuts by day of week
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const cutsByDay = dayNames.map((name, idx) => ({
      day: name,
      count: allCuts.filter(c => new Date(c.createdAt).getDay() === idx).length,
    }));

    const bestDay = cutsByDay.reduce((max, d) => d.count > max.count ? d : max, cutsByDay[0]);

    // Weekly trend (last 8 weeks)
    const weeklyTrend: { week: string; cuts: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekCuts = allCuts.filter(c => {
        const d = new Date(c.createdAt);
        return d >= weekStart && d < weekEnd;
      });

      const label = weekStart.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
      weeklyTrend.push({ week: label, cuts: weekCuts.length });
    }

    // Prediction: average of last 4 weeks
    const last4Weeks = weeklyTrend.slice(-4);
    const prediction = last4Weeks.length > 0
      ? Math.round(last4Weeks.reduce((sum, w) => sum + w.cuts, 0) / last4Weeks.length)
      : 0;

    // Retention rate: % of customers who visited in last 30 days out of all customers
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeCustomers = await prisma.barberCustomer.count({
      where: { userId: user.id, lastVisit: { gte: thirtyDaysAgo } },
    });
    const retentionRate = totalCustomers > 0
      ? Math.round((activeCustomers / totalCustomers) * 100)
      : 0;

    // ============================================================
    // 3. AUTOMATIZACIONES — Datos para UI
    // ============================================================

    // Inactive customers (>30 days without visit)
    const inactiveCustomers = await prisma.barberCustomer.findMany({
      where: {
        userId: user.id,
        lastVisit: { lt: thirtyDaysAgo },
      },
      orderBy: { lastVisit: "asc" },
      take: 20,
    });

    // Birthday customers (next 7 days)
    // We compare month+day for the next 7 days
    const upcomingBirthdays: any[] = [];
    const allCustomersWithBirthday = await prisma.barberCustomer.findMany({
      where: { userId: user.id, birthday: { not: null } },
    });

    for (const cust of allCustomersWithBirthday) {
      if (!cust.birthday) continue;
      const bday = new Date(cust.birthday);
      const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      const diffDays = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) {
        upcomingBirthdays.push({
          id: cust.id,
          name: cust.name,
          whatsapp: cust.whatsapp,
          birthday: cust.birthday,
          daysUntil: diffDays,
        });
      }
    }

    // Low demand hours for promotions
    const avgCutsPerHour = businessHoursCuts.length > 0
      ? businessHoursCuts.reduce((sum, h) => sum + h.count, 0) / businessHoursCuts.length
      : 0;
    const lowDemandHours = businessHoursCuts
      .filter(h => h.count < avgCutsPerHour * 0.5 && h.count > 0)
      .map(h => h.hour);

    return NextResponse.json({
      reputation: {
        overallAvgRating,
        totalRatings,
        starDistribution,
        ratingEvolution,
        staffRanking,
        googleReviewsCount,
        totalReviews,
        customersWithReview,
        totalCustomers,
      },
      intelligence: {
        cutsByHour: businessHoursCuts,
        cutsByDay,
        peakHour: peakHour?.hour || "N/A",
        deadHour: deadHour?.hour || "N/A",
        bestDay: bestDay?.day || "N/A",
        weeklyTrend,
        prediction,
        retentionRate,
        totalCuts: allCuts.length,
      },
      automations: {
        inactiveCustomers: inactiveCustomers.map(c => ({
          id: c.id,
          name: c.name,
          whatsapp: c.whatsapp,
          lastVisit: c.lastVisit,
          cutsCount: c.cutsCount,
          daysSinceVisit: Math.floor((now.getTime() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        upcomingBirthdays,
        lowDemandHours,
      },
    });
  } catch (error) {
    console.error("[Premium Analytics Error]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST - Premium actions (send inactive reminder, send birthday message, send promo)
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: auth.userId, hasBarberia: true, hasBarberiaPremium: true },
    });

    if (!user || !user.evolutionInstance) {
      return NextResponse.json({ error: "Plan Premium y WhatsApp requeridos" }, { status: 403 });
    }

    const { sendWhatsAppMessage } = await import("@/lib/evolution");
    const body = await req.json();
    const { action } = body;

    // Send reminder to inactive customer
    if (action === "remindInactive") {
      const { customerId } = body;
      const customer = await prisma.barberCustomer.findUnique({ where: { id: customerId } });
      if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

      const bizName = user.businessName || "la barbería";
      const daysSince = Math.floor((Date.now() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24));

      const msg = `¡Hola ${customer.name || "amigo"}! 👋\n\nTe extrañamos en *${bizName}*. Han pasado ${daysSince} días desde tu última visita. 💈\n\n🎁 Tenemos una sorpresa especial esperándote en tu próximo corte. ¡No te la pierdas!\n\n¿Te reservamos un espacio? Responde a este mensaje. 😎`;

      const result = await sendWhatsAppMessage(user.evolutionInstance, customer.whatsapp, msg);
      if (result.success) {
        await prisma.barberCustomer.update({
          where: { id: customerId },
          data: { lastNotifiedInactive: new Date() },
        });
      }
      return NextResponse.json({ success: result.success });
    }

    // Send birthday message
    if (action === "sendBirthday") {
      const { customerId } = body;
      const customer = await prisma.barberCustomer.findUnique({ where: { id: customerId } });
      if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

      const bizName = user.businessName || "la barbería";
      const msg = `🎂 ¡Feliz Cumpleaños, ${customer.name || "amigo"}! 🎉\n\nDesde *${bizName}* te deseamos un increíble día. 💈\n\n🎁 Como regalo especial, tu próximo corte tiene un *descuento especial de cumpleaños*. ¡Ven a celebrar con nosotros!\n\nVálido toda esta semana. 🥳`;

      const result = await sendWhatsAppMessage(user.evolutionInstance, customer.whatsapp, msg);
      return NextResponse.json({ success: result.success });
    }

    // Send promo for low demand hours
    if (action === "sendPromo") {
      const { customerId, promoText } = body;
      const customer = await prisma.barberCustomer.findUnique({ where: { id: customerId } });
      if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

      const result = await sendWhatsAppMessage(user.evolutionInstance, customer.whatsapp, promoText);
      return NextResponse.json({ success: result.success });
    }

    // Bulk send inactive reminders
    if (action === "bulkRemindInactive") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const inactiveCustomers = await prisma.barberCustomer.findMany({
        where: {
          userId: user.id,
          lastVisit: { lt: thirtyDaysAgo },
          OR: [
            { lastNotifiedInactive: null },
            { lastNotifiedInactive: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
        take: 10,
      });

      let sent = 0;
      const bizName = user.businessName || "la barbería";

      for (const customer of inactiveCustomers) {
        const daysSince = Math.floor((Date.now() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24));
        const msg = `¡Hola ${customer.name || "amigo"}! 👋\n\nTe extrañamos en *${bizName}*. Han pasado ${daysSince} días desde tu última visita. 💈\n\n🎁 Tenemos algo especial esperándote. ¡Ven pronto!\n\n¿Te agendamos? Responde a este mensaje. 😎`;

        const result = await sendWhatsAppMessage(user.evolutionInstance, customer.whatsapp, msg);
        if (result.success) {
          await prisma.barberCustomer.update({
            where: { id: customer.id },
            data: { lastNotifiedInactive: new Date() },
          });
          sent++;
        }
      }

      return NextResponse.json({ success: true, sent, total: inactiveCustomers.length });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("[Premium Action Error]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
