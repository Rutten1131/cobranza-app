import { Metadata } from "next";

export const metadata: Metadata = {
  title: "BarberOS — Tu barbería no necesita más clientes",
  description:
    "El sistema operativo para barberías que automatiza el seguimiento de clientes y reseñas en Google Business por WhatsApp. Tu trabajo termina con el corte, el nuestro empieza ahí.",
  openGraph: {
    title: "BarberOS — Tu barbería no necesita más clientes",
    description:
      "Automatiza el seguimiento de tus clientes y las reseñas de Google Business por WhatsApp. Transforma tu barbería en un negocio recurrente.",
    url: "https://cobranza-app-ochre.vercel.app/barberos",
    siteName: "BarberOS",
    images: [
      {
        url: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=85&w=1200&h=630&fit=crop",
        width: 1200,
        height: 630,
        alt: "BarberOS — Tu barbería no necesita más clientes",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BarberOS — Tu barbería no necesita más clientes",
    description:
      "Automatiza el seguimiento de tus clientes y las reseñas de Google Business por WhatsApp.",
    images: ["https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=85&w=1200&h=630&fit=crop"],
  },
};

export default function BarberosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
