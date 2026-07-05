import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

// PUT - Editar habitación
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const room = await prisma.hotelRoom.findUnique({ where: { id: params.id } });
  if (!room || room.userId !== auth.userId) {
    return NextResponse.json({ error: "Habitación no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const { number, type, price } = body;

  try {
    const updated = await prisma.hotelRoom.update({
      where: { id: params.id },
      data: {
        ...(number && { number }),
        ...(type && { type }),
        ...(price && { price: parseFloat(price) }),
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una habitación con ese número" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al editar habitación" }, { status: 500 });
  }
}

// DELETE - Eliminar habitación (con info de reservas)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const room = await prisma.hotelRoom.findUnique({
    where: { id: params.id },
    include: { reservations: true },
  });

  if (!room || room.userId !== auth.userId) {
    return NextResponse.json({ error: "Habitación no encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action"); // "check", "migrate", "force"
  const targetRoomId = searchParams.get("targetRoomId");

  // Paso 1: Solo verificar si tiene reservas
  if (action === "check") {
    return NextResponse.json({
      hasReservations: room.reservations.length > 0,
      reservationCount: room.reservations.length,
      roomNumber: room.number,
      roomType: room.type,
    });
  }

  // Paso 2: Migrar reservas a otra habitación y luego borrar
  if (action === "migrate" && targetRoomId) {
    const targetRoom = await prisma.hotelRoom.findUnique({
      where: { id: targetRoomId },
    });

    if (!targetRoom || targetRoom.userId !== auth.userId) {
      return NextResponse.json({ error: "Habitación destino no encontrada" }, { status: 404 });
    }

    // Migrar todas las reservas
    await prisma.hotelReservation.updateMany({
      where: { roomId: params.id },
      data: { roomId: targetRoomId },
    });

    // Ahora borrar la habitación vacía
    await prisma.hotelRoom.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      migratedCount: room.reservations.length,
      targetRoom: targetRoom.number,
    });
  }

  // Paso 3: Forzar borrado (eliminar habitación y todas sus reservas)
  if (action === "force") {
    // Las reservas se eliminan en cascada por la relación onDelete: Cascade
    await prisma.hotelRoom.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, deletedReservations: room.reservations.length });
  }

  // Si no tiene reservas, borrar directamente
  if (room.reservations.length === 0) {
    await prisma.hotelRoom.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  // Si tiene reservas y no especifica acción, devolver info
  return NextResponse.json({
    error: "Esta habitación tiene reservas activas",
    hasReservations: true,
    reservationCount: room.reservations.length,
  }, { status: 409 });
}
