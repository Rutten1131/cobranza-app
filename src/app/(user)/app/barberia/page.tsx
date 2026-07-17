"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/Toast";

interface Customer {
  id: string;
  name: string | null;
  whatsapp: string;
  cutsCount: number;
  lastVisit: string;
  hasReviewed: boolean;
}

interface Staff {
  id: string;
  name: string;
}

interface Cut {
  id: string;
  createdAt: string;
  codeUsed: string;
  rating: number | null;
  customer: {
    name: string | null;
    whatsapp: string;
  };
  staff?: {
    name: string;
  } | null;
}

interface RatingStat {
  staffName: string;
  avgRating: string;
  totalCuts: number;
}

export default function BarberiaDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [activeCode, setActiveCode] = useState<string>("----");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cutsHistory, setCutsHistory] = useState<Cut[]>([]);
  const [stats, setStats] = useState({
    totalCuts: 0,
    totalCustomers: 0,
    newCustomers: 0,
    recurringCustomers: 0,
    staffRatings: [] as RatingStat[],
  });

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // WhatsApp connection state (same as Cobranzas)
  const [whatsappStatus, setWhatsappStatus] = useState<"loading" | "connected" | "disconnected" | "connecting">("loading");
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [whatsappSender, setWhatsappSender] = useState<string>("");

  // Navigation tab: 'dashboard' | 'settings'
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");

  // Barber Settings Form States
  const [barberRequiredCuts, setBarberRequiredCuts] = useState<number>(5);
  const [barberGoogleMapsUrl, setBarberGoogleMapsUrl] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/barberia");
      const data = await res.json();
      if (res.ok) {
        setActiveCode(data.activeCode);
        setStaff(data.staff);
        setCustomers(data.customers);
        setCutsHistory(data.cutsHistory);
        setStats(data.stats);
        setWhatsappSender(data.whatsappSender || "");
        if (data.settings) {
          setBarberRequiredCuts(data.settings.barberRequiredCuts);
          setBarberGoogleMapsUrl(data.settings.barberGoogleMapsUrl || "");
        }
      } else {
        showToast(data.error || "Error al cargar datos del dashboard", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Error de conexión al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      // Validar si el usuario tiene asignado Barberia
      if (!user.hasBarberia) {
        showToast("No tienes asignado este sistema", "error");
        router.push("/app/dashboard");
        return;
      }
      fetchDashboardData();
      fetchWhatsAppStatus();
    }
  }, [user, authLoading, router]);

  // Polling for validation code update and fresh cuts (e.g. every 5 seconds)
  useEffect(() => {
    if (!user || !user.hasBarberia) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // === WhatsApp Connection Functions (replicado de Cobranzas) ===
  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp");
      const data = await res.json();
      if (res.ok) {
        if (data.status === "connected" || data.status === "open") {
          setWhatsappStatus("connected");
          setWhatsappQR(null);
          if (data.whatsappSender) {
            setWhatsappSender(data.whatsappSender);
          }
        } else {
          setWhatsappStatus("disconnected");
          setWhatsappQR(data.qrcode || null);
        }
      } else {
        setWhatsappStatus("disconnected");
      }
    } catch {
      setWhatsappStatus("disconnected");
    }
  };

  const handleWhatsAppDisconnect = async () => {
    try {
      setWhatsappStatus("loading");
      const res = await fetch("/api/whatsapp", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("WhatsApp desconectado", "success");
        setWhatsappStatus("disconnected");
        setWhatsappQR(data.qrcode || null);
      } else {
        fetchWhatsAppStatus();
      }
    } catch {
      fetchWhatsAppStatus();
    }
  };

  // Auto-refresh WhatsApp status when not connected
  useEffect(() => {
    if (user && whatsappStatus !== "connected") {
      const interval = setInterval(() => {
        fetchWhatsAppStatus();
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [user, whatsappStatus]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/barberia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveSettings",
          barberRequiredCuts,
          barberGoogleMapsUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Ajustes guardados correctamente", "success");
        fetchDashboardData();
      } else {
        showToast(data.error || "Error al guardar ajustes", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const downloadQR = async () => {
    try {
      const cleanPhone = whatsappSender.replace(/\+/g, "").replace(/\s/g, "");
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://wa.me/${cleanPhone}?text=${activeCode}`)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr_barberia_caja_${activeCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast("QR descargado con éxito", "success");
    } catch {
      showToast("Error al descargar el código QR", "error");
    }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/barberia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerateCode" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveCode(data.code);
        showToast("Nuevo código generado", "success");
      } else {
        showToast(data.error || "Error al regenerar código", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    setSubmittingStaff(true);
    try {
      const res = await fetch("/api/barberia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addStaff", name: newStaffName }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Estilista agregado exitosamente", "success");
        setNewStaffName("");
        setShowAddStaffModal(false);
        fetchDashboardData();
      } else {
        showToast(data.error || "Error al agregar estilista", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("¿Seguro que deseas eliminar a este barbero?")) return;

    try {
      const res = await fetch(`/api/barberia?staffId=${staffId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Barbero eliminado", "success");
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Error al eliminar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleToggleReviewStatus = async (customerId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/barberia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleReview",
          customerId,
          hasReviewed: !currentStatus,
        }),
      });
      if (res.ok) {
        showToast("Estado de reseña actualizado", "success");
        fetchDashboardData();
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-background-secondary/80 backdrop-blur-md border-b border-glass sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💈</span>
            <span className="text-xl font-display font-bold text-white">
              {user?.businessName || "BarberOS"}
            </span>
            {/* System Switcher */}
            {(Number(user?.hasCobranzas) + Number(user?.hasHabitaciones) + Number(user?.hasBarberia) > 1) && (
              <select
                value="barberia"
                onChange={(e) => {
                  if (e.target.value === "cobranzas") {
                    router.push("/app/dashboard");
                  } else if (e.target.value === "habitaciones") {
                    router.push("/app/habitaciones");
                  }
                }}
                className="ml-2 text-xs font-semibold px-2 py-1 rounded-sm border border-primary/30 bg-primary/5 text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
              >
                {user?.hasCobranzas && <option value="cobranzas">💰 Cobranzas</option>}
                {user?.hasHabitaciones && <option value="habitaciones">🏨 Habitaciones</option>}
                {user?.hasBarberia && <option value="barberia">✂️ Barbería</option>}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "dashboard" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("dashboard")}
            >
              📊 Panel
            </Button>
            <Button
              variant={activeTab === "settings" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("settings")}
            >
              ⚙️ Ajustes
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {activeTab === "dashboard" && (
          <>
            {/* Top: Active Code display & Customer Quick QR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-xs uppercase font-bold text-text-sub tracking-wider">Código de Caja Activo</span>
                <div className="text-5xl font-black font-mono text-amber-500 tracking-widest bg-slate-950 px-6 py-3 rounded-xl border border-amber-500/20">
                  {activeCode}
                </div>
                <p className="text-[10px] text-text-muted">
                  Entrega este código al cliente o indícale que escanee el QR de al lado.
                </p>
                <Button size="sm" disabled={regenerating} onClick={handleRegenerateCode}>
                  {regenerating ? "Regenerando..." : "Regenerar Código"}
                </Button>
              </div>

              {/* Customer QR (Smart Link) */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-xs uppercase font-bold text-text-sub tracking-wider">QR Para Cliente</span>
                {whatsappSender ? (
                  <>
                    <div className="bg-white p-2 rounded-lg border border-slate-700">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://wa.me/${whatsappSender.replace(/\+/g, "").replace(/\s/g, "")}?text=${activeCode}`)}`}
                        alt="QR de escaneo rápido de cliente" 
                        className="w-32 h-32"
                      />
                    </div>
                    <button 
                      onClick={downloadQR}
                      className="text-xs font-bold text-amber-500 hover:text-amber-400 underline"
                    >
                      📥 Descargar QR
                    </button>
                    <p className="text-[10px] text-text-muted mt-1">
                      El cliente lo escanea y envía el mensaje para registrar su visita.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <span className="text-2xl">⚠️</span>
                    <p className="text-xs text-text-muted">
                      Conecta WhatsApp en <strong>Ajustes</strong> para activar el código QR del cliente.
                    </p>
                  </div>
                )}
              </div>

              {/* Stats Summary */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 grid grid-cols-2 gap-4 items-center justify-center">
                <div className="text-center">
                  <span className="text-xl">✂️</span>
                  <p className="text-xl font-bold text-white mt-0.5">{stats.totalCuts}</p>
                  <p className="text-[10px] text-text-sub uppercase font-semibold">Cortes</p>
                </div>
                <div className="text-center">
                  <span className="text-xl">👤</span>
                  <p className="text-xl font-bold text-white mt-0.5">{stats.totalCustomers}</p>
                  <p className="text-[10px] text-text-sub uppercase font-semibold">Clientes</p>
                </div>
                <div className="text-center">
                  <span className="text-xl">✨</span>
                  <p className="text-xl font-bold text-emerald-400 mt-0.5">{stats.newCustomers}</p>
                  <p className="text-[10px] text-text-sub uppercase font-semibold">Nuevos</p>
                </div>
                <div className="text-center">
                  <span className="text-xl">🔄</span>
                  <p className="text-xl font-bold text-primary mt-0.5">{stats.recurringCustomers}</p>
                  <p className="text-[10px] text-text-sub uppercase font-semibold">Recurrentes</p>
                </div>
              </div>
            </div>

            {/* Middle: Staff Ratings & Customer List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Estilistas / Barberos */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-glass pb-3">
                  <h3 className="font-bold text-white text-base">Peluqueros / Staff</h3>
                  <Button size="sm" onClick={() => setShowAddStaffModal(true)}>+ Agregar</Button>
                </div>
                {staff.length === 0 ? (
                  <p className="text-center text-text-muted text-small py-4">No hay personal registrado</p>
                ) : (
                  <div className="space-y-3.5">
                    {staff.map((s) => {
                      const ratingInfo = stats.staffRatings.find(r => r.staffName === s.name);
                      return (
                        <div key={s.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-glass">
                          <div>
                            <p className="font-bold text-white text-sm">{s.name}</p>
                            <p className="text-xs text-text-sub">
                              {ratingInfo ? `${ratingInfo.totalCuts} cortes · ⭐ ${ratingInfo.avgRating}` : "0 cortes · Sin estrellas"}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteStaff(s.id)} className="text-xs text-danger/80 hover:text-danger">
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Clientes Fidelizados */}
              <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 lg:col-span-2 space-y-4">
                <h3 className="font-bold text-white text-base border-b border-glass pb-3">Clientes Registrados</h3>
                {customers.length === 0 ? (
                  <p className="text-center text-text-muted text-small py-8">Aún no hay clientes registrados en el bot</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="text-text-muted border-b border-glass pb-2">
                          <th className="py-2">WhatsApp</th>
                          <th className="py-2">Nombre bot</th>
                          <th className="py-2">Cortes</th>
                          <th className="py-2">Última Visita</th>
                          <th className="py-2">Reseña Google</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass text-white">
                        {customers.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 font-mono">+{c.whatsapp}</td>
                            <td className="py-3">{c.name || "Sin registrar"}</td>
                            <td className="py-3 font-bold">{c.cutsCount}</td>
                            <td className="py-3 text-text-sub">
                              {new Date(c.lastVisit).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handleToggleReviewStatus(c.id, c.hasReviewed)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.hasReviewed 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                                }`}
                              >
                                {c.hasReviewed ? "✓ Dejada" : "Pendiente"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* History: Book diary of cuts */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-glass pb-3">Libro Diario (Historial de Cortes)</h3>
              {cutsHistory.length === 0 ? (
                <p className="text-center text-text-muted text-small py-8">No hay registros de cortes en el historial</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {cutsHistory.map((cut) => (
                    <div key={cut.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-glass text-xs">
                      <div>
                        <span className="text-text-muted">Cliente:</span> <span className="font-bold text-white">{cut.customer.name || `+${cut.customer.whatsapp}`}</span>{" "}
                        <span className="text-text-muted ml-2">Atendió:</span> <span className="font-bold text-white">{cut.staff?.name || "Sin asignar"}</span>
                        <p className="text-[10px] text-text-muted mt-1 font-mono">Código utilizado: {cut.codeUsed}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-500">{cut.rating ? "⭐ ".repeat(cut.rating) : "Sin calificar"}</span>
                        <p className="text-[10px] text-text-muted mt-1">
                          {new Date(cut.createdAt).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Business/Loyalty Rules Settings Form */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-glass pb-2">Configuración del Bot & Fidelización</h3>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase mb-1">
                      Cortes requeridos para Premio Gratis
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={barberRequiredCuts}
                      onChange={(e) => setBarberRequiredCuts(parseInt(e.target.value) || 5)}
                      className="w-full bg-slate-950 border border-glass rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-text-muted mt-1">
                      Cantidad de visitas necesarias para completar la tarjeta de fidelización.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase mb-1">
                      Enlace de Google Reviews (Fidelizar Reputación)
                    </label>
                    <input
                      type="url"
                      value={barberGoogleMapsUrl}
                      onChange={(e) => setBarberGoogleMapsUrl(e.target.value)}
                      placeholder="https://search.google.com/local/writereview?placeid=..."
                      className="w-full bg-slate-950 border border-glass rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-text-muted mt-1">
                      Enlace directo de Google Maps donde los clientes dejarán su calificación.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={savingSettings}>
                    {savingSettings ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </form>
            </div>

            {/* WhatsApp Web Connection */}
            <div className="bg-slate-900/60 border border-glass rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📱</span>
                  <div>
                    <h3 className="font-bold text-white text-lg">WhatsApp Web</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${whatsappStatus === "connected" ? "bg-emerald-500" : whatsappStatus === "loading" ? "bg-amber-500 animate-pulse" : "bg-red-500"}`}></span>
                      <span className="text-xs font-medium text-text-sub capitalize">
                        {whatsappStatus === "loading" ? "Procesando..." : whatsappStatus === "connected" ? "Conectado" : "Desconectado"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {whatsappStatus === "connected" && (
                    <Button variant="danger" size="sm" onClick={handleWhatsAppDisconnect}>
                      Desconectar Cuenta
                    </Button>
                  )}
                  {whatsappStatus !== "connected" && (
                    <Button variant="secondary" size="sm" onClick={fetchWhatsAppStatus} disabled={whatsappStatus === "loading"}>
                      {whatsappStatus === "loading" ? "Generando..." : "🔄 Actualizar QR"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Connected State */}
              {whatsappStatus === "connected" && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400 font-medium flex items-center gap-2">
                    <span>✓</span> Tu cuenta de WhatsApp está vinculada correctamente. El bot de fidelización de barbería funcionará desde tu número.
                  </p>
                </div>
              )}

              {/* Loading State */}
              {whatsappStatus === "loading" && (
                <div className="mt-4 p-8 flex flex-col items-center justify-center border border-dashed border-glass rounded-lg bg-slate-950/40">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs text-text-muted">Por favor, espera un momento...</p>
                </div>
              )}

              {/* Disconnected State with QR Code */}
              {whatsappStatus === "disconnected" && (
                <div className="mt-5 border-t border-glass pt-4">
                  {whatsappQR ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-lg border border-glass">
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-700 mb-3">
                        <img src={whatsappQR} alt="WhatsApp QR Code" className="w-56 h-56 object-contain" />
                      </div>
                      <h4 className="font-semibold text-white text-sm mb-1">Escanea el código QR</h4>
                      <p className="text-xs text-text-muted text-center max-w-md">
                        Abre WhatsApp en tu teléfono, ve a <strong>Dispositivos vinculados</strong> y selecciona <strong>Vincular un dispositivo</strong> para conectar tu cuenta.
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 text-center border border-dashed border-glass rounded-lg bg-slate-950/40">
                      <p className="text-xs text-text-muted mb-3">
                        No se pudo cargar el código QR de conexión de manera automática.
                      </p>
                      <Button variant="primary" size="sm" onClick={fetchWhatsAppStatus}>
                        Generar Código QR
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Add Staff */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowAddStaffModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white text-center">Registrar Nuevo Peluquero</h3>
            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-sub uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Ej. Carlos Barbero"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-white"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submittingStaff}>
                {submittingStaff ? "Guardando..." : "Guardar Peluquero"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
