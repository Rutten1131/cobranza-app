import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const reservations = await prisma.hotelReservation.findMany({
    where: { userId: auth.userId },
    include: { room: true },
    orderBy: { checkInDate: "asc" },
  });

  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    roomId,
    guestName,
    guestEmail,
    guestPhone,
    amount,
    status,
    checkInDate,
    checkOutDate,
    adults,
    kids,
  } = body;

  if (!roomId || !guestName || !guestPhone || !checkInDate || !checkOutDate) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  try {
    const reservation = await prisma.hotelReservation.create({
      data: {
        userId: auth.userId,
        roomId,
        guestName,
        guestEmail,
        guestPhone,
        amount: parseFloat(amount) || 0,
        status: status || "pending",
        checkInDate: new Date(checkInDate + "T12:00:00"),
        checkOutDate: new Date(checkOutDate + "T12:00:00"),
        adults: parseInt(adults) || 2,
        kids: parseInt(kids) || 0,
      },
    });

    // Cambiar estado de habitación a ocupada si hoy está dentro del rango
    const todayStr = new Date().toISOString().split("T")[0];
    if (todayStr >= checkInDate && todayStr < checkOutDate) {
      await prisma.hotelRoom.update({
        where: { id: roomId },
        data: { status: "ocupada" },
      });
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear la reserva" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  try {
    const reservation = await prisma.hotelReservation.findUnique({
      where: { id },
    });

    if (!reservation || reservation.userId !== auth.userId) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    await prisma.hotelReservation.delete({
      where: { id },
    });

    // Devolver habitación a libre
    await prisma.hotelRoom.update({
      where: { id: reservation.roomId },
      data: { status: "libre" },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, guestName, guestEmail, guestPhone, amount, status, checkInDate, checkOutDate, adults, kids } = body;

  if (!id) return NextResponse.json({ error: "Falta ID de reserva" }, { status: 400 });

  try {
    const reservation = await prisma.hotelReservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== auth.userId) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const updated = await prisma.hotelReservation.update({
      where: { id },
      data: {
        ...(guestName && { guestName }),
        ...(guestEmail !== undefined && { guestEmail }),
        ...(guestPhone && { guestPhone }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(status && { status }),
        ...(checkInDate && { checkInDate: new Date(checkInDate + "T12:00:00") }),
        ...(checkOutDate && { checkOutDate: new Date(checkOutDate + "T12:00:00") }),
        ...(adults && { adults: parseInt(adults) }),
        ...(kids !== undefined && { kids: parseInt(kids) }),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Error al actualizar la reserva" }, { status: 500 });
  }
}
