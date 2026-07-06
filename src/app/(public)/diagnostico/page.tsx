"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

// Definición de las preguntas del diagnóstico interactivo
interface Option {
  text: string;
  weight: number; // Peso para calcular el riesgo (a mayor peso, menor eficiencia/mayor riesgo)
}

interface Question {
  id: number;
  question: string;
  type: "radio" | "checkbox" | "text";
  category: string;
  options?: Option[];
  placeholder?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "¿Cuál describe mejor tu modelo de negocio?",
    type: "radio",
    category: "identity",
    options: [
      { text: "Vendo productos físicos", weight: 10 },
      { text: "Ofrezco servicios profesionales", weight: 10 },
      { text: "Vendo tanto productos como servicios", weight: 10 },
      { text: "Otro tipo de negocio", weight: 5 }
    ]
  },
  {
    id: 2,
    question: "¿Cuántas personas trabajan directamente contigo?",
    type: "radio",
    category: "identity",
    options: [
      { text: "Solo yo", weight: 15 },
      { text: "De 2 a 5 personas", weight: 10 },
      { text: "De 6 a 15 personas", weight: 5 },
      { text: "Más de 15 personas", weight: 2 }
    ]
  },
  {
    id: 3,
    question: "Cuando un cliente se atrasa o queda debiendo, ¿cómo lo recuerdas para hacer el seguimiento?",
    type: "radio",
    category: "habits",
    options: [
      { text: "Confío en mi memoria", weight: 40 },
      { text: "Lo anoto en una libreta o papel", weight: 35 },
      { text: "Lo controlo en un archivo de Excel", weight: 25 },
      { text: "Dejo los chats de WhatsApp marcados como no leídos", weight: 30 },
      { text: "Uso un software o sistema de gestión específico", weight: 5 }
    ]
  },
  {
    id: 4,
    question: "¿Cuántas veces por semana tienes que enviar o escribir manualmente un recordatorio de cobro o aviso?",
    type: "radio",
    category: "frequency",
    options: [
      { text: "Rara vez (menos de 3 veces)", weight: 5 },
      { text: "Moderado (entre 3 y 10 veces)", weight: 15 },
      { text: "Frecuente (entre 10 y 30 veces)", weight: 30 },
      { text: "Muy alto (más de 30 veces a la semana)", weight: 45 }
    ]
  },
  {
    id: 5,
    question: "¿Cuál de las siguientes fricciones has vivido en el último mes? (Selecciona todas las que apliquen)",
    type: "checkbox",
    category: "friction",
    options: [
      { text: "Un cliente me dijo que 'no sabía' que tenía que pagar o que se le había olvidado.", weight: 15 },
      { text: "Olvidé cobrarle a un cliente en la fecha acordada.", weight: 20 },
      { text: "Pasé demasiado tiempo buscando chats antiguos de WhatsApp para ver qué acordamos.", weight: 15 },
      { text: "Escribí exactamente el mismo mensaje de cobro una y otra vez para distintos clientes.", weight: 10 },
      { text: "No sé con certeza a quiénes les he enviado recordatorio y a quiénes no.", weight: 15 },
      { text: "Tuve llamadas incómodas por no enviar un aviso preventivo por WhatsApp.", weight: 10 }
    ]
  },
  {
    id: 6,
    question: "¿Cuánto tiempo estimas que dedicas tú o tu equipo semanalmente a enviar recordatorios de pago o de tareas pendientes?",
    type: "radio",
    category: "cost",
    options: [
      { text: "Menos de 1 hora", weight: 5 },
      { text: "Entre 1 y 3 horas", weight: 15 },
      { text: "Entre 3 y 6 horas", weight: 30 },
      { text: "Más de 6 horas a la semana", weight: 45 }
    ]
  },
  {
    id: 7,
    question: "¿Quién se encarga principalmente de esta labor de cobro y recordatorios manuales?",
    type: "radio",
    category: "cost",
    options: [
      { text: "Yo mismo (el dueño/fundador)", weight: 25 },
      { text: "Un vendedor o personal de atención", weight: 15 },
      { text: "Un administrador o secretaria", weight: 10 },
      { text: "No tenemos a nadie asignado formalmente", weight: 20 }
    ]
  },
  {
    id: 8,
    question: "Si pudieras eliminar una sola tarea repetitiva en la comunicación con tus clientes para ahorrar tiempo, ¿cuál sería? Escríbela con tus palabras:",
    type: "text",
    category: "dream",
    placeholder: "Ej: Estar persiguiendo a la gente para que pague, mandar mensajes todos los lunes, etc."
  }
];

export default function DiagnosticoPage() {
  const [currentStep, setCurrentStep] = useState<number>(-1); // -1: Intro, 0-7: Preguntas, 8: Diagnóstico / Formulario
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Datos del formulario de contacto
  const [leadData, setLeadData] = useState({
    name: "",
    businessName: "",
    whatsapp: "",
    email: "",
    city: ""
  });

  const [formError, setFormError] = useState("");

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Llegó al final de las preguntas, muestra el pre-resultado y formulario de registro
      setCurrentStep(QUESTIONS.length);
    }
  };

  const handleBack = () => {
    if (currentStep > -1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const selectRadio = (questionId: number, optionText: string) => {
    setAnswers({ ...answers, [questionId]: optionText });
    // Pequeño delay para pasar de forma natural a la siguiente pregunta
    setTimeout(() => {
      if (currentStep < QUESTIONS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setCurrentStep(QUESTIONS.length);
      }
    }, 300);
  };

  const toggleCheckbox = (questionId: number, optionText: string) => {
    const currentSelection: string[] = answers[questionId] || [];
    let newSelection: string[];
    if (currentSelection.includes(optionText)) {
      newSelection = currentSelection.filter(t => t !== optionText);
    } else {
      newSelection = [...currentSelection, optionText];
    }
    setAnswers({ ...answers, [questionId]: newSelection });
  };

  const handleTextChange = (questionId: number, text: string) => {
    setAnswers({ ...answers, [questionId]: text });
  };

  // Cálculo del score de ineficiencia / necesidad de automatización (0 a 100)
  const calculateScore = () => {
    let scoreTotal = 0;
    let maxPossible = 0;

    QUESTIONS.forEach((q) => {
      if (q.type === "radio" && q.options) {
        // Encontrar el peso máximo posible para esta pregunta
        const maxWeight = Math.max(...q.options.map(o => o.weight));
        maxPossible += maxWeight;

        // Sumar el peso de la opción elegida
        const chosen = answers[q.id];
        const option = q.options.find(o => o.text === chosen);
        if (option) {
          scoreTotal += option.weight;
        }
      } else if (q.type === "checkbox" && q.options) {
        // Sumar todos los checkboxes de esta pregunta
        const maxWeight = q.options.reduce((acc, o) => acc + o.weight, 0);
        maxPossible += maxWeight;

        const chosenList: string[] = answers[q.id] || [];
        chosenList.forEach((chosen) => {
          const option = q.options?.find(o => o.text === chosen);
          if (option) {
            scoreTotal += option.weight;
          }
        });
      }
    });

    if (maxPossible === 0) return 0;
    const finalScore = Math.round((scoreTotal / maxPossible) * 100);
    return Math.min(finalScore, 100);
  };

  const score = calculateScore();

  // Deducción de riesgos basados en respuestas
  const getDeducciones = () => {
    const deducciones = [];
    
    // Q3: Hábitos
    const habitAnswer = answers[3];
    if (habitAnswer === "Confío en mi memoria") {
      deducciones.push("Dependencia total en la memoria humana: Riesgo muy alto de omitir cobros clave.");
    } else if (habitAnswer === "Lo anoto en una libreta o papel") {
      deducciones.push("Proceso físico vulnerable: Si la libreta se extravía o no está a la mano, la cobranza se detiene.");
    } else if (habitAnswer === "Dejo los chats de WhatsApp marcados como no leídos") {
      deducciones.push("Gestión de WhatsApp saturada: Tus mensajes importantes se pierden fácilmente bajo nuevos chats.");
    } else if (habitAnswer === "Lo controlo en un archivo de Excel") {
      deducciones.push("Excel pasivo: Requiere actualización manual constante y no envía recordatorios automáticos.");
    }

    // Q5: Fricciones
    const frictionAnswers: string[] = answers[5] || [];
    if (frictionAnswers.includes("Un cliente me dijo que 'no sabía' que tenía que pagar o que se le había olvidado.")) {
      deducciones.push("Falta de notificaciones preventivas automáticas, lo que da excusas a los clientes para retrasarse.");
    }
    if (frictionAnswers.includes("Olvidé cobrarle a un cliente en la fecha acordada.")) {
      deducciones.push("Pérdida directa de flujo de caja debido a la falta de alertas centralizadas.");
    }
    if (frictionAnswers.includes("Escribí exactamente el mismo mensaje de cobro una y otra vez para distintos clientes.")) {
      deducciones.push("Fuga de tiempo operativo por redacción y copiado manual de plantillas repetitivas.");
    }

    // Q6: Costo de tiempo
    const timeAnswer = answers[6];
    if (timeAnswer === "Más de 6 horas a la semana" || timeAnswer === "Entre 3 y 6 horas") {
      deducciones.push("Alto costo de tiempo operativo dedicado a tareas rutinarias que una máquina puede hacer por ti.");
    }

    if (deducciones.length === 0) {
      deducciones.push("Tu proceso actual tiene oportunidades de mejora en la estandarización y rapidez.");
      deducciones.push("Optimizar el tiempo de redacción de WhatsApp liberaría horas valiosas a la semana.");
    }

    return deducciones;
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!leadData.name || !leadData.businessName || !leadData.whatsapp || !leadData.email || !leadData.city) {
      setFormError("Por favor completa todos los campos del formulario.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/validation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadData,
          answers,
          score
        })
      });

      if (!response.ok) {
        throw new Error("Error al enviar el formulario.");
      }

      setSubmitted(true);
      setShowResults(true);
    } catch (err: any) {
      setFormError(err.message || "Hubo un error al registrar tus datos. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              ActivaQR • Diagnóstico
            </span>
          </div>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl transition-all duration-300">
          
          {/* STEP -1: INTRODUCCION */}
          {currentStep === -1 && (
            <div className="space-y-6 text-center py-6 animate-fade-up">
              <div className="inline-flex p-3 bg-blue-900/30 border border-blue-500/30 rounded-2xl text-3xl mb-2 text-blue-400">
                📊
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                ¿Qué tan eficiente es tu seguimiento de cobranza y clientes?
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-lg mx-auto">
                Realiza este diagnóstico interactivo de 3 minutos. Descubre tu índice de eficiencia operativa y los riesgos invisibles que te hacen perder tiempo y dinero todos los meses.
              </p>
              <div className="pt-4">
                <Button 
                  onClick={() => setCurrentStep(0)} 
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/20 border border-blue-500/20 transform hover:-translate-y-0.5 transition-all"
                >
                  Comenzar Diagnóstico Gratis →
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Únete a más de 120 negocios que buscan optimizar su flujo por WhatsApp.
              </p>
            </div>
          )}

          {/* STEPS 0 to 7: PREGUNTAS */}
          {currentStep >= 0 && currentStep < QUESTIONS.length && (
            <div className="space-y-6 animate-fade-up">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progreso: {Math.round(((currentStep) / QUESTIONS.length) * 100)}%</span>
                  <span>Pregunta {currentStep + 1} de {QUESTIONS.length}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                {QUESTIONS[currentStep].question}
              </h2>

              {/* Input Types */}
              <div className="space-y-3 pt-2">
                {QUESTIONS[currentStep].type === "radio" && QUESTIONS[currentStep].options?.map((option, idx) => {
                  const isSelected = answers[QUESTIONS[currentStep].id] === option.text;
                  return (
                    <button
                      key={idx}
                      onClick={() => selectRadio(QUESTIONS[currentStep].id, option.text)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                        isSelected 
                          ? "bg-blue-950/40 border-blue-500 text-white font-medium shadow-md shadow-blue-950/50" 
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40"
                      }`}
                    >
                      <span>{option.text}</span>
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-500 bg-blue-500" : "border-slate-700"}`}>
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })}

                {QUESTIONS[currentStep].type === "checkbox" && QUESTIONS[currentStep].options?.map((option, idx) => {
                  const selectedList = answers[QUESTIONS[currentStep].id] || [];
                  const isSelected = selectedList.includes(option.text);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleCheckbox(QUESTIONS[currentStep].id, option.text)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                        isSelected 
                          ? "bg-blue-950/40 border-blue-500 text-white font-medium" 
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40"
                      }`}
                    >
                      <span className="flex-1 pr-2">{option.text}</span>
                      <span className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-700"}`}>
                        {isSelected && "✓"}
                      </span>
                    </button>
                  );
                })}

                {QUESTIONS[currentStep].type === "text" && (
                  <div className="space-y-4">
                    <textarea
                      value={answers[QUESTIONS[currentStep].id] || ""}
                      onChange={(e) => handleTextChange(QUESTIONS[currentStep].id, e.target.value)}
                      placeholder={QUESTIONS[currentStep].placeholder}
                      className="w-full min-h-[120px] bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-800/60">
                <button
                  onClick={handleBack}
                  className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 py-2 px-3 rounded-lg hover:bg-slate-800/30"
                >
                  ← Atrás
                </button>

                {/* Show Next button only for checkbox or text type, or if they need to advance without radio */}
                {(QUESTIONS[currentStep].type === "checkbox" || QUESTIONS[currentStep].type === "text") && (
                  <Button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl border border-blue-500/20 font-medium"
                  >
                    Siguiente →
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* STEP 8: PRE-RESULTADO & LISTA DE ESPERA FORM */}
          {currentStep === QUESTIONS.length && !showResults && (
            <div className="space-y-6 animate-fade-up">
              <div className="text-center space-y-3">
                <div className="inline-flex p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-3xl text-emerald-400 mb-2">
                  🎉
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  ¡Diagnóstico Calculado Correctamente!
                </h2>
                <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto">
                  Hemos procesado tus respuestas. Para ver tu score de automatización y obtener acceso prioritario a la solución de WhatsApp automatizada, ingresa tus datos.
                </p>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tu Nombre</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={leadData.name}
                      onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre del Negocio</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Ferretería El Clavo"
                      value={leadData.businessName}
                      onChange={(e) => setLeadData({ ...leadData, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">WhatsApp de contacto</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. +593 987654321"
                      value={leadData.whatsapp}
                      onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="Ej. juan@correo.com"
                      value={leadData.email}
                      onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ciudad / Ubicación</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Quito, Ecuador"
                    value={leadData.city}
                    onChange={(e) => setLeadData({ ...leadData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  />
                </div>

                {formError && (
                  <p className="text-sm text-red-400 bg-red-950/30 border border-red-500/20 p-3 rounded-lg">
                    ⚠️ {formError}
                  </p>
                )}

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors py-3 px-4 rounded-xl hover:bg-slate-800/30 text-center order-2 sm:order-1"
                  >
                    ← Modificar respuestas
                  </button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/10 border border-emerald-500/20 transform hover:-translate-y-0.5 transition-all text-center order-1 sm:order-2"
                  >
                    {loading ? "Procesando..." : "Descubrir mi Diagnóstico y Unirme →"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* DIAGNÓSTICO FINAL (RESULTADO DE LA EVALUACIÓN) */}
          {showResults && (
            <div className="space-y-8 animate-fade-up">
              <div className="text-center space-y-2">
                <span className="inline-flex px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-400 tracking-wider uppercase">
                  Diagnóstico Personalizado
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Índice de Automatización Comercial
                </h2>
              </div>

              {/* Medidor visual */}
              <div className="bg-slate-950/80 border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  {/* SVG Circle progress */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="#1e293b" 
                      strokeWidth="8" 
                      fill="transparent" 
                    />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke={score > 60 ? "#ef4444" : score > 30 ? "#f59e0b" : "#10b981"} 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * score) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-4xl font-extrabold text-white">{score}</span>
                    <span className="text-slate-500 text-sm block">/ 100</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-white">
                    {score > 60 
                      ? "Nivel Crítico: Dependencia Manual" 
                      : score > 30 
                      ? "Nivel Medio: Proceso Semi-Estructurado" 
                      : "Nivel Óptimo: Alta Automatización"}
                  </h3>
                  <p className="text-slate-400 text-sm max-w-sm">
                    {score > 60 
                      ? "Tu negocio depende críticamente de procesos manuales o de tu memoria. Riesgo inminente de olvidar cobranzas."
                      : score > 30
                      ? "Usa herramientas básicas pero careces de automatización activa. Estás perdiendo tiempo valioso cada semana."
                      : "Tu flujo operativo es ordenado, sin embargo quedan puntos clave por pulir para eliminar el trabajo repetitivo."}
                  </p>
                </div>
              </div>

              {/* Resumen de riesgos */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  ⚠️ Puntos de Fuga Detectados:
                </h4>
                <ul className="space-y-2.5">
                  {getDeducciones().map((risk, index) => (
                    <li key={index} className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3">
                      <span className="text-red-400 mt-0.5">✕</span>
                      <span className="text-sm text-slate-300">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Explicación de la solución (Anzuelo) */}
              <div className="bg-gradient-to-r from-blue-950/40 to-slate-900/40 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                  <span>💡</span> ¿Cómo solucionamos esto con ActivaQR?
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Estamos desarrollando un motor que vincula tu propio WhatsApp comercial para enviar recordatorios personalizados de cobro y avisos recurrentes a tus clientes. <strong>Sin usar números ajenos</strong> y <strong>sin tareas de copiado y pegado manual</strong>.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs bg-slate-800 text-slate-300 py-1 px-2.5 rounded-full border border-slate-700">✓ Envío desde tu propio WhatsApp</span>
                  <span className="text-xs bg-slate-800 text-slate-300 py-1 px-2.5 rounded-full border border-slate-700">✓ Recordatorios Inteligentes</span>
                  <span className="text-xs bg-slate-800 text-slate-300 py-1 px-2.5 rounded-full border border-slate-700">✓ Reportes de control en tiempo real</span>
                </div>
              </div>

              {/* Registro exitoso footer */}
              <div className="text-center border-t border-slate-800/60 pt-6 space-y-2">
                <p className="text-emerald-400 font-medium text-sm flex items-center justify-center gap-1">
                  <span>✓</span> ¡Estás oficialmente en la Lista de Espera Comercial!
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Te contactaremos al número <strong>{leadData.whatsapp}</strong> o al correo <strong>{leadData.email}</strong> antes de lanzar la prueba beta privada con beneficios especiales.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ActivaQR. Todos los derechos reservados.
      </footer>
    </div>
  );
}
