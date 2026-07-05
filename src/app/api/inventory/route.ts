import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const items = await prisma.inventoryItem.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Get inventory error:", error);
    return NextResponse.json(
      { error: "Error al obtener inventario" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    // Check if it is a bulk import (Excel) or single item creation
    if (Array.isArray(body)) {
      // Mass Import
      const createdItems = [];
      
      for (const item of body) {
        if (!item.name) continue;
        const stock = parseInt(item.stock) || 1;
        const price = item.price ? parseFloat(item.price) : null;
        
        const created = await prisma.inventoryItem.create({
          data: {
            userId: auth.userId,
            name: item.name,
            description: item.description || null,
            sku: item.sku || null,
            price: price,
            stock: stock,
            availableStock: stock, // Inicialmente todo disponible
            customFields: item.customFields || null,
          },
        });
        createdItems.push(created);
      }

      return NextResponse.json({ success: true, count: createdItems.length }, { status: 201 });
    } else {
      // Single Item creation
      const { name, description, sku, price, stock, customFields } = body;
      
      if (!name) {
        return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
      }

      const parsedStock = parseInt(stock) || 1;
      const parsedPrice = price ? parseFloat(price) : null;

      const item = await prisma.inventoryItem.create({
        data: {
          userId: auth.userId,
          name,
          description: description || null,
          sku: sku || null,
          price: parsedPrice,
          stock: parsedStock,
          availableStock: parsedStock,
          customFields: customFields || null,
        },
      });

      return NextResponse.json({ item }, { status: 201 });
    }
  } catch (error) {
    console.error("Create inventory item error:", error);
    return NextResponse.json(
      { error: "Error al guardar artículos en el inventario" },
      { status: 500 }
    );
  }
}
