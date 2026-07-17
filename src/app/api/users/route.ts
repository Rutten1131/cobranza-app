import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { createUserSchema } from "@/lib/validations";
import { createEvolutionInstance } from "@/lib/evolution";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);

    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { role: "user" },
      select: {
        id: true,
        email: true,
        businessName: true,
        businessType: true,
        isActive: true,
        hasCobranzas: true,
        hasHabitaciones: true,
        hasBarberia: true,
        createdAt: true,
        _count: {
          select: { records: true, clients: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);

    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, businessName, businessType, whatsappSender } =
      result.data;
    
    // Leer valores directamente del body para no alterar el esquema Zod general
    const hasCobranzas = body.hasCobranzas !== undefined ? Boolean(body.hasCobranzas) : true;
    const hasHabitaciones = body.hasHabitaciones !== undefined ? Boolean(body.hasHabitaciones) : false;
    const hasBarberia = body.hasBarberia !== undefined ? Boolean(body.hasBarberia) : false;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create Evolution API instance for this user
    const instanceName = `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const evolutionResult = await createEvolutionInstance(instanceName);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "user",
        businessName,
        businessType,
        whatsappSender: whatsappSender || null,
        evolutionInstance: evolutionResult.success ? instanceName : null,
        isActive: true,
        hasCobranzas,
        hasHabitaciones,
        hasBarberia,
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        businessType: true,
        isActive: true,
        evolutionInstance: true,
        hasCobranzas: true,
        hasHabitaciones: true,
        hasBarberia: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user, evolutionError: evolutionResult.success ? null : evolutionResult.error }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH - Update logged-in user profile defaults
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { defaultReminderDays, defaultReminderTime, defaultReminderMessage } = body;

    // Validación básica de los inputs
    const days = parseInt(defaultReminderDays);
    if (isNaN(days) || days < 1 || days > 100) {
      return NextResponse.json({ error: "Días de recordatorio no válidos (1-100)" }, { status: 400 });
    }

    if (!defaultReminderTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(defaultReminderTime)) {
      return NextResponse.json({ error: "Formato de hora no válido (HH:MM)" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        defaultReminderDays: days,
        defaultReminderTime,
        defaultReminderMessage: defaultReminderMessage || null,
      },
      select: {
        id: true,
        email: true,
        defaultReminderDays: true,
        defaultReminderTime: true,
        defaultReminderMessage: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}