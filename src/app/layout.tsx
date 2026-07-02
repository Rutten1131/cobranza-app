import type { Metadata } from "next";
import "@/styles/globals.css";
import { ToastContainer } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "CobrApp - Software de Cobranzas y Recordatorios",
  description:
    "Software de cobranzas y recordatorios automáticos por WhatsApp para pequeños y medianos negocios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-surface">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}