// Supabase Edge Function: notify-booking
// Відправляє сповіщення в Telegram та на Email при створенні нової заявки

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface BookingPayload {
  record: {
    id: string;
    name: string;
    phone: string;
    service_name: string;
    booking_date: string;
    booking_time: string;
    note?: string;
    created_at: string;
  };
}

serve(async (req) => {
  try {
    const payload: BookingPayload = await req.json();
    const b = payload.record;

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

    // 1. Формуємо текст для Telegram
    const message = `🔔 *НОВА ЗАЯВКА НА СТО ЕВАКУАТОР!*\n\n` +
      `👤 *Клієнт:* ${b.name}\n` +
      `📞 *Телефон:* [${b.phone}](tel:${b.phone})\n` +
      `🔧 *Послуга:* ${b.service_name}\n` +
      `📅 *Дата:* ${b.booking_date}\n` +
      `⏰ *Час:* ${b.booking_time}\n` +
      (b.note ? `📝 *Коментар:* ${b.note}\n` : ``) +
      `\n🌐 _Створено через сайт СТО_`;

    // 2. Відправка в Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      });
    }

    // 3. Відправка Email (через Resend), якщо ключ задано
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "СТО Евакуатор <onboarding@resend.dev>",
          to: [ADMIN_EMAIL],
          subject: `Нова заявка на СТО від ${b.name} (${b.booking_date} ${b.booking_time})`,
          html: `
            <h2>Новий запис на сервіс!</h2>
            <p><strong>Клієнт:</strong> ${b.name}</p>
            <p><strong>Телефон:</strong> <a href="tel:${b.phone}">${b.phone}</a></p>
            <p><strong>Послуга:</strong> ${b.service_name}</p>
            <p><strong>Дата та час:</strong> ${b.booking_date} о ${b.booking_time}</p>
            ${b.note ? `<p><strong>Коментар:</strong> ${b.note}</p>` : ''}
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
