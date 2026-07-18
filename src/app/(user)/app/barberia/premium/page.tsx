"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Area, AreaChart,
} from "recharts";

// ============================================================
// TYPES
// ============================================================
interface StarDist { stars: number; count: number }
interface RatingEvo { week: string; avg: number; count: number }
interface StaffRank { name: string; avgRating: string; totalCuts: number }
interface HourData { hour: string; count: number }
interface DayData { day: string; count: number }
interface WeekTrend { week: string; cuts: number }
interface InactiveCustomer {
  id: string; name: string | null; whatsapp: string;
  lastVisit: string; cutsCount: number; daysSinceVisit: number;
}
interface BirthdayCustomer {
  id: string; name: string | null; whatsapp: string;
  birthday: string; daysUntil: number;
}

interface PremiumData {
  reputation: {
    overallAvgRating: string; totalRatings: number;
    starDistribution: StarDist[]; ratingEvolution: RatingEvo[];
    staffRanking: StaffRank[]; googleReviewsCount: number;
    totalReviews: number; customersWithReview: number; totalCustomers: number;
  };
  intelligence: {
    cutsByHour: HourData[]; cutsByDay: DayData[];
    peakHour: string; deadHour: string; bestDay: string;
    weeklyTrend: WeekTrend[]; prediction: number;
    retentionRate: number; totalCuts: number;
  };
  automations: {
    inactiveCustomers: InactiveCustomer[];
    upcomingBirthdays: BirthdayCustomer[];
    lowDemandHours: string[];
  };
}

const COLORS_STARS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];
const CHART_COLORS = {
  primary: "#f59e0b",
  secondary: "#8b5cf6",
  accent: "#06b6d4",
  danger: "#ef4444",
  success: "#22c55e",
  muted: "#64748b",
};

export default function PremiumDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<PremiumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"reputation" | "intelligence" | "automations" | "ai">("reputation");

  // AI Chat
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Sending states
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user && !user.hasBarberiaPremium) {
      showToast("Necesitas el plan Premium para acceder", "error");
      router.push("/app/barberia");
      return;
    }
    if (user) fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/barberia/premium");
      const json = await res.json();
      if (res.ok) setData(json);
      else showToast(json.error || "Error al cargar datos Premium", "error");
    } catch { showToast("Error de conexión", "error"); }
    finally { setLoading(false); }
  };

  const handleAiQuestion = async (question?: string) => {
    const q = question || aiQuestion;
    if (!q.trim()) return;
    setAiMessages(prev => [...prev, { role: "user", text: q }]);
    setAiQuestion("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/barberia/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      setAiMessages(prev => [...prev, { role: "ai", text: json.answer || json.error || "Error al procesar" }]);
    } catch { setAiMessages(prev => [...prev, { role: "ai", text: "Error de conexión" }]); }
    finally { setAiLoading(false); }
  };

  const handleRemindInactive = async (customerId: string) => {
    setSendingReminder(customerId);
    try {
      const res = await fetch("/api/barberia/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remindInactive", customerId }),
      });
      if (res.ok) { showToast("Recordatorio enviado ✅", "success"); fetchData(); }
      else showToast("Error al enviar", "error");
    } catch { showToast("Error de conexión", "error"); }
    finally { setSendingReminder(null); }
  };

  const handleBulkRemind = async () => {
    setSendingBulk(true);
    try {
      const res = await fetch("/api/barberia/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulkRemindInactive" }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Enviados ${json.sent} recordatorios ✅`, "success");
        fetchData();
      } else showToast("Error al enviar", "error");
    } catch { showToast("Error de conexión", "error"); }
    finally { setSendingBulk(false); }
  };

  const handleSendBirthday = async (customerId: string) => {
    setSendingReminder(customerId);
    try {
      const res = await fetch("/api/barberia/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendBirthday", customerId }),
      });
      if (res.ok) showToast("Felicitación enviada 🎂", "success");
      else showToast("Error al enviar", "error");
    } catch { showToast("Error de conexión", "error"); }
    finally { setSendingReminder(null); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-sub text-sm">Cargando Dashboard Premium...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <p className="text-text-sub">No se pudieron cargar los datos.</p>
      </div>
    );
  }

  const { reputation, intelligence, automations } = data;

  const quickQuestions = [
    "¿Cómo estuvo esta semana?",
    "¿Quién fue mi mejor peluquero?",
    "¿Qué clientes dejaron de venir?",
    "¿Cuál fue mi mejor día?",
    "¿Cuántos clientes tengo?",
    "¿Cuáles son mis horas pico?",
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-background-secondary/80 backdrop-blur-md border-b border-glass sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/app/barberia")} className="text-text-sub hover:text-white text-sm">
              ← Volver
            </button>
            <span className="text-lg font-display font-bold text-white">👑 Dashboard Premium</span>
          </div>
        </div>
        {/* Section Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {([
            { key: "reputation", label: "🌟 Reputación", },
            { key: "intelligence", label: "📊 Inteligencia", },
            { key: "automations", label: "🤖 Automatizaciones", },
            { key: "ai", label: "🧠 IA Gerencial", },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeSection === tab.key
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-text-sub hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ============================================================ */}
        {/* SECTION 1: REPUTACIÓN DIGITAL */}
        {/* ============================================================ */}
        {activeSection === "reputation" && (
          <div className="space-y-6">
            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-5 text-center">
                <p className="text-4xl font-black text-amber-400">{reputation.overallAvgRating}</p>
                <p className="text-xs text-text-sub mt-1">⭐ Calificación Promedio</p>
              </div>
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-5 text-center">
                <p className="text-4xl font-black text-white">{reputation.totalRatings}</p>
                <p className="text-xs text-text-sub mt-1">📝 Total Calificaciones</p>
              </div>
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-5 text-center">
                <p className="text-4xl font-black text-emerald-400">{reputation.googleReviewsCount}</p>
                <p className="text-xs text-text-sub mt-1">🌐 Reseñas Google</p>
              </div>
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-5 text-center">
                <p className="text-4xl font-black text-purple-400">
                  {reputation.totalCustomers > 0
                    ? Math.round((reputation.customersWithReview / reputation.totalCustomers) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-text-sub mt-1">📊 Tasa de Reseña</p>
              </div>
            </div>

            {/* Rating Evolution Chart */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-4">📈 Evolución de Calificación (12 semanas)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reputation.ratingEvolution}>
                    <defs>
                      <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis domain={[0, 5]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "#f59e0b" }}
                    />
                    <Area type="monotone" dataKey="avg" stroke={CHART_COLORS.primary} fill="url(#ratingGradient)" strokeWidth={2} name="Promedio" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Star Distribution + Staff Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Star Distribution Pie */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6">
                <h3 className="font-bold text-white text-base mb-4">⭐ Distribución de Estrellas</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reputation.starDistribution}
                        dataKey="count"
                        nameKey="stars"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        label={({ name, value }) => value > 0 ? `${name}⭐ (${value})` : ""}
                        labelLine={false}
                      >
                        {reputation.starDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS_STARS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Staff Ranking */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6">
                <h3 className="font-bold text-white text-base mb-4">🏆 Ranking de Peluqueros</h3>
                {reputation.staffRanking.length === 0 ? (
                  <p className="text-text-muted text-sm text-center py-8">Sin datos de calificaciones por peluquero aún</p>
                ) : (
                  <div className="space-y-3">
                    {reputation.staffRanking.map((s, i) => {
                      const medals = ["🥇", "🥈", "🥉"];
                      const barWidth = Math.max(10, (parseFloat(s.avgRating) / 5) * 100);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-white">{medals[i] || `${i+1}.`} {s.name}</span>
                            <span className="text-xs text-amber-400 font-bold">⭐ {s.avgRating} ({s.totalCuts})</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${CHART_COLORS.primary}, ${CHART_COLORS.secondary})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 2: INTELIGENCIA COMERCIAL */}
        {/* ============================================================ */}
        {activeSection === "intelligence" && (
          <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-amber-400">{intelligence.totalCuts}</p>
                <p className="text-[10px] text-text-sub uppercase font-bold">Total Cortes</p>
              </div>
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-emerald-400">{intelligence.retentionRate}%</p>
                <p className="text-[10px] text-text-sub uppercase font-bold">Retención</p>
              </div>
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-cyan-400">{intelligence.peakHour}</p>
                <p className="text-[10px] text-text-sub uppercase font-bold">🔥 Hora Pico</p>
              </div>
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-red-400">{intelligence.deadHour}</p>
                <p className="text-[10px] text-text-sub uppercase font-bold">😴 Hora Muerta</p>
              </div>
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-purple-400">~{intelligence.prediction}</p>
                <p className="text-[10px] text-text-sub uppercase font-bold">📈 Pred. Semanal</p>
              </div>
            </div>

            {/* Cuts by Hour */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-4">⏰ Cortes por Hora del Día</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intelligence.cutsByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" name="Cortes" radius={[4, 4, 0, 0]}>
                      {intelligence.cutsByHour.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.hour === intelligence.peakHour ? CHART_COLORS.primary : entry.hour === intelligence.deadHour ? CHART_COLORS.danger : CHART_COLORS.accent}
                          fillOpacity={entry.count === 0 ? 0.2 : 0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cuts by Day + Weekly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cuts by Day of Week */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6">
                <h3 className="font-bold text-white text-base mb-4">📅 Cortes por Día de la Semana</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={intelligence.cutsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="count" name="Cortes" fill={CHART_COLORS.secondary} radius={[6, 6, 0, 0]}>
                        {intelligence.cutsByDay.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.day === intelligence.bestDay ? CHART_COLORS.primary : CHART_COLORS.secondary}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Trend */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6">
                <h3 className="font-bold text-white text-base mb-4">📈 Tendencia Semanal (8 semanas)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={intelligence.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="cuts"
                        stroke={CHART_COLORS.success}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.success, r: 4 }}
                        name="Cortes"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 3: AUTOMATIZACIONES */}
        {/* ============================================================ */}
        {activeSection === "automations" && (
          <div className="space-y-6">
            {/* Inactive Customers */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-glass pb-3">
                <h3 className="font-bold text-white text-base">😴 Clientes Inactivos (+30 días)</h3>
                <Button
                  size="sm"
                  disabled={sendingBulk || automations.inactiveCustomers.length === 0}
                  onClick={handleBulkRemind}
                >
                  {sendingBulk ? "Enviando..." : `📨 Enviar a todos (${automations.inactiveCustomers.length})`}
                </Button>
              </div>
              {automations.inactiveCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl">🎉</span>
                  <p className="text-text-muted text-sm mt-2">¡Todos tus clientes están activos! No hay inactivos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {automations.inactiveCustomers.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-glass">
                      <div>
                        <p className="font-bold text-white text-sm">{c.name || `+${c.whatsapp}`}</p>
                        <p className="text-[10px] text-text-muted">
                          {c.daysSinceVisit} días sin venir · {c.cutsCount} cortes totales · Última: {new Date(c.lastVisit).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemindInactive(c.id)}
                        disabled={sendingReminder === c.id}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 disabled:text-slate-600 px-2 py-1 rounded border border-amber-500/20 hover:bg-amber-500/10 transition-all"
                      >
                        {sendingReminder === c.id ? "..." : "📨 Recordar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Birthdays */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-glass pb-3">🎂 Cumpleaños Próximos (7 días)</h3>
              {automations.upcomingBirthdays.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-6">No hay cumpleaños próximos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {automations.upcomingBirthdays.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-glass">
                      <div>
                        <p className="font-bold text-white text-sm">{c.name || `+${c.whatsapp}`}</p>
                        <p className="text-[10px] text-text-muted">
                          {c.daysUntil === 0 ? "🎉 ¡HOY!" : `En ${c.daysUntil} días`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSendBirthday(c.id)}
                        disabled={sendingReminder === c.id}
                        className="text-xs font-bold text-pink-400 hover:text-pink-300 disabled:text-slate-600 px-2 py-1 rounded border border-pink-500/20 hover:bg-pink-500/10 transition-all"
                      >
                        {sendingReminder === c.id ? "..." : "🎂 Felicitar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Demand Hours */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-glass pb-3">📉 Horas de Baja Demanda</h3>
              {automations.lowDemandHours.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-6">No se detectaron horas de baja demanda significativas.</p>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {automations.lowDemandHours.map(h => (
                      <span key={h} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold">
                        🕐 {h}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted">
                    💡 Estas horas tienen menos del 50% del tráfico promedio. Envía promociones especiales para llenar estos espacios.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 4: IA GERENCIAL */}
        {/* ============================================================ */}
        {activeSection === "ai" && (
          <div className="space-y-6">
            {/* Quick Questions */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-3">💬 Preguntas Rápidas</h3>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleAiQuestion(q)}
                    disabled={aiLoading}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-glass pb-3">🧠 Chat con IA Gerencial</h3>

              {/* Messages */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {aiMessages.length === 0 && (
                  <div className="text-center py-8">
                    <span className="text-4xl">🤖</span>
                    <p className="text-text-muted text-sm mt-2">Hazme una pregunta sobre tu negocio</p>
                    <p className="text-[10px] text-text-muted mt-1">Uso datos reales de tu barbería para responderte</p>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-amber-500/20 text-amber-100 rounded-tr-sm"
                        : "bg-slate-800 text-white rounded-tl-sm border border-glass"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 border border-glass p-3 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleAiQuestion(); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  disabled={aiLoading}
                  className="flex-1 bg-slate-950 border border-glass rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600 disabled:opacity-50"
                />
                <Button type="submit" disabled={aiLoading || !aiQuestion.trim()}>
                  Enviar
                </Button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
