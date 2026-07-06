import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { createRecordSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);

    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const records = await prisma.record.findMany({
      where: {
        userId: auth.userId,
        ...(status && status !== "all" ? { status: status as "pending" | "paid" | "overdue" } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        reminderSchedule: {
          orderBy: { scheduledDate: "asc" },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Update overdue status for records past due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const record of records) {
      const dueDate = new Date(record.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today && record.status === "pending") {
        await prisma.record.update({
          where: { id: record.id },
          data: { status: "overdue" },
        });
        record.status = "overdue";
      }
    }

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Get records error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
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
    const result = createRecordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, description, amount, dueDate, issueDate, reminderDates, customMessage, inventoryItemId } = body;

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: auth.userId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Verify inventory stock if inventoryItemId is provided
    if (inventoryItemId) {
      const invItem = await prisma.inventoryItem.findFirst({
        where: { id: inventoryItemId, userId: auth.userId },
      });

      if (!invItem) {
        return NextResponse.json({ error: "Artículo de inventario no encontrado" }, { status: 404 });
      }

      if (invItem.availableStock <= 0) {
        return NextResponse.json({ error: "No queda stock disponible de este producto en el inventario" }, { status: 400 });
      }
    }

    // Determinar las fechas programadas finales
    let finalReminderDates: string[] = [];
    if (reminderDates && reminderDates.length > 0) {
      // Usar las personalizadas enviadas por el usuario, ordenadas de menor a mayor
      finalReminderDates = [...reminderDates].sort();
    } else {
      // Caer en la opción por defecto: 5 días consecutivos a partir de la fecha de vencimiento/primer aviso
      const start = new Date(dueDate);
      for (let i = 0; i < 5; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        finalReminderDates.push(d.toISOString().split("T")[0]);
      }
    }

    // La fecha de vencimiento/límite de la deuda pasa a ser el último aviso del cronograma
    const finalDueDate = finalReminderDates.length > 0 
      ? new Date(finalReminderDates[finalReminderDates.length - 1]) 
      : new Date(dueDate);

    // Crear la programación
    const now = new Date();
    const reminderCreateData = finalReminderDates.map((dateStr, idx) => {
      const schedDate = new Date(dateStr);
      return {
        scheduledDate: schedDate,
        reminderNumber: idx + 1,
        status: schedDate <= now ? "skipped" : "pending",
      };
    });

    // Perform database operations in transaction
    const record = await prisma.$transaction(async (tx) => {
      // Reduce availableStock if linked
      if (inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: {
            availableStock: {
              decrement: 1,
            },
          },
        });
      }

      return await tx.record.create({
        data: {
          userId: auth.userId,
          clientId,
          description,
          amount: amount ? parseFloat(amount) : null,
          dueDate: finalDueDate,
          issueDate: new Date(issueDate),
          status: "pending",
          customMessage: customMessage || null,
          inventoryItemId: inventoryItemId || null,
          reminderSchedule: {
            create: reminderCreateData,
          },
        },
        include: {
          client: {
            select: { id: true, name: true, phone: true },
          },
          reminderSchedule: true,
        },
      });
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error("Create record error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}