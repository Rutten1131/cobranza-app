import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, getAuthFromRequest } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return NextResponse.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      businessName: user.businessName || undefined,
      hasCobranzas: user.hasCobranzas,
      hasHabitaciones: user.hasHabitaciones,
      hasBarberia: user.hasBarberia,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessName: user.businessName,
        hasCobranzas: user.hasCobranzas,
        hasHabitaciones: user.hasHabitaciones,
        hasBarberia: user.hasBarberia,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);

    if (!auth) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId, isActive: true },
      select: {
        id: true,
        email: true,
        role: true,
        businessName: true,
        businessType: true,
        defaultReminderDays: true,
        defaultReminderTime: true,
        defaultReminderMessage: true,
        hasCobranzas: true,
        hasHabitaciones: true,
        hasBarberia: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ message: "Sesión cerrada" });
  response.cookies.delete("auth_token");
  return response;
}