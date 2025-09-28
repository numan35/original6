// lib/jasonBrain.ts — adds optional device location slots before calling Jason Brain
import Constants from "expo-constants";

type ChatMessage = { role: "user" | "assistant" | "system" | "tool"; content: string; name?: string };
export type JasonResponse = {
  ok: boolean;
  build?: string;
  requestId?: string;
  message?: { role: string; content?: string; annotations?: any[] } | null;
  messagesDelta?: any[];
  annotations?: any[];
  slots?: Record<string, any>;
  next_action?: string | null;
  toolRequests?: any[];
  error?: string;
};

type CallOpts = { requestId?: string; dryRun?: boolean };

async function maybeGetDeviceLocation() {
  try {
    // Dynamic import to avoid hard dependency during web/server builds
    // @ts-ignore
    const Location = await import("expo-location");
    // @ts-ignore
    const RN = await import("react-native");
    const Platform = (RN as any).Platform;

    const perm = await (Location as any).requestForegroundPermissionsAsync?.();
    if (!perm || perm.status !== "granted") return null;

    // Start with the freshest single reading at the highest accuracy allowed.
    let pos = await (Location as any).getCurrentPositionAsync?.({
      accuracy: (Location as any).Accuracy?.Highest ?? (Location as any).Accuracy?.High,
      maximumAge: 5000,
      mayShowUserSettingsDialog: true,
      timeout: 12000,
    });

    // On mobile, quickly watch for up to ~4s and keep the best (lowest accuracy value in meters).
    // This dramatically reduces "off by many miles" when the first fix is coarse (e.g., cell/Wi‑Fi).
    try {
      if (Platform?.OS === "ios" || Platform?.OS === "android") {
        const start = Date.now();
        let best = pos;
        let bestAcc = best?.coords?.accuracy ?? Number.POSITIVE_INFINITY;

        const sub = await (Location as any).watchPositionAsync?.(
          {
            accuracy: (Location as any).Accuracy?.Highest ?? (Location as any).Accuracy?.High,
            timeInterval: 1000,
            distanceInterval: 0,
            mayShowUserSettingsDialog: true,
          },
          (p: any) => {
            const a = p?.coords?.accuracy ?? Number.POSITIVE_INFINITY;
            if (a < bestAcc) {
              best = p;
              bestAcc = a;
            }
          }
        );

        // Wait up to 4 seconds for a better fix
        while (Date.now() - start < 4000) {
          await new Promise((r) => setTimeout(r, 250));
        }
        await sub?.remove?.();
        if (best && (bestAcc < (pos?.coords?.accuracy ?? Number.POSITIVE_INFINITY))) {
          pos = best;
        }
      }
    } catch {}

    if (!pos?.coords) return null;
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    let city_from_device: string | undefined = undefined;
    try {
      const arr = await (Location as any).reverseGeocodeAsync?.({ latitude: lat, longitude: lng });
      const place = Array.isArray(arr) ? arr[0] : null;
      city_from_device = place?.city || place?.subregion || place?.region || place?.name || undefined;
    } catch {}

    return {
      lat: String(lat),
      lng: String(lng),
      city_from_device,
      location_accuracy: pos.coords.accuracy ?? null,
    };
  } catch {
    return null;
  }
}

export async function callJasonBrain(
  messages: ChatMessage[],
  slots: Record<string, any> = {},
  opts: CallOpts = {}
): Promise<JasonResponse> {
  const extra: any = (Constants as any).expoConfig?.extra ?? {};
  const FUNCTIONS_BASE: string = extra.supabaseFunctionsBase || extra.functionsBase || "https://lkoogdveljyxwweranaf.functions.supabase.co";
  const ANON: string = extra.supabaseAnonKey || extra.supabaseAnon || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb29nZHZlbGp5eHd3ZXJhbmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjQ1MDEsImV4cCI6MjA3MjU0MDUwMX0.gER6-spRheuIzCe_ET-ntaklbRQHkmGb75I3UJkFYKs";

  // Only attempt device location if caller hasn't provided lat/lng already
  let mergedSlots: Record<string, any> = { ...(slots || {}) };
  if (mergedSlots.lat == null || mergedSlots.lng == null) {
    const loc = await maybeGetDeviceLocation();
    if (loc) {
      // don't overwrite explicit caller-provided values
      if (mergedSlots.lat == null) mergedSlots.lat = loc.lat;
      if (mergedSlots.lng == null) mergedSlots.lng = loc.lng;
      if (mergedSlots.city_from_device == null && loc.city_from_device) mergedSlots.city_from_device = loc.city_from_device;
      if (mergedSlots.location_accuracy == null && loc.location_accuracy != null) mergedSlots.location_accuracy = loc.location_accuracy;
    }
  }

  const body = { messages, slots: mergedSlots, requestId: opts.requestId };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "authorization": `Bearer ${ANON}`,
    "apikey": ANON,
  };
  if (opts.dryRun) headers["x-dry-run"] = "1";

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/jason-brain`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    return { ok: false, error: `Network error calling jason-brain: ${String(e?.message ?? e)}` };
  }

  const text = await res.text();
  let json: JasonResponse;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: `Bad JSON from jason-brain (${res.status})` };
  }

  if (json?.message && !json.message.annotations && json.annotations) {
    json.message.annotations = json.annotations;
  }
  return json;
}

export default callJasonBrain;

export {};
