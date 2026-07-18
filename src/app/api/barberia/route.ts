import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

// GET - Get dashboard statistics, current validation code, customers, staff and history
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let user = await prisma.user.findFirst({
      where: { id: auth.userId, hasBarberia: true },
    });

    if (!user) {
      return NextResponse.json({ error: "El sistema BarberOS no está asignado a tu cuenta" }, { status: 403 });
    }

    // Auto-resolve whatsappSender if it's missing or not a valid phone number
    const isValidPhone = user.whatsappSender && /^\d{7,15}$/.test(user.whatsappSender);
    if (user.evolutionInstance) {
      try {
        const { getConnectedNumber, configureEvolutionWebhook } = await import("@/lib/evolution");
        
        // Auto-resolve number if invalid
        if (!isValidPhone) {
          const cleanNumber = await getConnectedNumber(user.evolutionInstance);
          if (cleanNumber) {
            await prisma.user.update({
              where: { id: user.id },
              data: { whatsappSender: cleanNumber },
            });
            // Refresh user object
            user = await prisma.user.findFirst({ where: { id: auth.userId, hasBarberia: true } }) || user;
            console.log("[Barber API] Auto-resolved whatsappSender to:", cleanNumber);
          }
        }
        
        // Force register/verify webhook connection
        if (user.evolutionInstance) {
          await configureEvolutionWebhook(user.evolutionInstance);
        }
      } catch (e) {
        console.warn("[Barber API] Error in auto-resolve or webhook set:", e);
      }
    }

    // 1. Get or create current validation code
    let activeCodeObj = await prisma.barberCode.findFirst({
      where: { userId: user.id, isUsed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!activeCodeObj) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      activeCodeObj = await prisma.barberCode.create({
        data: {
          userId: user.id,
          code,
        },
      });
    }

    // 2. Fetch staff members
    const staff = await prisma.barberStaff.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch customers list
    const customers = await prisma.barberCustomer.findMany({
      where: { userId: user.id },
      orderBy: { lastVisit: "desc" },
    });

    // 4. Fetch recent cuts history (unlimited for full Excel reports)
    const cutsHistory = await prisma.barberCut.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        staff: true,
      },
    });

    // 5. Calculate statistics
    const totalCuts = await prisma.barberCut.count({ where: { userId: user.id } });
    const newCustomersCount = customers.filter(c => c.cutsCount === 1).length;
    const recurringCustomersCount = customers.filter(c => c.cutsCount > 1).length;

    // Calculate rating averages per staff
    const ratingStats = await prisma.barberCut.groupBy({
      by: ["staffId"],
      where: { userId: user.id, rating: { not: null } },
      _avg: { rating: true },
      _count: { id: true },
    });

    const staffRatingMap = ratingStats.map(stat => {
      const staffMember = staff.find(s => s.id === stat.staffId);
      return {
        staffName: staffMember?.name || "Sin asignar",
        avgRating: stat._avg.rating ? Number(stat._avg.rating).toFixed(1) : "0",
        totalCuts: stat._count.id,
      };
    });

    return NextResponse.json({
      activeCode: activeCodeObj.code,
      staff,
      customers,
      cutsHistory,
      whatsappSender: user.whatsappSender || "",
      settings: {
        barberRequiredCuts: user.barberRequiredCuts,
        barberGoogleMapsUrl: user.barberGoogleMapsUrl || "",
      },
      stats: {
        totalCuts,
        totalCustomers: customers.length,
        newCustomers: newCustomersCount,
        recurringCustomers: recurringCustomersCount,
        staffRatings: staffRatingMap,
      }
    });
  } catch (error) {
    console.error("[Barber API GET Error]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST - Actions like generating a code manually, adding staff or deleting staff
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: auth.userId, hasBarberia: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // Action: Regenerate code manually
    if (action === "regenerateCode") {
      // Invalidate existing codes
      await prisma.barberCode.updateMany({
        where: { userId: user.id, isUsed: false },
        data: { isUsed: true },
      });

      // Create new code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const newCodeObj = await prisma.barberCode.create({
        data: {
          userId: user.id,
          code,
        },
      });

      return NextResponse.json({ success: true, code: newCodeObj.code });
    }

    // Action: Add new staff member
    if (action === "addStaff") {
      const { name } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
      }

      const newStaff = await prisma.barberStaff.create({
        data: {
          userId: user.id,
          name: name.trim(),
        },
      });

      return NextResponse.json({ success: true, staff: newStaff });
    }

    // Action: Toggle Review Link click clicked
    if (action === "toggleReview") {
      const { customerId, hasReviewed } = body;
      await prisma.barberCustomer.update({
        where: { id: customerId },
        data: { hasReviewed: Boolean(hasReviewed) },
      });
      return NextResponse.json({ success: true });
    }

    // Action: Save settings
    if (action === "saveSettings") {
      const { barberRequiredCuts, barberGoogleMapsUrl } = body;
      const cuts = parseInt(barberRequiredCuts);
      if (isNaN(cuts) || cuts < 1) {
        return NextResponse.json({ error: "Número de cortes requerido debe ser al menos 1" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          barberRequiredCuts: cuts,
          barberGoogleMapsUrl: barberGoogleMapsUrl || null,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("[Barber API POST Error]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE - Remove staff member
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json({ error: "ID de estilista requerido" }, { status: 400 });
    }

    await prisma.barberStaff.delete({
      where: { id: staffId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Barber API DELETE Error]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
