import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    const { id } = await params;

    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        businessName: true,
        businessType: true,
        whatsappSender: true,
        isActive: true,
        hasCobranzas: true,
        hasHabitaciones: true,
        hasBarberia: true,
        createdAt: true,
        _count: {
          select: { records: true, clients: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
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

    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { businessName, businessType, whatsappSender, isActive, password, hasCobranzas, hasHabitaciones, hasBarberia, hasBarberiaPremium } = body;

    const updateData: { [key: string]: any } = {};

    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessType !== undefined) updateData.businessType = businessType;
    if (whatsappSender !== undefined) updateData.whatsappSender = whatsappSender;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (hasCobranzas !== undefined) updateData.hasCobranzas = Boolean(hasCobranzas);
    if (hasHabitaciones !== undefined) updateData.hasHabitaciones = Boolean(hasHabitaciones);
    if (hasBarberia !== undefined) updateData.hasBarberia = Boolean(hasBarberia);
    if (hasBarberiaPremium !== undefined) updateData.hasBarberiaPremium = Boolean(hasBarberiaPremium);
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        businessName: true,
        businessType: true,
        whatsappSender: true,
        isActive: true,
        hasCobranzas: true,
        hasHabitaciones: true,
        hasBarberia: true,
        hasBarberiaPremium: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
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

    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Prevent deleting yourself
    if (auth.userId === id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}