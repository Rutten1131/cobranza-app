// Evolution API integration helper
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://178.238.238.158:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

// Configure webhook for an instance automatically
export async function configureEvolutionWebhook(instanceName: string): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = "https://cobranza-app-ochre.vercel.app/api/whatsapp/webhook";
  console.log(`[Evolution] Setting webhook for ${instanceName} to ${webhookUrl}`);
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: [
          "MESSAGES_UPSERT"
        ]
      }),
    });

    const text = await response.text();
    console.log("[Evolution] Set webhook response:", response.status, text.substring(0, 300));
    return { success: response.ok };
  } catch (error) {
    console.error("[Evolution] Error setting webhook:", error);
    return { success: false, error: String(error) };
  }
}

// Create a new Evolution API instance for a user
export async function createEvolutionInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
  console.log("[Evolution] Creating instance:", instanceName);
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const text = await response.text();
    console.log("[Evolution] Create response:", response.status, text.substring(0, 300));

    if (!response.ok) {
      if (response.status === 409) {
        console.log("[Evolution] Instance already exists, treating as success");
        // Ensure webhook is always configured even if instance already existed
        await configureEvolutionWebhook(instanceName);
        return { success: true };
      }
      console.error("[Evolution] API error creating instance:", text);
      return { success: false, error: text };
    }

    // Configure the webhook automatically for the new instance
    await configureEvolutionWebhook(instanceName);
    return { success: true };
  } catch (error) {
    console.error("[Evolution] Error creating instance:", error);
    return { success: false, error: String(error) };
  }
}

// Get connection status
export async function getEvolutionStatus(instanceName: string): Promise<{ status: string; owner?: string | null; is404?: boolean; error?: string }> {
  console.log("[Evolution] Getting status for:", instanceName);
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    const text = await response.text();
    console.log("[Evolution] Status response:", response.status, text.substring(0, 300));

    if (response.status === 404) {
      return { status: "error", is404: true };
    }

    if (!response.ok) {
      return { status: "error" };
    }

    const data = JSON.parse(text);
    const state = data.state || data.instance?.state || "unknown";
    const owner = data.owner || data.instance?.owner || null;
    console.log("[Evolution] Parsed state:", state, "owner:", owner);
    return { status: state, owner };
  } catch (error) {
    console.error("[Evolution] Error getting status:", error);
    return { status: "error", error: String(error) };
  }
}

// Get the connected phone number for an instance by querying fetchInstances
export async function getConnectedNumber(instanceName: string): Promise<string | null> {
  console.log("[Evolution] Getting connected number for:", instanceName);
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    const text = await response.text();
    console.log("[Evolution] fetchInstances response:", response.status, text.substring(0, 500));

    if (!response.ok) return null;

    const data = JSON.parse(text);
    // Response can be an array or single object
    const instance = Array.isArray(data) ? data[0] : data;
    
    // Try multiple known paths for the owner/number
    const ownerRaw = instance?.instance?.owner 
      || instance?.owner 
      || instance?.instance?.ownerJid
      || instance?.ownerJid
      || instance?.instance?.wuid
      || instance?.wuid
      || null;

    if (!ownerRaw) {
      console.log("[Evolution] No owner found in fetchInstances response");
      return null;
    }

    // Clean: "51912345678@s.whatsapp.net" -> "51912345678"
    const cleanNumber = String(ownerRaw).split("@")[0].replace(/[^\d]/g, "");
    console.log("[Evolution] Extracted connected number:", cleanNumber);
    return cleanNumber || null;
  } catch (error) {
    console.error("[Evolution] Error getting connected number:", error);
    return null;
  }
}

// Extract QR from connect response data
function extractQRFromData(data: Record<string, any>): string | null {
  const qrcode = data.qrcode;
  if (qrcode?.code && typeof qrcode.code === "string") {
    const code = qrcode.code;
    if (code.startsWith("data:")) return code;
    if (code.length > 100) return `data:image/png;base64,${code}`;
    return code;
  }

  if (qrcode?.base64 && typeof qrcode.base64 === "string") {
    const b64 = qrcode.base64;
    return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
  }

  if (data.base64 && typeof data.base64 === "string") {
    const b64 = data.base64;
    return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
  }

  return null;
}

// Get QR when instance is in "connecting" state (QR already active — NO logout)
export async function getExistingQR(instanceName: string): Promise<{ qrcode: string | null; error?: string }> {
  console.log("[Evolution] Getting existing QR (no logout) for:", instanceName);
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    const text = await response.text();
    console.log("[Evolution] Existing QR response:", response.status, text.substring(0, 400));

    if (!response.ok) {
      return { qrcode: null, error: `${response.status}: ${text}` };
    }

    const data = JSON.parse(text);
    const qrcode = extractQRFromData(data);

    if (qrcode) {
      console.log("[Evolution] QR extracted successfully");
    } else {
      console.log("[Evolution] No QR found in response");
    }

    return { qrcode };
  } catch (error) {
    console.error("[Evolution] Error getting existing QR:", error);
    return { qrcode: null, error: String(error) };
  }
}

// Get fresh QR for a disconnected instance (logout first, then connect)
export async function getFreshQR(instanceName: string): Promise<{ qrcode: string | null; error?: string }> {
  console.log("[Evolution] Getting fresh QR (with logout) for:", instanceName);
  try {
    // Step 1: Logout to clear any stale session
    console.log("[Evolution] Logging out instance...");
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    // Step 2: Wait for Evolution to reset
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Step 3: Connect to generate new QR
    console.log("[Evolution] Calling connect to generate QR...");
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    const text = await response.text();
    console.log("[Evolution] Fresh QR response:", response.status, text.substring(0, 400));

    if (!response.ok) {
      return { qrcode: null, error: `${response.status}: ${text}` };
    }

    const data = JSON.parse(text);
    const qrcode = extractQRFromData(data);

    return { qrcode };
  } catch (error) {
    console.error("[Evolution] Error getting fresh QR:", error);
    return { qrcode: null, error: String(error) };
  }
}

// Delete and recreate the instance completely to guarantee logout and new QR (100% stable)
export async function logoutAndGetFreshQR(instanceName: string): Promise<{ success: boolean; qrcode: string | null; error?: string }> {
  console.log("[Evolution] Hard reset (delete & recreate) for:", instanceName);
  try {
    // 1. Delete instance
    console.log("[Evolution] Deleting instance...");
    await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    // 2. Wait
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 3. Create instance
    console.log("[Evolution] Re-creating instance...");
    const createRes = await createEvolutionInstance(instanceName);
    if (!createRes.success) {
      return { success: false, qrcode: null, error: createRes.error };
    }

    // 4. Wait
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 5. Connect to get fresh QR
    console.log("[Evolution] Getting QR for new instance...");
    const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    const text = await connectRes.text();
    if (!connectRes.ok) {
      return { success: true, qrcode: null, error: `Could not connect: ${connectRes.status}` };
    }

    const data = JSON.parse(text);
    const qrcode = extractQRFromData(data);

    return { success: true, qrcode };
  } catch (error) {
    console.error("[Evolution] Error in hard reset:", error);
    return { success: false, qrcode: null, error: String(error) };
  }
}

// Delete instance completely
export async function deleteEvolutionInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    return { success: response.ok };
  } catch (error) {
    console.error("[Evolution] Error deleting instance:", error);
    return { success: false, error: String(error) };
  }
}

// Send a WhatsApp text message via Evolution API
export async function sendWhatsAppMessage(
  instanceName: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  // Clean the phone number: remove + and spaces, keep only digits
  const cleanPhone = phone.replace(/[^\d]/g, "");
  console.log(`[Evolution] Sending message to ${cleanPhone} via instance ${instanceName}`);

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    const text = await response.text();
    console.log("[Evolution] Send message response:", response.status, text.substring(0, 300));

    if (!response.ok) {
      console.error("[Evolution] Failed to send message:", text);
      return { success: false, error: `${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[Evolution] Error sending message:", error);
    return { success: false, error: String(error) };
  }
}
