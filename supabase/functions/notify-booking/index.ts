// Supabase Edge Function: notify-booking
// Triggered via: POST /functions/v1/notify-booking
// Env vars needed:
//   RESEND_API_KEY — from resend.com
//   STUDIO_EMAIL   — theremnant.ink@gmail.com

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_URL = "https://api.resend.com/emails";
const STUDIO_EMAIL = Deno.env.get("STUDIO_EMAIL") ?? "theremnant.ink@gmail.com";
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";

interface BookingPayload {
  type: "new" | "confirmed" | "cancelled";
  booking: {
    id: string;
    date: string;
    time_slot: string;
    style?: string;
    name?: string;
    phone?: string;
    notes?: string;
  };
  client_email?: string;
}

async function sendMail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) return { error: "No RESEND_API_KEY configured" };
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "REMNANT Studio <noreply@theremnant.ink>", to, subject, html }),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: BookingPayload;
  try { payload = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const { type, booking, client_email } = payload;
  const dateStr = new Date(booking.date + "T00:00").toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
  const results = [];

  // Notify studio
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
  results.push(await sendMail(STUDIO_EMAIL, studioSubjects[type], studioHtml));

  // Notify client if email provided and booking is confirmed
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
    results.push(await sendMail(client_email, `Запись подтверждена — ${dateStr} | REMNANT`, clientHtml));
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
