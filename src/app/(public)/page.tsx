import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-dark">
      {/* Navbar */}
      <header className="bg-background-secondary/80 backdrop-blur-md border-b border-glass">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-xl font-display font-bold text-white">
              CobrApp
            </span>
          </div>
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Ingresar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 relative">
        {/* Dot pattern background */}
        <div className="absolute inset-0 dot-pattern" />

        <div className="relative max-w-5xl mx-auto px-4 py-20 flex flex-col items-center text-center">
          <h1 className="text-display font-display text-white mb-4 animate-fade-up">
            Cobra a tiempo.
            <br />
            Sin complicaciones.
          </h1>

          <p
            className="text-body text-text-sub max-w-xl mb-8 animate-fade-up delay-100"
            style={{ opacity: 0 }}
          >
            Recordatorios automáticos por WhatsApp para tu negocio. Simple,
            rápido y efectivo. Sin apps adicionales.
          </p>

          <Link href="/login" className="animate-fade-up delay-200" style={{ opacity: 0 }}>
            <Button size="lg" className="px-8">
              Ingresar al Software
            </Button>
          </Link>

          {/* Features */}
          <div
            className="flex flex-wrap justify-center gap-6 mt-16 animate-fade-up delay-300"
            style={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 text-small text-text-sub">
              <span>✓</span>
              <span>Sin apps extra</span>
            </div>
            <div className="flex items-center gap-2 text-small text-text-sub">
              <span>✓</span>
              <span>Fácil de usar</span>
            </div>
            <div className="flex items-center gap-2 text-small text-text-sub">
              <span>✓</span>
              <span>Para cualquier negocio</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-background-secondary/50 border-t border-glass py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-small text-text-muted">
          © {new Date().getFullYear()} CobrApp. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}