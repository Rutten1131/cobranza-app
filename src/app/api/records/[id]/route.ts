import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(
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
        client: {
          select: { id: true, name: true, phone: true },
        },
        logs: {
          orderBy: { sentAt: "desc" },
        },
        reminderSchedule: {
          orderBy: { scheduledDate: "asc" },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error("Get record error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

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
    const { description, amount, dueDate, status, reminderDates, reminderSchedule, customMessage } = body;

    const record = await prisma.record.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    let finalDueDate = dueDate ? new Date(dueDate) : undefined;

    // Support updating detailed reminderSchedule (granularity)
    if (reminderSchedule && Array.isArray(reminderSchedule)) {
      // 1. Obtener la programación actual antes de borrarla
      const currentSchedule = await prisma.reminderSchedule.findMany({
        where: { recordId: id },
      });

      // 2. Borrar programación existente
      await prisma.reminderSchedule.deleteMany({
        where: { recordId: id },
      });

      // Ordenar las fechas programadas
      const sortedSchedule = [...reminderSchedule].sort(
        (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );

      if (sortedSchedule.length > 0) {
        finalDueDate = new Date(sortedSchedule[sortedSchedule.length - 1].scheduledDate);
      }

      // Crear nueva programación heredando estados originales si la fecha coincide
      const reminderCreateData = sortedSchedule.map((item, idx) => {
        const itemDate = new Date(item.scheduledDate);
        // Buscar si ya existía un aviso para esta misma fecha y hora exacta
        const match = currentSchedule.find(
          (c) => new Date(c.scheduledDate).getTime() === itemDate.getTime()
        );

        return {
          scheduledDate: itemDate,
          reminderNumber: idx + 1,
          status: match ? match.status : (item.status || "pending"),
          sentAt: match ? match.sentAt : null,
        };
      });

      await prisma.record.update({
        where: { id },
        data: {
          reminderSchedule: {
            create: reminderCreateData,
          },
        },
      });
    } else if (reminderDates && Array.isArray(reminderDates)) {
      // Borrar programación existente
      await prisma.reminderSchedule.deleteMany({
        where: { recordId: id },
      });

      // Ordenar las fechas
      const sortedDates = [...reminderDates].sort();
      
      if (sortedDates.length > 0) {
        finalDueDate = new Date(sortedDates[sortedDates.length - 1]);
      }

      // Crear nueva programación
      const reminderCreateData = sortedDates.map((dateStr, idx) => ({
        scheduledDate: new Date(dateStr),
        reminderNumber: idx + 1,
        status: "pending",
      }));

      await prisma.record.update({
        where: { id },
        data: {
          reminderSchedule: {
            create: reminderCreateData,
          },
        },
      });
    }

    // If status is changing to 'paid' and the record has an inventory item, restore stock
    if (status === "paid" && record.status !== "paid" && record.inventoryItemId) {
      await prisma.inventoryItem.update({
        where: { id: record.inventoryItemId },
        data: {
          availableStock: {
            increment: 1,
          },
        },
      });
    }

    const updated = await prisma.record.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(amount !== undefined && { amount: amount ? amount : null }),
        ...(finalDueDate && { dueDate: finalDueDate }),
        ...(status && { status }),
        customMessage: customMessage !== undefined ? customMessage : undefined,
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        reminderSchedule: {
          orderBy: { scheduledDate: "asc" },
        },
      },
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    console.error("Update record error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
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

    const record = await prisma.record.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    // Si el registro NO estaba pagado y tenía artículo, devolvemos stock
    if (record.status !== "paid" && record.inventoryItemId) {
      try {
        await prisma.inventoryItem.update({
          where: { id: record.inventoryItemId },
          data: {
            availableStock: {
              increment: 1,
            },
          },
        });
      } catch (e) {
        console.error("Could not restore stock on delete:", e);
      }
    }

    await prisma.record.delete({ where: { id } });

    return NextResponse.json({ message: "Registro eliminado" });
  } catch (error) {
    console.error("Delete record error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}