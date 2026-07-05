import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rooms = await prisma.hotelRoom.findMany({
    where: { userId: auth.userId },
    include: { reservations: true },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { number, type, price } = body;

  if (!number || !type || !price) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  try {
    const room = await prisma.hotelRoom.create({
      data: {
        userId: auth.userId,
        number,
        type,
        price: parseFloat(price),
      },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una habitación con ese número" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear habitación" }, { status: 500 });
  }
}
