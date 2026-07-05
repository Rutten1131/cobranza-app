import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const types = await prisma.hotelRoomType.findMany({
    where: { userId: auth.userId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  try {
    const type = await prisma.hotelRoomType.create({
      data: {
        userId: auth.userId,
        name: name.trim(),
      },
    });
    return NextResponse.json(type, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Ya existe esta categoría de habitación" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear la categoría" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  try {
    const type = await prisma.hotelRoomType.findUnique({
      where: { id },
    });

    if (!type || type.userId !== auth.userId) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    await prisma.hotelRoomType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Error al eliminar la categoría" }, { status: 500 });
  }
}
