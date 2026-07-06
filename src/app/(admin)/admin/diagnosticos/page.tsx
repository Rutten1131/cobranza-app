"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, showToast, EmptyState } from "@/components/ui";
import { useAuth } from "@/components/providers";

interface ValidationLead {
  id: string;
  name: string;
  businessName: string;
  whatsapp: string;
  email: string;
  city: string;
  score: number;
  answers: Record<string, any>;
  createdAt: string;
}

export default function AdminDiagnosticos() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [leads, setLeads] = useState<ValidationLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"leads" | "analytics">("leads");

  useEffect(() => {
    if (!authLoading && user?.role !== "admin") {
      router.push("/app/dashboard");
      return;
    }
    if (user) {
      fetchLeads();
    }
  }, [user, authLoading, router]);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/validation/leads");
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads);
      } else {
        showToast(data.error || "Error al cargar diagnósticos", "error");
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      showToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  };

  // Análisis estadístico para la pestaña de Analítica
  const getAnalytics = () => {
    if (leads.length === 0) return null;

    const totalLeads = leads.length;
    let totalScore = 0;
    const businessTypes: Record<string, number> = {};
    const painPoints: Record<string, number> = {};
    const methods: Record<string, number> = {};
    const openAnswers: string[] = [];

    leads.forEach((lead) => {
      totalScore += lead.score;
      
      // Respuestas segun las preguntas definidas
      // Q1: Tipo de negocio
      const type = lead.answers["1"] || "No especificado";
      businessTypes[type] = (businessTypes[type] || 0) + 1;

      // Q3: Métodos
      const method = lead.answers["3"] || "No especificado";
      methods[method] = (methods[method] || 0) + 1;

      // Q5: Fricciones (lista de strings)
      const frictions = lead.answers["5"] || [];
      if (Array.isArray(frictions)) {
        frictions.forEach((f: string) => {
          painPoints[f] = (painPoints[f] || 0) + 1;
        });
      }

      // Q8: Frase abierta
      const openText = lead.answers["8"];
      if (openText && openText.trim()) {
        openAnswers.push(openText.trim());
      }
    });

    const avgScore = Math.round(totalScore / totalLeads);

    return {
      totalLeads,
      avgScore,
      businessTypes,
      painPoints,
      methods,
      openAnswers,
    };
  };

  const stats = getAnalytics();

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-bold font-display text-text-main">
              Estudio de Mercado y Leads de Validación
            </h1>
            <p className="text-sm text-text-sub">
              Visualiza las respuestas, dolores reales y métricas del formulario `/diagnostico`.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/admin/dashboard")}>
              Volver a Usuarios
            </Button>
            <Button variant="ghost" onClick={() => logout()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
              activeTab === "leads"
                ? "border-primary text-primary"
                : "border-transparent text-text-sub hover:text-text-main"
            }`}
          >
            Leads Capturados ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
              activeTab === "analytics"
                ? "border-primary text-primary"
                : "border-transparent text-text-sub hover:text-text-main"
            }`}
          >
            Tabulación y Palabras Clave
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-text-sub">Cargando datos...</div>
        ) : leads.length === 0 ? (
          <EmptyState
            title="Aún no hay diagnósticos registrados"
            description="Las respuestas de las campañas se mostrarán aquí una vez que los usuarios comiencen a llenar el test de validación en /diagnostico."
          />
        ) : activeTab === "leads" ? (
          /* LISTA DE LEADS */
          <div className="grid grid-cols-1 gap-4">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-text-main text-lg">{lead.name}</h3>
                    <p className="text-xs text-text-sub">
                      {lead.businessName} • {lead.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(lead.createdAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      lead.score > 60 
                        ? "bg-red-50 text-red-700 border border-red-200" 
                        : lead.score > 30 
                        ? "bg-amber-50 text-amber-700 border border-amber-200" 
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      Score: {lead.score}/100
                    </span>
                  </div>
                </div>

                {/* Contact Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-semibold text-text-sub">WhatsApp: </span>
                    <a 
                      href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, "")}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline font-medium"
                    >
                      {lead.whatsapp} 💬
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold text-text-sub">Email: </span>
                    <span className="text-text-main">{lead.email}</span>
                  </div>
                </div>

                {/* Answers Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-sub uppercase tracking-wider">Respuestas clave:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div>
                      <span className="text-text-muted">Modelo de Negocio:</span>{" "}
                      <span className="font-medium text-text-main">{lead.answers["1"]}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">¿Cómo recuerda cobrar?:</span>{" "}
                      <span className="font-medium text-text-main">{lead.answers["3"]}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Mensajes manuales / semana:</span>{" "}
                      <span className="font-medium text-text-main">{lead.answers["4"]}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Tiempo invertido / semana:</span>{" "}
                      <span className="font-medium text-text-main">{lead.answers["6"]}</span>
                    </div>
                  </div>

                  {lead.answers["5"] && (
                    <div className="text-xs">
                      <span className="text-text-muted block mb-1">Fricciones experimentadas:</span>
                      <div className="flex flex-wrap gap-1">
                        {lead.answers["5"].map((f: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {lead.answers["8"] && (
                    <div className="text-xs bg-blue-50/50 border border-blue-100 rounded-lg p-3 mt-2 text-blue-900">
                      <span className="font-bold block mb-1 text-blue-950">Tarea repetitiva que eliminaría:</span>
                      &ldquo;{lead.answers["8"]}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* PESTAÑA ANALÍTICA */
          stats && (
            <div className="space-y-6">
              {/* General metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-border p-5 rounded-xl text-center shadow-sm">
                  <span className="text-sm font-semibold text-text-sub uppercase tracking-wider block">Leads Registrados</span>
                  <span className="text-4xl font-extrabold text-primary block mt-1">{stats.totalLeads}</span>
                </div>
                <div className="bg-white border border-border p-5 rounded-xl text-center shadow-sm">
                  <span className="text-sm font-semibold text-text-sub uppercase tracking-wider block">Índice Promedio de Riesgo</span>
                  <span className={`text-4xl font-extrabold block mt-1 ${
                    stats.avgScore > 50 ? "text-red-600" : "text-emerald-600"
                  }`}>{stats.avgScore}/100</span>
                </div>
                <div className="bg-white border border-border p-5 rounded-xl text-center shadow-sm">
                  <span className="text-sm font-semibold text-text-sub uppercase tracking-wider block">Clientes dispuestos a probar</span>
                  <span className="text-4xl font-extrabold text-emerald-600 block mt-1">100%</span>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Dolores Principales */}
                <div className="bg-white border border-border p-5 rounded-xl shadow-sm space-y-4">
                  <h3 className="font-bold text-text-main text-base border-b border-border pb-2">
                    Frecuencia de Dolores y Fricciones (Ranking)
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.painPoints)
                      .sort((a, b) => b[1] - a[1])
                      .map(([pain, count]) => {
                        const pct = Math.round((count / stats.totalLeads) * 100);
                        return (
                          <div key={pain} className="space-y-1 text-xs">
                            <div className="flex justify-between text-text-main">
                              <span className="font-medium truncate pr-4">{pain}</span>
                              <span className="font-bold flex-shrink-0">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-red-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Métodos de recordatorio actuales */}
                <div className="bg-white border border-border p-5 rounded-xl shadow-sm space-y-4">
                  <h3 className="font-bold text-text-main text-base border-b border-border pb-2">
                    Método Actual de Seguimiento
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.methods)
                      .sort((a, b) => b[1] - a[1])
                      .map(([method, count]) => {
                        const pct = Math.round((count / stats.totalLeads) * 100);
                        return (
                          <div key={method} className="space-y-1 text-xs">
                            <div className="flex justify-between text-text-main">
                              <span className="font-medium">{method}</span>
                              <span className="font-bold">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

              </div>

              {/* Palabras Clave y Frases del Cliente */}
              <div className="bg-white border border-border p-5 rounded-xl shadow-sm space-y-4">
                <h3 className="font-bold text-text-main text-base border-b border-border pb-2">
                  Dolor expresado en palabras reales del cliente (Marketing Copy)
                </h3>
                <p className="text-xs text-text-sub">
                  Usa estas frases exactas en tus copies publicitarios o correos de venta. Son las palabras que ellos usan para definir su problema:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.openAnswers.map((ans, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs italic text-text-sub relative">
                      <span className="text-slate-300 text-3xl absolute top-0 left-1 leading-none select-none">&ldquo;</span>
                      <p className="pl-4 relative z-10 text-slate-800 font-medium">{ans}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )
        )}
        
      </div>
    </div>
  );
}
