import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const { id } = await params;

    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const record = await prisma.record.findFirst({
      where: { id, userId: auth.userId },
      include: {
        client: true,
        user: {
          select: { businessName: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    // Build reminder message
    const businessName = record.user.businessName || " nuestro negocio";
    const today = new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    });

    let message = `Hola ${record.client.name} 👋\n`;
    message += `Te recordamos que el día de hoy (${today}) debes devolver: ${record.description}.`;
    if (record.amount) {
      message += ` Monto: $${record.amount}`;
    }
    message += `\n¡Gracias por confiar en ${businessName}!`;

    // Call Evolution API (in production, this would be a real HTTP request)
    // For now, we just log the message
    console.log(`[WHATSAPP] Sending to ${record.client.phone}:`, message);

    // Log the message
    await prisma.messageLog.create({
      data: {
        recordId: record.id,
        messageText: message,
        status: "sent",
      },
    });

    // Mark reminder as sent
    await prisma.record.update({
      where: { id },
      data: { reminderSent: true },
    });

    return NextResponse.json({
      message: `Recordatorio enviado a ${record.client.name}`,
      success: true,
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: "Error al enviar el recordatorio" },
      { status: 500 }
    );
  }
}