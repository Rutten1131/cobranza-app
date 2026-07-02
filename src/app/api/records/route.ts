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

    const { clientId, description, amount, dueDate, issueDate } = result.data;

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

    const record = await prisma.record.create({
      data: {
        userId: auth.userId,
        clientId,
        description,
        amount: amount ? amount : null,
        dueDate: new Date(dueDate),
        issueDate: new Date(issueDate),
        status: "pending",
        reminderSchedule: {
          create: [
            { scheduledDate: new Date(dueDate), reminderNumber: 1, status: "pending" },
            { scheduledDate: addDays(new Date(dueDate), 2), reminderNumber: 2, status: "pending" },
            { scheduledDate: addDays(new Date(dueDate), 4), reminderNumber: 3, status: "pending" },
            { scheduledDate: addDays(new Date(dueDate), 6), reminderNumber: 4, status: "pending" },
          ],
        },
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        reminderSchedule: true,
      },
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