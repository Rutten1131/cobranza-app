"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "./barberos.css";

export default function BarberosLanding() {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const fixedCtaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // === Custom Cursor ===
    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top = mouseY + "px";
    };
    document.addEventListener("mousemove", onMouseMove);

    const ringLoop = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      if (ring) {
        ring.style.left = ringX + "px";
        ring.style.top = ringY + "px";
      }
      requestAnimationFrame(ringLoop);
    };
    ringLoop();

    // Hover interactions for cursor
    const hoverEls = document.querySelectorAll("a, button, [data-cursor='hover']");
    hoverEls.forEach((el) => {
      el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
    });

    // === Scroll Reveal ===
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => revealObserver.observe(el));

    // === Fixed CTA visibility ===
    const fixedCta = fixedCtaRef.current;
    const onScroll = () => {
      if (fixedCta) {
        if (window.scrollY > window.innerHeight) {
          fixedCta.classList.add("show");
        } else {
          fixedCta.classList.remove("show");
        }
      }

      // Cross-fade quotes on scroll based on position relative to viewport center
      const trigger = document.getElementById("sticky-quotes-trigger");
      const card1 = document.getElementById("quote-card-1");
      const card2 = document.getElementById("quote-card-2");
      if (trigger && card1 && card2) {
        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Simple direct calculation: transition happens precisely when the center of the trigger crosses the center of the viewport.
        const totalHeight = rect.height - viewportHeight;
        const scrolled = -rect.top;
        let progress = scrolled / totalHeight;
        progress = Math.max(0, Math.min(1, progress));

        // Tighter transition bounds triggered earlier:
        // From 0% to 30%: Quote 1 fully visible
        // From 30% to 40%: Smooth cross-fade transition
        // From 40% to 100%: Quote 2 fully visible
        if (progress < 0.30) {
          card1.style.opacity = "1";
          card1.style.transform = "translateY(0) scale(1)";
          card1.style.pointerEvents = "auto";
          card2.style.opacity = "0";
          card2.style.transform = "translateY(32px) scale(0.97)";
          card2.style.pointerEvents = "none";
        } else if (progress > 0.40) {
          card1.style.opacity = "0";
          card1.style.transform = "translateY(-32px) scale(0.97)";
          card1.style.pointerEvents = "none";
          card2.style.opacity = "1";
          card2.style.transform = "translateY(0) scale(1)";
          card2.style.pointerEvents = "auto";
        } else {
          // Linear interpolation between the transition bounds (0.30 to 0.40)
          const range = 0.10; // 0.40 - 0.30
          const midProgress = (progress - 0.30) / range;
          
          card1.style.opacity = String(1 - midProgress);
          card1.style.transform = `translateY(${-32 * midProgress}px) scale(${1 - 0.03 * midProgress})`;
          card1.style.pointerEvents = "none";
          card2.style.opacity = String(midProgress);
          card2.style.transform = `translateY(${32 * (1 - midProgress)}px) scale(${0.97 + 0.03 * midProgress})`;
          card2.style.pointerEvents = "none";
        }
      }
    };
    window.addEventListener("scroll", onScroll);
    onScroll(); // Run immediately to avoid initial uninitialized state

    // === Smooth scroll for anchor links ===
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = (a as HTMLAnchorElement).getAttribute("href");
        if (!href) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      revealObserver.disconnect();
    };
  }, []);

  return (
    <div className="barber-landing" style={{ cursor: "none" }}>
      {/* Custom Cursor */}
      <div className="cursor-dot" ref={cursorDotRef} />
      <div className="cursor-ring" ref={cursorRingRef} />

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between mix-blend-difference">
        <a href="#" className="flex items-center gap-2 text-white">
          <div className="w-7 h-7 border border-white/80 flex items-center justify-center">
            <span className="font-display text-sm font-bold">B</span>
          </div>
          <span className="font-mono text-xs tracking-[0.25em] uppercase">BarberOS</span>
        </a>
        <nav className="hidden md:flex items-center gap-10 text-xs font-mono tracking-[0.2em] uppercase text-white/80">
          <a href="#problema" className="hover:text-white transition">El problema</a>
          <a href="#como" className="hover:text-white transition">Cómo funciona</a>
          <a href="#por-que" className="hover:text-white transition">Por qué funciona</a>
          <a href="#fundadores" className="hover:text-white transition">Fundadores</a>
        </nav>
        <a
          href="https://wa.me/593963410409?text=Hola%20quiero%20reservar%20mi%20plaza%20en%20BarberOS"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono tracking-[0.2em] uppercase text-white border border-white/40 px-4 py-2 hover:bg-white hover:text-black transition"
        >
          Reservar plaza
        </a>
      </header>

      {/* ============ 00 — HERO ============ */}
      <section className="relative h-screen w-full overflow-hidden letterbox" id="hero">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=85&w=2400&auto=format&fit=crop"
            alt="Barbería"
            className="w-full h-full object-cover kenburns"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />
        </div>

        <div className="absolute top-20 left-6 md:top-24 md:left-12 z-10 flex items-center gap-3 text-white/70 text-[10px] font-mono tracking-[0.25em]">
          <span className="w-2 h-2 bg-red-500 rec-dot rounded-full" />
          <span>REC · 24FPS · ESC 01</span>
        </div>

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center text-white">
          <p className="hero-in font-mono text-[11px] tracking-[0.4em] uppercase text-white/70 mb-8" style={{ animationDelay: ".2s" }}>
            Una historia sobre barberías
          </p>

          <h1 className="hero-in font-display font-light text-[clamp(2.5rem,7vw,7rem)] leading-[0.95] max-w-5xl text-balance" style={{ animationDelay: ".5s" }}>
            Tu barbería no necesita
            <span className="block italic font-normal text-[#ec8a52]">más clientes.</span>
          </h1>

          <p className="hero-in mt-10 max-w-xl text-base md:text-lg text-white/80 leading-relaxed font-light" style={{ animationDelay: "1.2s" }}>
            Necesita que los que ya confían en ti vuelvan una y otra vez. Mientras tú haces el siguiente corte, BarberOS trabaja para que el anterior regrese.
          </p>

          <div className="hero-in mt-12 flex flex-col sm:flex-row items-center gap-4" style={{ animationDelay: "1.8s" }}>
            <a
              href="https://wa.me/593963410409?text=Hola%20quiero%20ver%20como%20funciona%20BarberOS"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary-landing px-8 py-4 text-sm font-mono tracking-[0.15em] uppercase flex items-center gap-3"
            >
              <span>Quiero ver cómo funciona</span>
              <i className="fa-solid fa-arrow-right text-xs" />
            </a>
            <a href="#video-founder" className="btn-ghost-landing px-8 py-4 text-sm font-mono tracking-[0.15em] uppercase flex items-center gap-3 text-white border-white/40 hover:border-white hover:text-white">
              <i className="fa-solid fa-play text-[10px]" />
              <span>Ver demostración · 90s</span>
            </a>
          </div>
        </div>

        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 text-white/60">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <div className="w-px h-12 bg-white/30 scroll-pulse" />
        </div>
      </section>

      {/* ============ 00.5 — LA VERDAD ============ */}
      <section className="bg-black h-screen flex flex-col items-center justify-center px-6 text-center border-t border-[var(--border)]">
        <div className="reveal-stagger space-y-12 md:space-y-20">
          <h2 className="font-display font-light text-[clamp(2rem,6vw,5rem)] leading-[1.05] text-balance">
            No necesitas más clientes.
          </h2>
          <h2 className="font-display font-light text-[clamp(2.5rem,7vw,6rem)] leading-[1.05] text-balance text-[var(--accent)] italic">
            Necesitas que vuelvan.
          </h2>
          <h2 className="font-display font-light text-[clamp(1.5rem,4vw,3rem)] leading-[1.05] text-balance text-[var(--fg-dim)]">
            BarberOS fue diseñado para eso.
          </h2>
        </div>
      </section>

      {/* ============ Marquee ============ */}
      <section className="py-6 border-y border-[var(--border)] overflow-hidden bg-[var(--bg)]">
        <div className="marquee-track text-[var(--fg-dim)] font-display italic text-2xl">
          <span className="flex items-center gap-12">
            <span>Cliente entra.</span><span className="text-[var(--accent)]">/</span>
            <span>Se corta.</span><span className="text-[var(--accent)]">/</span>
            <span>Se ríe.</span><span className="text-[var(--accent)]">/</span>
            <span>Sale.</span><span className="text-[var(--accent)]">/</span>
            <span>Silencio.</span><span className="text-[var(--accent)]">/</span>
            <span>WhatsApp.</span><span className="text-[var(--accent)]">/</span>
            <span>Sonríe.</span><span className="text-[var(--accent)]">/</span>
            <span>Tres semanas.</span><span className="text-[var(--accent)]">/</span>
            <span>Regresa.</span><span className="text-[var(--accent)]">/</span>
          </span>
          <span className="flex items-center gap-12">
            <span>Cliente entra.</span><span className="text-[var(--accent)]">/</span>
            <span>Se corta.</span><span className="text-[var(--accent)]">/</span>
            <span>Se ríe.</span><span className="text-[var(--accent)]">/</span>
            <span>Sale.</span><span className="text-[var(--accent)]">/</span>
            <span>Silencio.</span><span className="text-[var(--accent)]">/</span>
            <span>WhatsApp.</span><span className="text-[var(--accent)]">/</span>
            <span>Sonríe.</span><span className="text-[var(--accent)]">/</span>
            <span>Tres semanas.</span><span className="text-[var(--accent)]">/</span>
            <span>Regresa.</span><span className="text-[var(--accent)]">/</span>
          </span>
        </div>
      </section>

      {/* ============ 01 — EL PROBLEMA ============ */}
      <section className="section-landing" id="problema">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex items-center gap-4 mb-16">
            <span className="num-marker">01 / El problema</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <h2 className="font-display font-light text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-balance">
                Mientras tus clientes salen por esa puerta...
                <span className="block italic text-[var(--accent)] mt-2">empiezas a perder dinero.</span>
              </h2>
              <div className="mt-10 space-y-5 text-[var(--fg-dim)] text-lg leading-relaxed font-light max-w-md">
                <p>No porque cortes mal.</p>
                <p>No porque no sepas fidelizar.</p>
                <p className="text-[var(--fg)] text-xl font-normal">Sino porque nadie hace seguimiento.</p>
              </div>
              <div className="mt-12">
                <a href="#creencia" className="btn-primary-landing inline-flex items-center gap-3 px-8 py-4 text-sm font-mono tracking-[0.15em] uppercase">
                  <span>Descubre si BarberOS es para tu barbería</span>
                  <i className="fa-solid fa-arrow-right text-xs" />
                </a>
              </div>
            </div>

            <div className="reveal relative">
              <div className="aspect-[4/5] relative overflow-hidden vignette">
                <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=85&w=1200&auto=format&fit=crop" alt="Barbero cortando" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="group relative" data-cursor="hover">
                    <div className="w-20 h-20 rounded-full border border-white/60 flex items-center justify-center backdrop-blur-sm bg-black/20 group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-all duration-500">
                      <i className="fa-solid fa-play text-white text-xl ml-1" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-white/30 group-hover:scale-125 transition-transform duration-700" />
                  </button>
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/60 mb-1">Take 01</p>
                    <p className="font-display text-2xl">&ldquo;Lo descubrí en mi propia barbería.&rdquo;</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 font-mono text-[10px] tracking-[0.25em] text-[var(--accent)]">● REC</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 02 — ROMPER LA CREENCIA ============ */}
      <section className="section-landing bg-[var(--bg-soft)] py-0" id="creencia">
        <div className="split-screen">
          <div className="reveal p-12 md:p-20 border-r border-[var(--border)] flex flex-col justify-center min-h-[80vh]">
            <div className="flex items-center gap-4 mb-12">
              <span className="num-marker">02 / Romper la creencia</span>
            </div>
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--muted)] mb-8">Lo que todos venden</p>
            <ul className="space-y-5 font-display text-3xl md:text-4xl font-light text-[var(--fg-dim)]">
              <li className="flex items-center gap-4"><span className="text-[var(--muted)] text-lg font-mono">01</span><span>Tarjetas digitales</span></li>
              <li className="flex items-center gap-4"><span className="text-[var(--muted)] text-lg font-mono">02</span><span>QR</span></li>
              <li className="flex items-center gap-4"><span className="text-[var(--muted)] text-lg font-mono">03</span><span>Sellos</span></li>
              <li className="flex items-center gap-4"><span className="text-[var(--muted)] text-lg font-mono">04</span><span>Apps</span></li>
              <li className="flex items-center gap-4"><span className="text-[var(--muted)] text-lg font-mono">05</span><span>Descuentos</span></li>
            </ul>
          </div>

          <div className="reveal p-12 md:p-20 flex flex-col justify-center min-h-[80vh] bg-[var(--bg)]">
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--accent)] mb-8">Lo que hace BarberOS</p>
            <ul className="space-y-5 font-display text-3xl md:text-4xl font-light">
              <li className="flex items-center gap-4"><i className="fa-solid fa-check text-[var(--accent)] text-lg" /><span>Clientes que regresan.</span></li>
              <li className="flex items-center gap-4"><i className="fa-solid fa-check text-[var(--accent)] text-lg" /><span>Más reseñas.</span></li>
              <li className="flex items-center gap-4"><i className="fa-solid fa-check text-[var(--accent)] text-lg" /><span>Información.</span></li>
              <li className="flex items-center gap-4"><i className="fa-solid fa-check text-[var(--accent)] text-lg" /><span>Decisiones.</span></li>
              <li className="flex items-center gap-4"><i className="fa-solid fa-check text-[var(--accent)] text-lg" /><span>Crecimiento.</span></li>
            </ul>
          </div>
        </div>

        {/* Sticky quotes container that reveals each message on scroll (shorter scroll footprint) */}
        <div id="sticky-quotes-trigger" className="relative h-[110vh] border-t border-[var(--border)]">
          <div className="sticky top-0 h-screen flex flex-col justify-center items-center overflow-hidden px-6 text-center">
            {/* Background decorative glow elements */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-[500px] h-[500px] bg-[var(--accent)] rounded-full blur-[150px]" />
            </div>

            <div className="relative w-full max-w-5xl mx-auto min-h-[300px] flex items-center justify-center">
              {/* Quote 1: Target to show initially and fade out as we scroll */}
              <div id="quote-card-1" className="transition-all duration-700 ease-out w-full absolute inset-x-0">
                <p className="font-display text-[clamp(1.8rem,4vw,3.5rem)] font-light italic leading-[1.1] text-balance text-[var(--fg-dim)]">
                  No digitalizamos una tarjeta.
                </p>
                <p className="font-display text-[clamp(2.2rem,5.5vw,5rem)] font-light leading-[1.05] mt-6 text-balance text-white">
                  Digitalizamos la <span className="text-[var(--accent)] italic">relación</span> con tus clientes.
                </p>
              </div>

              {/* Quote 2: Target to fade in as we scroll down */}
              <div id="quote-card-2" className="transition-all duration-700 ease-out w-full opacity-0 translate-y-12 absolute inset-x-0 pointer-events-none">
                <p className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-[1.1] text-balance font-light text-white">
                  Tu trabajo termina cuando acaba el corte.
                </p>
                <p className="font-display text-[clamp(2rem,5.5vw,5rem)] leading-[1.1] text-balance font-light italic text-[var(--accent)] mt-4">
                  El nuestro empieza ahí.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 03 — CÓMO FUNCIONA ============ */}
      <section className="section-landing" id="como">
        <div className="max-w-7xl mx-auto">
          <div className="reveal flex items-center gap-4 mb-20">
            <span className="num-marker">03 / Cómo funciona</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="reveal mb-20 max-w-3xl">
            <h2 className="font-display font-light text-[clamp(2rem,4vw,3.5rem)] leading-tight text-balance">
              Tres pasos. Sin descargar nada. Sin complicaciones.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="reveal group">
              <div className="aspect-[3/4] relative overflow-hidden vignette mb-6">
                <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=85&w=900&auto=format&fit=crop" alt="Cliente en espejo" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/60">Paso 01</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-[var(--accent)] text-sm mt-1">→</span>
                <div>
                  <h3 className="font-display text-2xl mb-2">Termina un corte.</h3>
                  <p className="text-[var(--fg-dim)] text-sm leading-relaxed">El cliente se mira al espejo. Sonríe. No mira el celular. Disfruta el momento.</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="reveal group md:translate-y-12">
              <div className="aspect-[3/4] relative overflow-hidden vignette mb-6">
                <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=85&w=900&auto=format&fit=crop" alt="Barbero tocando tablet" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/60">Paso 02</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-[var(--accent)] text-sm mt-1">→</span>
                <div>
                  <h3 className="font-display text-2xl mb-2">Registras la visita.</h3>
                  <p className="text-[var(--fg-dim)] text-sm leading-relaxed">Un toque en tu teléfono. Sin QR gigante. Sin interfaces. Una acción natural que se siente invisible.</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="reveal group md:translate-y-24">
              <div className="aspect-[3/4] relative overflow-hidden vignette mb-6">
                <img src="https://images.unsplash.com/photo-1556122071-e404eaedb77f?q=85&w=900&auto=format&fit=crop" alt="Cliente en calle" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/60">Paso 03</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-[var(--accent)] text-sm mt-1">→</span>
                <div>
                  <h3 className="font-display text-2xl mb-2">El cliente sonríe en la calle.</h3>
                  <p className="text-[var(--fg-dim)] text-sm leading-relaxed">Su teléfono vibra. Una notificación elegante de WhatsApp. BarberOS hace el resto sin que tú hagas nada más.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="reveal mt-24 text-center">
            <p className="font-display italic text-2xl text-[var(--fg-dim)]">Eso es todo.</p>
          </div>
        </div>
      </section>

      {/* ============ 04 — STORYTELLING HORIZONTAL ============ */}
      <section className="bg-black py-20 overflow-hidden border-y border-[var(--border)]" id="story">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="reveal flex items-center gap-4 mb-12">
            <span className="num-marker">04 / Lo que cambia en tu barbería</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <h2 className="reveal font-display font-light text-[clamp(2rem,4vw,3.5rem)] leading-tight text-balance max-w-3xl">
            Cada corte cuenta una historia.
          </h2>
        </div>

        <div className="story-scroll">
          {[
            { img: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=85&w=1600&auto=format&fit=crop", num: "01 / 05", title: "Cliente entra por primera vez.", sub: "Todo comienza con un corte." },
            { img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=85&w=1600&auto=format&fit=crop", num: "02 / 05", title: "Registra su visita.", sub: "La mayoría de barberías termina aquí." },
            { img: "https://images.unsplash.com/photo-1556122071-e404eaedb77f?q=85&w=1600&auto=format&fit=crop", num: "03 / 05", title: "BarberOS hace seguimiento.", sub: "Aquí empieza la diferencia." },
            { img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=85&w=1600&auto=format&fit=crop", num: "04 / 05", title: "Cliente vuelve.", sub: "Un cliente que regresa vale más que uno nuevo." },
            { img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=85&w=1600&auto=format&fit=crop", num: "05 / 05", title: "Deja una reseña.", sub: "Ahora también trae a otros." },
          ].map((slide, i) => (
            <div key={i} className="story-slide">
              <img src={slide.img} alt={slide.title} />
              <div className="overlay" />
              <div className="content reveal">
                <p className="num-marker mb-6 text-[var(--accent-bright)]">{slide.num}</p>
                <h3 className="font-display text-4xl md:text-7xl font-light text-white text-balance">{slide.title}</h3>
                <p className="mt-8 text-xl md:text-2xl text-white/80 font-light italic">{slide.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-8 font-mono text-xs tracking-[0.2em] uppercase text-[var(--muted)]">Desliza horizontalmente →</p>
      </section>

      {/* ============ 05 — LO QUE OCURRE DESPUÉS ============ */}
      <section className="section-landing" id="por-que">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex items-center gap-4 mb-16">
            <span className="num-marker">05 / Lo que ocurre después de cada corte</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="reveal mb-24 max-w-4xl">
            <h2 className="font-display font-light text-[clamp(2rem,5vw,4rem)] leading-tight text-balance">
              No hemos programado una herramienta. Hemos modelado <span className="italic text-[var(--accent)]">comportamiento humano</span>.
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-px bg-[var(--border)]">
            {[
              { icon: "fa-chart-line", title: "Progreso.", desc: "Cada visita cuenta. Cada visita se siente." },
              { icon: "fa-gift", title: "Recompensas.", desc: "No promociones. Reconocimientos." },
              { icon: "fa-route", title: "Seguimiento sin esfuerzo.", desc: "Silencioso. Constante. Sin molestar." },
              { icon: "fa-clock", title: "El momento justo.", desc: "No cualquier lunes. El lunes correcto." },
              { icon: "fa-eye", title: "Curiosidad.", desc: "El cliente abre WhatsApp. Quiere saber." },
            ].map((item, i) => (
              <div key={i} className="reveal bg-[var(--bg)] p-8 group hover:bg-[var(--bg-soft)] transition-colors duration-500">
                <div className="font-mono text-xs tracking-[0.2em] text-[var(--accent)] mb-6">0{i + 1}</div>
                <i className={`fa-solid ${item.icon} text-2xl text-[var(--fg-dim)] group-hover:text-[var(--accent)] transition-colors mb-6 block`} />
                <h3 className="font-display text-2xl mb-3">{item.title}</h3>
                <p className="text-sm text-[var(--fg-dim)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="reveal mt-24 text-center">
            <p className="font-display italic text-[clamp(1.5rem,3vw,2.5rem)] text-[var(--fg-dim)] max-w-3xl mx-auto leading-snug text-balance">
              Inteligencia que <span className="text-[var(--accent)] not-italic">no olvida a tus clientes</span>.
            </p>
            <div className="mt-12">
              <a
                href="https://wa.me/593963410409?text=Hola%20quiero%20probar%20BarberOS"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-landing inline-flex items-center gap-3 px-8 py-4 text-sm font-mono tracking-[0.15em] uppercase"
              >
                <span>Quiero probarlo</span>
                <i className="fa-solid fa-arrow-right text-xs" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 06 — PREGUNTAS QUE DUELEN ============ */}
      <section className="section-landing bg-[var(--bg-soft)] relative overflow-hidden" id="preguntas">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <span className="font-display text-[40vw] font-black">?</span>
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="reveal flex items-center gap-4 mb-16">
            <span className="num-marker">06 / Preguntas que duelen</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="reveal mb-20">
            <h2 className="font-display font-light text-[clamp(2rem,5vw,4rem)] leading-tight text-balance">
              No respondemos. <span className="italic text-[var(--accent)]">Solo preguntamos.</span>
            </h2>
          </div>

          <div className="reveal-stagger space-y-2">
            {[
              "¿Cuántos clientes dejaste de ver este mes?",
              "¿Cuánto dinero representan?",
              "¿Quién fideliza mejor?",
              "¿Quién se fue con la barbería de la esquina?",
            ].map((q, i) => (
              <div key={i} className="pregunta font-display font-light text-[clamp(1.5rem,3.5vw,2.8rem)] py-8 border-b border-[var(--border)] cursor-pointer">
                {q}
              </div>
            ))}
            <div className="pregunta font-display font-light text-[clamp(1.5rem,3.5vw,2.8rem)] py-8 border-b border-[var(--border)] cursor-pointer">
              ¿Cuántos volverían si <span className="text-[var(--accent)] italic">alguien</span> les escribiera hoy?
            </div>
          </div>

          <div className="reveal mt-20 text-center">
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--muted)]">Si alguna te ha dolido, sigue leyendo.</p>
          </div>
        </div>
      </section>

      {/* ============ 07 — VIDEO FUNDADOR ============ */}
      <section className="section-landing" id="video-founder">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex items-center gap-4 mb-16">
            <span className="num-marker">07 / Video</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 reveal">
              <div className="aspect-video relative overflow-hidden vignette group">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=85&w=1600&auto=format&fit=crop" alt="Fundador" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                <button className="absolute inset-0 flex items-center justify-center group" data-cursor="hover">
                  <div className="w-24 h-24 rounded-full border-2 border-white/80 flex items-center justify-center backdrop-blur-sm bg-black/30 group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-all duration-500">
                    <i className="fa-solid fa-play text-white text-2xl ml-1" />
                  </div>
                </button>
                <div className="absolute top-6 left-6 flex items-center gap-3 text-white text-[10px] font-mono tracking-[0.25em]">
                  <span className="w-2 h-2 bg-red-500 rec-dot rounded-full" />
                  <span>FOUNDERS CUT · 05:00</span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                  <p className="font-display italic text-xl md:text-2xl max-w-md">&ldquo;No diseñé BarberOS para digitalizar tarjetas.&rdquo;</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 reveal">
              <p className="num-marker mb-6">Founder · 5 min</p>
              <h2 className="font-display font-light text-[clamp(1.8rem,3.5vw,3rem)] leading-tight mb-8 text-balance">
                &ldquo;Lo diseñé porque descubrí que el verdadero problema era que el cliente <span className="italic text-[var(--accent)]">desaparecía</span>.&rdquo;
              </h2>
              <div className="space-y-4 text-[var(--fg-dim)] leading-relaxed">
                <p>Cinco minutos. Sin guion. Sin filtros.</p>
                <p>La historia de por qué existe BarberOS y por qué no es lo que crees.</p>
              </div>
              <button className="mt-10 btn-ghost-landing px-6 py-3 text-xs font-mono tracking-[0.15em] uppercase flex items-center gap-3" data-cursor="hover">
                <i className="fa-solid fa-play text-[10px]" />
                <span>Reproducir video</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 08 — EL FUTURO DE TU BARBERÍA ============ */}
      <section className="section-landing bg-[var(--bg-soft)]" id="futuro">
        <div className="max-w-5xl mx-auto">
          <div className="reveal flex items-center gap-4 mb-16">
            <span className="num-marker">08 / El futuro de tu barbería</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="reveal mb-20 max-w-3xl">
            <h2 className="font-display font-light text-[clamp(2rem,5vw,4rem)] leading-tight text-balance">
              No vendemos actualizaciones de software. Construimos un <span className="italic text-[var(--accent)]">organismo que crece</span> contigo.
            </h2>
            <p className="mt-6 text-[var(--fg-dim)] text-lg leading-relaxed">
              Todo construido sobre la misma base de datos. Cada etapa alimenta la siguiente.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-[var(--border)] md:-translate-x-1/2" />
            <div className="space-y-16">
              {[
                { time: "Hoy", title: "Fidelización.", desc: "El cimiento. Sin esto, lo demás no se sostiene.", active: true, side: "left" },
                { time: "+ 3 meses", title: "Motor de reputación.", desc: "Reseñas Google automáticas en el momento exacto de satisfacción.", side: "right" },
                { time: "+ 6 meses", title: "Seguimiento sin esfuerzo.", desc: "Mensajes que se envían solos, al cliente correcto, en el momento correcto.", side: "left" },
                { time: "+ 9 meses", title: "Gerente IA.", desc: "Responde WhatsApp. Agenda. Sugiere. Aprende de cada interacción.", side: "right" },
                { time: "+ 12 meses", title: "Predicción.", desc: "Saber quién va a volver antes de que vuelva. Y quién se está yendo antes de que se vaya.", side: "left" },
                { time: "+ 18 meses", title: "Sistema Operativo.", desc: "La barbería funciona sin que tú pienses en la barbería.", side: "right", highlight: true },
              ].map((step, i) => (
                <div key={i} className={`roadmap-step reveal ${step.active ? "active" : ""} relative pl-20 md:pl-0 md:grid md:grid-cols-2 md:gap-16`}>
                  {step.side === "left" ? (
                    <>
                      <div className="md:text-right md:pr-16">
                        <p className={`font-mono text-xs tracking-[0.25em] uppercase ${step.active || step.highlight ? "text-[var(--accent)]" : "text-[var(--fg-dim)]"} mb-3`}>{step.time}</p>
                        <h3 className={`font-display text-3xl md:text-4xl font-light ${step.highlight ? "text-[var(--accent)]" : ""}`}>{step.title}</h3>
                      </div>
                      <p className="md:col-start-2 md:pl-16 text-[var(--fg-dim)] leading-relaxed mt-3 md:mt-0">{step.desc}</p>
                    </>
                  ) : (
                    <>
                      <div className="hidden md:block" />
                      <div className="md:pl-16">
                        <p className={`font-mono text-xs tracking-[0.25em] uppercase ${step.highlight ? "text-[var(--accent)]" : "text-[var(--fg-dim)]"} mb-3`}>{step.time}</p>
                        <h3 className={`font-display text-3xl md:text-4xl font-light ${step.highlight ? "text-[var(--accent)]" : ""}`}>{step.title}</h3>
                        <p className="mt-3 text-[var(--fg-dim)] leading-relaxed">{step.desc}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 09 — OBJECIONES ============ */}
      <section className="section-landing" id="objeciones">
        <div className="max-w-7xl mx-auto">
          <div className="reveal flex items-center gap-4 mb-16">
            <span className="num-marker">09 / Objeciones</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="reveal mb-20 max-w-4xl">
            <h2 className="font-display font-light text-[clamp(2rem,5vw,4rem)] leading-tight text-balance">
              No un acordeón. <span className="italic text-[var(--accent)]">Tu cara.</span> Treinta segundos por respuesta.
            </h2>
            <p className="mt-6 text-[var(--fg-dim)] text-lg">Pasa el cursor. Mira a los ojos.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { q: `"Eso ya me lo ofrecieron."`, a: "Te lo ofrecieron. Pero no te lo dieron. Te vendieron una tarjeta. No una relación." },
              { q: `"¿Lo puedo hacer con ChatGPT?"`, a: "Puedes. Pero no lo vas a hacer. Y si lo haces, no lo vas a sostener. Y si lo sostienes, no va a escalar." },
              { q: `"¿Necesito otra aplicación?"`, a: "No. El cliente no instala nada. Tú no instalas nada. Todo vive donde ya estás: WhatsApp." },
              { q: `"¿Qué pasa si no tengo tiempo?"`, a: "No necesitas tiempo. Necesitas 90 segundos al final del corte. BarberOS hace el resto mientras duermes." },
              { q: `"¿Y si tengo varios barberos?"`, a: "Mejor. Cada barbero genera datos. Los datos alimentan el sistema. El sistema alimenta la barbería." },
              { q: `"¿Y si mi cliente no usa tecnología?"`, a: "Si usa WhatsApp, ya usa tecnología. Y todos usan WhatsApp." },
            ].map((obj, i) => (
              <div key={i} className="objection-card reveal p-8 min-h-[280px] flex flex-col justify-between">
                <div className="objection-text transition-opacity duration-300">
                  <p className="num-marker mb-6">0{i + 1}</p>
                  <p className="font-display text-2xl md:text-3xl font-light leading-snug">{obj.q}</p>
                </div>
                <div className="video-preview">
                  <p className="text-[var(--fg-dim)] text-sm leading-relaxed">{obj.a}</p>
                </div>
                <div className="relative z-10 flex items-center justify-between mt-8">
                  <span className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--fg-dim)]">00:30</span>
                  <div className="play-orb w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center">
                    <i className="fa-solid fa-play text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 10 — FUNDADORES ============ */}
      <section className="section-landing bg-[var(--bg-soft)]" id="fundadores">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex items-center gap-4 mb-16">
            <span className="num-marker">10 / Quiénes somos</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <div className="reveal mb-20 max-w-3xl">
            <h2 className="font-display font-light text-[clamp(2rem,5vw,4rem)] leading-tight text-balance">
              No somos una startup. <span className="italic text-[var(--accent)]">Somos barberos</span> que programan.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {[
              { img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=85&w=600&auto=format&fit=crop", name: "Fundador 1", role: "Ex-barbero. Ahora CTO.", quote: "Construí lo que habría querido tener cuando tenía mi silla." },
              { img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=85&w=600&auto=format&fit=crop", name: "Fundador 2", role: "Growth. Ex-agencia.", quote: "Las barberías tienen los mejores datos del mundo. Solo que nadie los usaba." },
            ].map((f, i) => (
              <div key={i} className="reveal group">
                <div className="aspect-[4/5] relative overflow-hidden vignette mb-6">
                  <img src={f.img} alt={f.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 grayscale group-hover:grayscale-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/60 mb-1">{f.role}</p>
                    <p className="font-display text-2xl italic">&ldquo;{f.quote}&rdquo;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 11 — CTA FINAL ============ */}
      <section className="section-landing relative overflow-hidden" id="cta-final">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
          <span className="font-display text-[50vw] font-black">B</span>
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="reveal">
            <p className="font-mono text-xs tracking-[0.4em] uppercase text-[var(--accent)] mb-10">Últimas plazas · Lanzamiento</p>
            <h2 className="font-display font-light text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] text-balance">
              Tu barbería ya tiene la cultura.
              <span className="block italic text-[var(--accent)] mt-2">Nosotros le damos la tecnología.</span>
            </h2>
            <p className="mt-8 text-[var(--fg-dim)] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Solo aceptamos barberías que ya saben cortar. El resto lo hacemos nosotros.
            </p>

            <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-5">
              <a
                href="https://wa.me/593963410409?text=Hola%20quiero%20reservar%20mi%20plaza%20en%20BarberOS"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-landing px-10 py-5 text-sm font-mono tracking-[0.15em] uppercase flex items-center gap-3 glow-accent pulse-ring"
              >
                <span>Quiero mi plaza</span>
                <i className="fa-solid fa-arrow-right text-xs" />
              </a>
              <a href="#como" className="btn-ghost-landing px-8 py-5 text-sm font-mono tracking-[0.15em] uppercase">
                Volver a ver cómo funciona
              </a>
            </div>

            <p className="mt-10 font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--muted)]">
              Sin contrato · Sin tarjeta · Sin compromiso
            </p>
          </div>
        </div>
      </section>

      {/* ============ Footer ============ */}
      <footer className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 border border-[var(--fg)]/30 flex items-center justify-center">
                  <span className="font-display text-sm font-bold">B</span>
                </div>
                <span className="font-mono text-xs tracking-[0.25em] uppercase">BarberOS</span>
              </div>
              <p className="text-sm text-[var(--fg-dim)] leading-relaxed max-w-xs">
                El sistema operativo para barberías que ya saben cortar.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--accent)] mb-6">Navegación</p>
              <div className="space-y-3 text-sm text-[var(--fg-dim)]">
                <a href="#problema" className="block hover:text-[var(--accent)] transition">El problema</a>
                <a href="#como" className="block hover:text-[var(--accent)] transition">Cómo funciona</a>
                <a href="#por-que" className="block hover:text-[var(--accent)] transition">Por qué funciona</a>
                <a href="#fundadores" className="block hover:text-[var(--accent)] transition">Fundadores</a>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs tracking-[0.25em] uppercase text-[var(--accent)] mb-6">Contacto</p>
              <div className="space-y-3 text-sm text-[var(--fg-dim)]">
                <p>hola@barberos.app</p>
                <p>WhatsApp: +593 96 341 0409</p>
              </div>
            </div>
          </div>
          <div className="div-line mb-6" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
            <p>
              © {new Date().getFullYear()} BarberOS. Todos los derechos reservados. | Hecho por{" "}
              <a
                href="https://www.cesarreyesjaramillo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Cesar Reyes
              </a>{" "}
              | Barberos Loja
            </p>
            <p className="font-mono tracking-[0.2em]">HECHO CON PRECISIÓN.</p>
          </div>
        </div>
      </footer>

      {/* Fixed CTA */}
      <div className="fixed-cta" ref={fixedCtaRef}>
        <a
          href="https://wa.me/593963410409?text=Hola%20quiero%20reservar%20mi%20plaza%20en%20BarberOS"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary-landing flex items-center gap-3 px-6 py-3 text-xs font-mono tracking-[0.15em] uppercase shadow-2xl"
        >
          <span>Reservar plaza</span>
          <i className="fa-solid fa-arrow-right text-[10px]" />
        </a>
      </div>
    </div>
  );
}
