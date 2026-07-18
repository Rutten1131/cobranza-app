import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST - AI Manager: Answer business questions with real data
export async function POST(req: NextRequest) {
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

    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Pregunta requerida" }, { status: 400 });
    }

    const q = question.toLowerCase().trim();
    const now = new Date();
    const bizName = user.businessName || "tu barbería";

    // ============================================================
    // PATTERN MATCHING INTELLIGENT AI
    // ============================================================

    // --- "¿Cómo estuvo esta semana?" / "resumen semanal" ---
    if (q.includes("semana") || q.includes("resumen") || q.includes("cómo est") || q.includes("como est") || q.includes("como va")) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekCuts = await prisma.barberCut.count({
        where: { userId: user.id, createdAt: { gte: weekStart } },
      });

      const weekRatings = await prisma.barberCut.aggregate({
        where: { userId: user.id, createdAt: { gte: weekStart }, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const newCustomersThisWeek = await prisma.barberCustomer.count({
        where: { userId: user.id, createdAt: { gte: weekStart } },
      });

      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekCuts = await prisma.barberCut.count({
        where: { userId: user.id, createdAt: { gte: prevWeekStart, lt: weekStart } },
      });

      const trend = weekCuts > prevWeekCuts ? "📈 en crecimiento" : weekCuts < prevWeekCuts ? "📉 bajó un poco" : "➡️ se mantuvo igual";
      const changePercent = prevWeekCuts > 0 ? Math.round(((weekCuts - prevWeekCuts) / prevWeekCuts) * 100) : 0;

      // Best day of the week
      const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const weekCutsAll = await prisma.barberCut.findMany({
        where: { userId: user.id, createdAt: { gte: weekStart } },
      });
      const dayCount: Record<number, number> = {};
      weekCutsAll.forEach(c => {
        const day = new Date(c.createdAt).getDay();
        dayCount[day] = (dayCount[day] || 0) + 1;
      });
      const bestDayIdx = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
      const bestDayName = bestDayIdx ? dayNames[parseInt(bestDayIdx[0])] : "N/A";

      const avgRating = weekRatings._avg.rating ? Number(weekRatings._avg.rating).toFixed(1) : "sin calificaciones";

      return NextResponse.json({
        answer: `📊 *Resumen Semanal de ${bizName}*\n\n✂️ Cortes esta semana: *${weekCuts}* ${trend} (${changePercent > 0 ? "+" : ""}${changePercent}% vs semana anterior)\n⭐ Calificación promedio: *${avgRating}* (${weekRatings._count.rating} calificaciones)\n✨ Clientes nuevos: *${newCustomersThisWeek}*\n📅 Mejor día: *${bestDayName}*\n\n${weekCuts > prevWeekCuts ? "¡Gran semana! El negocio va creciendo. 💪" : weekCuts < prevWeekCuts ? "Semana un poco más baja. Considera enviar promociones a clientes inactivos." : "Semana estable. ¡Sigue así!"}`,
      });
    }

    // --- "¿Quién fue mi mejor peluquero?" ---
    if (q.includes("mejor peluquero") || q.includes("mejor barbero") || q.includes("mejor estilista") || q.includes("ranking") || q.includes("staff")) {
      const staffRatings = await prisma.barberCut.groupBy({
        by: ["staffId"],
        where: { userId: user.id, rating: { not: null }, staffId: { not: null } },
        _avg: { rating: true },
        _count: { id: true },
      });

      const staffList = await prisma.barberStaff.findMany({ where: { userId: user.id } });
      const ranking = staffRatings
        .map(s => ({
          name: staffList.find(st => st.id === s.staffId)?.name || "Sin asignar",
          avg: Number(s._avg.rating || 0).toFixed(1),
          cuts: s._count.id,
        }))
        .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));

      if (ranking.length === 0) {
        return NextResponse.json({
          answer: "Aún no hay suficientes datos de calificaciones por peluquero. Necesitas más cortes calificados para ver el ranking. 📊",
        });
      }

      let response = `🏆 *Ranking de Peluqueros de ${bizName}*\n\n`;
      const medals = ["🥇", "🥈", "🥉"];
      ranking.forEach((s, i) => {
        response += `${medals[i] || `${i + 1}.`} *${s.name}* — ⭐ ${s.avg} (${s.cuts} cortes)\n`;
      });

      response += `\n${ranking[0] ? `¡*${ranking[0].name}* lidera el ranking! 🔥` : ""}`;

      return NextResponse.json({ answer: response });
    }

    // --- "¿Qué clientes dejaron de venir?" / "inactivos" ---
    if (q.includes("dejaron de venir") || q.includes("inactivo") || q.includes("no vuelv") || q.includes("perdid") || q.includes("dejó de") || q.includes("no viene")) {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const inactiveCustomers = await prisma.barberCustomer.findMany({
        where: { userId: user.id, lastVisit: { lt: thirtyDaysAgo } },
        orderBy: { lastVisit: "asc" },
        take: 10,
      });

      if (inactiveCustomers.length === 0) {
        return NextResponse.json({
          answer: "🎉 ¡Excelente! No tienes clientes inactivos. Todos tus clientes han visitado en los últimos 30 días. ¡Sigue así!",
        });
      }

      let response = `⚠️ *Clientes que dejaron de venir (>30 días)*\n\n`;
      inactiveCustomers.forEach((c, i) => {
        const daysSince = Math.floor((now.getTime() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24));
        response += `${i + 1}. ${c.name || "+" + c.whatsapp} — ${daysSince} días sin venir (${c.cutsCount} cortes totales)\n`;
      });

      response += `\nTotal: ${inactiveCustomers.length} clientes inactivos.\n💡 *Tip:* Ve al Dashboard Premium y envía recordatorios masivos con un solo clic.`;

      return NextResponse.json({ answer: response });
    }

    // --- "¿Cuál fue mi mejor día?" ---
    if (q.includes("mejor día") || q.includes("mejor dia") || q.includes("día más") || q.includes("dia mas")) {
      const allCuts = await prisma.barberCut.findMany({
        where: { userId: user.id },
      });

      // Group by date
      const dateCount: Record<string, number> = {};
      allCuts.forEach(c => {
        const dateKey = new Date(c.createdAt).toLocaleDateString("es-ES");
        dateCount[dateKey] = (dateCount[dateKey] || 0) + 1;
      });

      const sorted = Object.entries(dateCount).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) {
        return NextResponse.json({
          answer: "Aún no hay datos de cortes para analizar. ¡Registra algunos cortes primero! ✂️",
        });
      }

      const [bestDate, bestCount] = sorted[0];
      const [worstDate, worstCount] = sorted[sorted.length - 1];

      return NextResponse.json({
        answer: `📅 *Análisis de días de ${bizName}*\n\n🏆 Mejor día: *${bestDate}* con *${bestCount} cortes*\n📉 Día más bajo: *${worstDate}* con *${worstCount} cortes*\n\n📊 Promedio diario: *${(allCuts.length / Object.keys(dateCount).length).toFixed(1)} cortes/día*`,
      });
    }

    // --- "¿Cuántos clientes tengo?" / "clientes" ---
    if (q.includes("cuántos clientes") || q.includes("cuantos clientes") || q.includes("total clientes") || q.includes("base de datos")) {
      const totalCustomers = await prisma.barberCustomer.count({ where: { userId: user.id } });
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeCustomers = await prisma.barberCustomer.count({
        where: { userId: user.id, lastVisit: { gte: thirtyDaysAgo } },
      });

      return NextResponse.json({
        answer: `👥 *Base de clientes de ${bizName}*\n\n📋 Total de clientes: *${totalCustomers}*\n✅ Activos (últimos 30 días): *${activeCustomers}*\n😴 Inactivos: *${totalCustomers - activeCustomers}*\n📊 Tasa de retención: *${totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0}%*`,
      });
    }

    // --- "¿Horas pico?" / "horarios" ---
    if (q.includes("hora") || q.includes("pico") || q.includes("horario") || q.includes("muerta")) {
      const allCuts = await prisma.barberCut.findMany({
        where: { userId: user.id },
      });

      const hourCount: Record<number, number> = {};
      allCuts.forEach(c => {
        const h = new Date(c.createdAt).getHours();
        hourCount[h] = (hourCount[h] || 0) + 1;
      });

      const sorted = Object.entries(hourCount).sort((a, b) => b[1] - a[1]);
      const peakHours = sorted.slice(0, 3);
      const deadHours = sorted.slice(-3).reverse();

      let response = `⏰ *Análisis de Horarios de ${bizName}*\n\n🔥 Horas pico:\n`;
      peakHours.forEach(([h, count]) => {
        response += `  ${h.padStart(2, "0")}:00 — ${count} cortes\n`;
      });
      response += `\n😴 Horas muertas:\n`;
      deadHours.forEach(([h, count]) => {
        response += `  ${h.padStart(2, "0")}:00 — ${count} cortes\n`;
      });
      response += `\n💡 *Tip:* Envía promociones a clientes para las horas muertas y llena esos espacios vacíos.`;

      return NextResponse.json({ answer: response });
    }

    // --- Default / pregunta no reconocida ---
    return NextResponse.json({
      answer: `🤖 No entendí esa pregunta completamente. Puedes preguntarme cosas como:\n\n• "¿Cómo estuvo esta semana?"\n• "¿Quién fue mi mejor peluquero?"\n• "¿Qué clientes dejaron de venir?"\n• "¿Cuál fue mi mejor día?"\n• "¿Cuántos clientes tengo?"\n• "¿Cuáles son mis horas pico?"\n\n¡Intenta con alguna de esas! 💬`,
    });
  } catch (error) {
    console.error("[AI Manager Error]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
