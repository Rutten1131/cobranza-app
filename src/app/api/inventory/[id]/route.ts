import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const { id } = await params;

    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, sku, price, stock, availableStock, customFields } = body;

    const item = await prisma.inventoryItem.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!item) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(availableStock !== undefined && { availableStock: parseInt(availableStock) }),
        ...(customFields !== undefined && { customFields }),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("Update inventory item error:", error);
    return NextResponse.json(
      { error: "Error al actualizar artículo de inventario" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const { id } = await params;

    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!item) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }

    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Artículo eliminado del inventario" });
  } catch (error) {
    console.error("Delete inventory item error:", error);
    return NextResponse.json(
      { error: "Error al eliminar artículo de inventario" },
      { status: 500 }
    );
  }
}
