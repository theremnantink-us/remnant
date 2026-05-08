// Supabase Edge Function: notify-booking
// Env vars: RESEND_API_KEY, STUDIO_EMAIL, VAPID_PRIVATE_KEY
// VAPID_PUBLIC_KEY is hardcoded (public key is safe to expose)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_URL   = "https://api.resend.com/emails";
const STUDIO_EMAIL = Deno.env.get("STUDIO_EMAIL") ?? "theremnant.ink@gmail.com";
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const VAPID_PUB    = "BF4lXfAdjGYADbpyxckwp-lKpv1hGmZOtLcFFjADBQfFOwb6XCUuvnq_5gUSQdaromGehP1HOE5M_74Z_kVedqM";
const VAPID_PRIV   = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUB    = "mailto:theremnant.ink@gmail.com";

interface BookingPayload {
  type: "new" | "confirmed" | "cancelled";
  booking: {
    id: string; date: string; time_slot: string;
    style?: string; name?: string; phone?: string; notes?: string;
  };
  client_email?: string;
  client_user_id?: string;
}

async function sendMail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) return;
  await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "REMNANT Studio <noreply@theremnant.ink>", to, subject, html }),
  });
}

// Minimal VAPID JWT using Deno SubtleCrypto
async function buildVapidJwt(audience: string): Promise<string> {
  if (!VAPID_PRIV) return "";
  try {
    const header = { alg: "ES256", typ: "JWT" };
    const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 3600, sub: VAPID_SUB };
    const b64url = (obj: object) =>
      btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const unsigned = `${b64url(header)}.${b64url(payload)}`;

    const rawPriv = Uint8Array.from(atob(VAPID_PRIV.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "pkcs8",
      (() => {
        // Wrap raw 32-byte EC private key into PKCS8 DER for P-256
        const prefix = new Uint8Array([
          0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,
          0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,0x27,0x30,0x25,0x02,0x01,
          0x01,0x04,0x20
        ]);
        const der = new Uint8Array(prefix.length + 32);
        der.set(prefix);
        der.set(rawPriv, prefix.length);
        return der.buffer;
      })(),
      { name: "ECDSA", namedCurve: "P-256" },
      false, ["sign"]
    );
    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsigned)
    );
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return `${unsigned}.${sigB64}`;
  } catch {
    return "";
  }
}

async function sendPushToUser(supabase: ReturnType<typeof createClient>, userId: string, title: string, body: string, url = "/cabinet") {
  if (!VAPID_PRIV) return;
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return;

  const payload = JSON.stringify({ title, body, url, icon: "/favicon.ico" });
  const dead: string[] = [];

  for (const sub of subs) {
    try {
      const origin = new URL(sub.endpoint).origin;
      const jwt = await buildVapidJwt(origin);
      if (!jwt) continue;
      const res = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Authorization": `vapid t=${jwt},k=${VAPID_PUB}`,
          "TTL": "86400",
        },
        body: new TextEncoder().encode(payload),
      });
      if (res.status === 410 || res.status === 404) dead.push(sub.id);
    } catch { /* network error — skip */ }
  }
  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("id", dead);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: BookingPayload;
  try { payload = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const { type, booking, client_email, client_user_id } = payload;
  const dateStr = new Date(booking.date + "T00:00").toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });

  // Init Supabase service client for push queries
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const studioSubjects = {
    new: `🖤 Новая запись — ${dateStr} ${booking.time_slot}`,
    confirmed: `✅ Запись подтверждена — ${dateStr}`,
    cancelled: `❌ Запись отменена — ${dateStr}`,
  };
  const studioHtml = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0f0f;color:#e8e3dc;border-radius:12px">
      <h2 style="margin:0 0 16px;font-size:1.2rem;letter-spacing:.08em">REMNANT — ${studioSubjects[type]}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <tr><td style="padding:6px 0;color:#6e6660">Дата</td><td>${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:#6e6660">Время</td><td>${booking.time_slot}</td></tr>
        ${booking.style ? `<tr><td style="padding:6px 0;color:#6e6660">Стиль</td><td>${booking.style}</td></tr>` : ""}
        ${booking.name ? `<tr><td style="padding:6px 0;color:#6e6660">Клиент</td><td>${booking.name}</td></tr>` : ""}
        ${booking.phone ? `<tr><td style="padding:6px 0;color:#6e6660">Телефон</td><td>${booking.phone}</td></tr>` : ""}
        ${booking.notes ? `<tr><td style="padding:6px 0;color:#6e6660">Заметки</td><td>${booking.notes}</td></tr>` : ""}
      </table>
      <a href="https://theremnant.ink/admin" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#c4a882;color:#080808;border-radius:6px;text-decoration:none;font-size:.85rem">Открыть панель</a>
    </div>`;

  await sendMail(STUDIO_EMAIL, studioSubjects[type], studioHtml);

  if (client_email && type === "confirmed") {
    const clientHtml = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0f0f;color:#e8e3dc;border-radius:12px">
        <h2 style="margin:0 0 8px;font-size:1.1rem;letter-spacing:.08em">REMNANT Tattoo Studio</h2>
        <p style="margin:0 0 16px;color:#6e6660;font-size:.85rem">Ваша запись подтверждена</p>
        <p style="font-size:1.4rem;font-weight:600">${dateStr}</p>
        <p style="color:#c4a882;font-size:1.1rem">${booking.time_slot}</p>
        ${booking.style ? `<p style="color:#6e6660;font-size:.85rem;margin-top:8px">${booking.style}</p>` : ""}
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:20px 0"/>
        <p style="font-size:.8rem;color:#6e6660">Москва, Афанасьевский переулок 22<br>theremnant.ink@gmail.com</p>
      </div>`;
    await sendMail(client_email, `Запись подтверждена — ${dateStr} | REMNANT`, clientHtml);
  }

  // Send push notifications to client
  if (client_user_id) {
    const pushMessages = {
      new: { title: "Заявка получена", body: `${dateStr} в ${booking.time_slot} — ждём подтверждения` },
      confirmed: { title: "✅ Запись подтверждена", body: `${dateStr} в ${booking.time_slot}` },
      cancelled: { title: "Запись отменена", body: `${dateStr} в ${booking.time_slot}` },
    };
    const msg = pushMessages[type];
    await sendPushToUser(supabase, client_user_id, msg.title, msg.body);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
