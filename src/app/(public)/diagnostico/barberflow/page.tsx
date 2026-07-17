"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

export default function BarberflowPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    whatsapp: "",
    email: "",
    city: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.businessName || !formData.whatsapp || !formData.email || !formData.city) {
      showToast("Por favor completa todos los campos", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/validation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          score: 85, // Simula un score de alta idoneidad para barberías
          answers: {
            "1": "Barbería / Estética",
            "3": "Tarjetas físicas / WhatsApp manual",
            "4": "Alta afluencia de visitas",
            "5": ["Falta de retención de clientes", "Tarjetas de fidelidad que se pierden", "No hay base de datos de visitas", "No sé qué barbero fideliza mejor"],
            "8": "Automatizar que vuelvan y conseguir reviews en Google Maps de forma orgánica"
          }
        })
      });

      if (res.ok) {
        setSubmitted(true);
        showToast("¡Registro exitoso! Te contactaremos muy pronto.", "success");
      } else {
        showToast("Hubo un error al registrar tus datos.", "error");
      }
    } catch (error) {
      showToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✂️</span>
            <span className="text-xl font-bold tracking-tight text-white font-mono">
              Barber<span className="text-amber-500 font-extrabold">OS</span>
            </span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-lg shadow-amber-500/10"
          >
            Ser Barbería Piloto
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-semibold animate-pulse">
            <span>✨</span> El futuro de la reputación y fidelización de Barberías
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Tu barbería no necesita más clientes.
            <br />
            Necesita que los que ya tienes <span className="text-amber-500">regresen</span>.
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Elimina las tarjetas físicas de cartón. Mientras tus clientes salen por la puerta, nosotros automatizamos su regreso y los convertimos en reseñas reales en Google Business. **Todo a través de WhatsApp.**
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-base font-bold px-8 py-4 rounded-xl transition-all shadow-xl shadow-amber-500/20 hover:scale-[1.02]"
            >
              Quiero una demostración gratuita
            </button>
            <Link href="/login">
              <span className="inline-flex w-full sm:w-auto items-center justify-center border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 text-white font-medium px-8 py-4 rounded-xl transition-all cursor-pointer">
                Ingresar al panel
              </span>
            </Link>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-900/60">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white mb-12">
            Imagina que cada corte genera automáticamente...
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-amber-500/20 transition-all group">
              <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">✅</span>
              <h3 className="text-lg font-bold text-white mb-2">Un cliente más fiel</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sin descargar apps. El cliente escanea un QR en caja, escribe el código de compra y acumula sus visitas en su cuenta de WhatsApp de forma interactiva.
              </p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-amber-500/20 transition-all group">
              <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">🚀</span>
              <h3 className="text-lg font-bold text-white mb-2">Reseñas orgánicas en Google</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                El sistema detecta clientes felices y los invita a dejar un comentario en Google Business. ¡Tu negocio subirá a los primeros puestos de Google Maps!
              </p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-amber-500/20 transition-all group">
              <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">🧠</span>
              <h3 className="text-lg font-bold text-white mb-2">Datos reales de tu negocio</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Identifica qué peluquero o barbero retiene a más clientes, conoce las horas muertas para lanzar promociones y detecta clientes en riesgo de abandono.
              </p>
            </div>
          </div>
        </section>

        {/* How it works visual */}
        <section className="max-w-4xl mx-auto px-6 py-16 text-center space-y-8 bg-slate-900/20 border border-slate-900 rounded-3xl mb-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            100% por WhatsApp. Sin apps. Sin tarjetas físicas.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm font-medium text-slate-300">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-amber-500 font-bold mb-1">1. Escaneo</div>
              El cliente escanea el QR al pagar
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-amber-500 font-bold mb-1">2. Código de Caja</div>
              Ingresa el código temporal de un solo uso
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-amber-500 font-bold mb-1">3. Calificación</div>
              Selecciona quién lo atendió y califica
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-amber-500 font-bold mb-1">4. Progreso</div>
              Verifica su progreso y el link de Google
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} BarberOS. Todos los derechos reservados.
      </footer>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <div className="text-center">
              <span className="text-3xl">💈</span>
              <h3 className="text-xl font-bold text-white mt-2">Ser Barbería Piloto</h3>
              <p className="text-slate-400 text-xs mt-1">
                Completa tus datos para agendar una demo gratuita e iniciar con el plan piloto de fidelización por WhatsApp.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-6 space-y-2">
                <span className="text-4xl">🎉</span>
                <p className="text-emerald-400 font-bold text-sm">¡Registro recibido exitosamente!</p>
                <p className="text-xs text-slate-400">Te enviaremos un mensaje de WhatsApp en las próximas 24 horas.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tu Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Abel Pérez"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nombre de la Barbería</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Ej. Barbería El Elegante"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">WhatsApp de contacto</label>
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="Ej. +593987654321"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ejemplo@barber.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Ciudad</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ej. Loja"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition-all"
                >
                  {loading ? "Registrando..." : "Registrarme a la lista piloto"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
