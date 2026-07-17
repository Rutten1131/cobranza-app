import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { 
  getEvolutionStatus, 
  createEvolutionInstance, 
  getExistingQR, 
  getFreshQR, 
  logoutAndGetFreshQR 
} from "@/lib/evolution";

// GET - Get WhatsApp connection status and QR code
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { evolutionInstance: true, email: true },
    });

    console.log("[WhatsApp API] User:", auth.userId, "Instance Name:", user?.evolutionInstance);

    // If user doesn't have an instance name assigned, create one
    if (!user?.evolutionInstance) {
      const instanceName = `user_${user?.email?.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() || auth.userId}`;
      console.log("[WhatsApp API] Creating new instance:", instanceName);
      const result = await createEvolutionInstance(instanceName);
      
      if (result.success) {
        await prisma.user.update({
          where: { id: auth.userId },
          data: { evolutionInstance: instanceName },
        });
        
        // Generate a fresh QR for the new instance
        const qrResult = await getFreshQR(instanceName);
        return NextResponse.json({
          status: "disconnected",
          qrcode: qrResult.qrcode,
          instanceName,
        });
      } else {
        return NextResponse.json({ status: "error", error: result.error }, { status: 500 });
      }
    }

    const instanceName = user.evolutionInstance;

    // Check current status
    let statusResult = await getEvolutionStatus(instanceName);
    console.log("[WhatsApp API] Status:", statusResult.status);

    // Si la instancia no existe en el servidor (404), la creamos e iniciamos de nuevo
    if (statusResult.is404) {
      console.log("[WhatsApp API] Instance not found on server (404). Re-creating instance...");
      const createRes = await createEvolutionInstance(instanceName);
      if (createRes.success) {
        // Esperamos un segundo
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Generamos un QR fresco
        const qrResult = await getFreshQR(instanceName);
        return NextResponse.json({
          status: "disconnected",
          qrcode: qrResult.qrcode,
          instanceName,
        });
      } else {
        return NextResponse.json({ status: "error", error: createRes.error }, { status: 500 });
      }
    }

    // If connected
    if (statusResult.status === "open" || statusResult.status === "connected") {
      let cleanNumber = "";
      if (statusResult.owner) {
        cleanNumber = statusResult.owner.split("@")[0].replace(/[^\d]/g, "");
      }
      
      // Fallback: if connectionState didn't return owner, use fetchInstances
      if (!cleanNumber) {
        const { getConnectedNumber } = await import("@/lib/evolution");
        const resolved = await getConnectedNumber(instanceName);
        if (resolved) cleanNumber = resolved;
      }

      // Update DB with the connected number and set webhook
      if (cleanNumber) {
        await prisma.user.update({
          where: { id: auth.userId },
          data: { whatsappSender: cleanNumber },
        });
      }

      // Verify webhook is registered on success
      try {
        const { configureEvolutionWebhook } = await import("@/lib/evolution");
        await configureEvolutionWebhook(instanceName);
      } catch (e) {
        console.warn("[WhatsApp API] Failed to configure webhook on check:", e);
      }

      return NextResponse.json({ 
        status: "connected",
        instanceName,
        whatsappSender: cleanNumber || undefined
      });
    }

    // If "connecting" (there is an active QR) -> get it without logout
    if (statusResult.status === "connecting") {
      console.log("[WhatsApp API] Status is connecting, getting existing QR...");
      const qrResult = await getExistingQR(instanceName);
      return NextResponse.json({
        status: "disconnected",
        qrcode: qrResult.qrcode,
        instanceName,
      });
    }

    // If "close" or "disconnected" -> logout and generate fresh QR
    console.log("[WhatsApp API] Instance disconnected or closed, generating fresh QR...");
    const qrResult = await getFreshQR(instanceName);

    return NextResponse.json({
      status: "disconnected",
      qrcode: qrResult.qrcode,
      instanceName,
    });
  } catch (error) {
    console.error("WhatsApp status error:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: String(error) }, { status: 500 });
  }
}

// DELETE - Logout WhatsApp, disconnect from current number and return a new QR immediately
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { evolutionInstance: true },
    });

    if (!user?.evolutionInstance) {
      return NextResponse.json({ error: "No tienes una instancia de WhatsApp" }, { status: 404 });
    }

    const instanceName = user.evolutionInstance;
    console.log("[WhatsApp API] DELETE: Request received - disconnecting/logout and generating new QR");
    
    // Call logout and get fresh QR
    const result = await logoutAndGetFreshQR(instanceName);
    
    console.log("[WhatsApp API] DELETE: Done - success:", result.success, "new QR:", !!result.qrcode);

    return NextResponse.json({ 
      success: result.success,
      status: "disconnected",
      qrcode: result.qrcode,
      instanceName,
    });
  } catch (error) {
    console.error("WhatsApp logout error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
