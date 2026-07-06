import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, businessName, whatsapp, email, city, answers, score } = body;

    // Validaciones básicas de presencia
    if (!name || !businessName || !whatsapp || !email || !city || !answers) {
      return NextResponse.json(
        { error: "Todos los campos de contacto y respuestas son requeridos." },
        { status: 400 }
      );
    }

    // Crear el lead de validación en la base de datos
    const newLead = await prisma.validationLead.create({
      data: {
        name,
        businessName,
        whatsapp,
        email,
        city,
        answers, // Guardará el objeto JSON de respuestas
        score: typeof score === "number" ? score : 0,
      },
    });

    return NextResponse.json(
      { success: true, leadId: newLead.id, message: "Lead registrado exitosamente" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar lead de validación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el diagnóstico." },
      { status: 500 }
    );
  }
}
