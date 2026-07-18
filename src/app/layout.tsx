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
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className="min-h-screen bg-gradient-dark">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}