// Supabase Edge Function: notify-booking
// Відправляє сповіщення в Telegram та на Email (через Resend) при створенні або зміні статусу заявки

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface BookingRecord {
  id: string;
  name: string;
  phone: string;
  service_name?: string;
  service?: string;
  booking_date: string;
  booking_time: string;
  status: string;
  note?: string;
  created_at?: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: BookingRecord;
  old_record?: BookingRecord;
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const b = payload.record;
    const old = payload.old_record;
    const eventType = payload.type;

    if (!b) {
      return new Response(JSON.stringify({ message: "No record found" }), { status: 400 });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

    // Витягуємо пошту клієнта з поля note, якщо є
    let custEmail: string | null = null;
    if (b.note && /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(b.note)) {
      const match = b.note.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (match) custEmail = match[0];
    }

    const serviceName = b.service_name || b.service || "Обслуговування авто";

    // Хелпер відправки Telegram
    const sendTelegram = async (text: string) => {
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text,
              parse_mode: "Markdown",
            }),
          });
        } catch (_) {}
      }
    };

    // Хелпер відправки Email
    const sendEmail = async (to: string, subject: string, html: string) => {
      if (RESEND_API_KEY && to) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "СТО Евакуатор <onboarding@resend.dev>",
              to: [to],
              subject,
              html,
            }),
          });
        } catch (_) {}
      }
    };

    // -------------------------------------------------------------
    // 1. НОВА ЗАЯВКА (INSERT)
    // -------------------------------------------------------------
    if (eventType === "INSERT") {
      const tgMsg = `🔔 *НОВА ЗАЯВКА НА СТО ЕВАКУАТОР!*\n\n` +
        `👤 *Клієнт:* ${b.name}\n` +
        `📞 *Телефон:* [${b.phone}](tel:${b.phone})\n` +
        `🔧 *Послуга:* ${serviceName}\n` +
        `📅 *Дата:* ${b.booking_date}\n` +
        `⏰ *Час:* ${b.booking_time}\n` +
        (b.note ? `📝 *Коментар:* ${b.note}\n` : ``) +
        `\n🌐 _Створено через сайт СТО_`;

      await sendTelegram(tgMsg);

      if (ADMIN_EMAIL) {
        await sendEmail(
          ADMIN_EMAIL,
          `🚗 Новий запис на СТО: ${b.name} (${b.booking_date} ${b.booking_time})`,
          `<div style="font-family:sans-serif;color:#18361b;">
            <h2>Новий онлайн-запис на сервіс!</h2>
            <p><strong>Клієнт:</strong> ${b.name}</p>
            <p><strong>Телефон:</strong> <a href="tel:${b.phone}">${b.phone}</a></p>
            <p><strong>Послуга:</strong> ${serviceName}</p>
            <p><strong>Дата та час:</strong> 📅 ${b.booking_date} о ${b.booking_time}</p>
            ${b.note ? `<p><strong>Примітка:</strong> ${b.note}</p>` : ""}
            <p><a href="https://kaiangeelll.github.io/sto-yabluneve/?action=admin" style="background:#1b6321;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:10px;">Відкрити в кабінеті СТО →</a></p>
          </div>`
        );
      }

      if (custEmail) {
        await sendEmail(
          custEmail,
          `🕒 Вашу заявку на СТО Евакуатор прийнято в обробку!`,
          `<div style="font-family:sans-serif;color:#18361b;">
            <h2>Вашу заявку прийнято в обробку!</h2>
            <p>Шановний(а) <strong>${b.name}</strong>, дякуємо за запис. Майстер невдовзі підтвердить ваш візит або зателефонує.</p>
            <p>🔧 <b>Послуга:</b> ${serviceName}<br>📅 <b>Бажаний час:</b> ${b.booking_date} о ${b.booking_time}<br>📍 <b>Адреса:</b> вул. Яблунева, 20, Нове</p>
          </div>`
        );
      }
    }

    // -------------------------------------------------------------
    // 2. ОНОВЛЕННЯ СТАТУСУ (UPDATE)
    // -------------------------------------------------------------
    if (eventType === "UPDATE") {
      // 2.1 Клієнт запросив перенесення часу
      if (b.status === "reschedule_requested") {
        let reschedDate = "";
        let reschedReason = "";
        if (b.note) {
          const mDate = b.note.match(/\[ПЕРЕНЕСЕННЯ:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
          if (mDate) reschedDate = mDate[1];
          const mReason = b.note.match(/Причина:\s*([^\]]+)/);
          if (mReason) reschedReason = mReason[1].trim();
        }

        await sendTelegram(
          `⏳ *ЗАПИТ НА ПЕРЕНЕСЕННЯ ЧАСУ!*\n\n` +
          `👤 *Клієнт:* ${b.name} (${b.phone})\n` +
          `📅 *Поточний час:* ${b.booking_date} о ${b.booking_time}\n` +
          `➡️ *Просить новий час:* ${reschedDate || "вказано у картці"}\n` +
          (reschedReason ? `📝 *Причина:* ${reschedReason}\n` : ``)
        );

        if (ADMIN_EMAIL) {
          await sendEmail(
            ADMIN_EMAIL,
            `⏳ Клієнт ${b.name} просить перенести час візиту на СТО!`,
            `<div style="font-family:sans-serif;color:#18361b;">
              <h2 style="color:#b45309;">⚠️ Клієнт просить перенести запис!</h2>
              <p><strong>Клієнт:</strong> ${b.name} (<a href="tel:${b.phone}">${b.phone}</a>)</p>
              <p>📅 <strong>Поточний час:</strong> ${b.booking_date} о ${b.booking_time}</p>
              <p>➡️ <strong>Бажаний новий час:</strong> <b style="color:#1b6321;">${reschedDate}</b></p>
              ${reschedReason ? `<p><strong>Причина:</strong> ${reschedReason}</p>` : ""}
              <p><a href="https://kaiangeelll.github.io/sto-yabluneve/?action=admin" style="background:#1b6321;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;display:inline-block;">Перейти до погодження в кабінет →</a></p>
            </div>`
          );
        }
      }

      // 2.2 Підтверджено новий час візиту (після переносу)
      else if ((b.status === "confirmed" || b.status === "accepted") && old && (old.booking_date !== b.booking_date || old.booking_time !== b.booking_time)) {
        if (custEmail) {
          await sendEmail(
            custEmail,
            `✅ Ваш візит на СТО перенесено на новий час: ${b.booking_date} о ${b.booking_time}`,
            `<div style="font-family:sans-serif;color:#18361b;">
              <h2 style="color:#16a34a;">✅ Перенесення успішно підтверджено!</h2>
              <p>Шановний(а) <strong>${b.name}</strong>, чекаємо на вас у новий погоджений час:</p>
              <p>📅 <b>Нова дата:</b> ${b.booking_date} о ${b.booking_time}<br>🔧 <b>Послуга:</b> ${serviceName}<br>📍 <b>Адреса:</b> вул. Яблунева, 20, Нове</p>
            </div>`
          );
        }
      }

      // 2.3 Звичайне підтвердження заявки
      else if ((b.status === "confirmed" || b.status === "accepted") && old && old.status !== b.status) {
        if (custEmail) {
          await sendEmail(
            custEmail,
            `🟢 Вашу заявку на СТО Евакуатор підтверджено!`,
            `<div style="font-family:sans-serif;color:#18361b;">
              <h2 style="color:#16a34a;">🟢 Запис підтверджено майстром!</h2>
              <p>Шановний(а) <strong>${b.name}</strong>, чекаємо на вас:</p>
              <p>📅 <b>Дата:</b> ${b.booking_date} о ${b.booking_time}<br>🔧 <b>Послуга:</b> ${serviceName}<br>📍 <b>Адреса:</b> вул. Яблунева, 20, Нове</p>
            </div>`
          );
        }
      }

      // 2.4 Майстер запропонував інший час / коментар щодо переносу
      else if (b.status === "reschedule_rejected") {
        let proposal = "";
        if (b.note) {
          const m = b.note.match(/\[ВІДПОВІДЬ_СТО:\s*([^\]]+)\]/);
          if (m) proposal = m[1].trim();
        }

        if (custEmail) {
          await sendEmail(
            custEmail,
            `⚠️ Щодо перенесення запису на СТО Евакуатор`,
            `<div style="font-family:sans-serif;color:#18361b;">
              <h2 style="color:#c2410c;">⚠️ Відповідь майстра СТО щодо перенесення</h2>
              <p>Шановний(а) <strong>${b.name}</strong>, майстер залишив відповідь:</p>
              <p style="background:#fff7ed;padding:12px;border-left:4px solid #f97316;"><b>«${proposal || "На цей час не виходить, оберіть інший час."}»</b></p>
              <p>Поточний час залишається: <b>${b.booking_date} о ${b.booking_time}</b>.</p>
              <p>Ви можете відкрити особистий кабінет на сайті, щоб обрати інший вільний день.</p>
            </div>`
          );
        }
      }

      // 2.5 Скасовано або відхилено майстром
      else if (b.status === "rejected" && old && old.status !== b.status) {
        let reason = "";
        if (b.note && b.note.includes("Відхилено: ")) {
          reason = b.note.split("Відхилено: ")[1];
        }

        if (custEmail) {
          await sendEmail(
            custEmail,
            `Звернення щодо запису на СТО Евакуатор`,
            `<div style="font-family:sans-serif;color:#18361b;">
              <h2 style="color:#b91c1c;">Звернення щодо запису</h2>
              <p>Шановний(а) <strong>${b.name}</strong>, на жаль, майстер не зможе прийняти авто на ${b.booking_date} о ${b.booking_time}.</p>
              ${reason ? `<p><strong>Причина:</strong> ${reason}</p>` : ""}
              <p>Будь ласка, оберіть інший час на сайті або зателефонуйте нам: <a href="tel:+380680679909">+380 68 067 9909</a>.</p>
            </div>`
          );
        }
      }

      // 2.6 Скасовано клієнтом
      else if (b.status === "cancelled" && old && old.status !== b.status) {
        await sendTelegram(
          `🚫 *КЛІЄНТ СКАСУВАВ ЗАПИС!*\n\n` +
          `👤 *Клієнт:* ${b.name} (${b.phone})\n` +
          `📅 *Час:* ${b.booking_date} о ${b.booking_time}\n` +
          `🔧 *Послуга:* ${serviceName}\n` +
          `\n_Час візиту звільнено на сайті._`
        );

        if (ADMIN_EMAIL) {
          await sendEmail(
            ADMIN_EMAIL,
            `🚫 Клієнт ${b.name} скасував запис на ${b.booking_date} ${b.booking_time}`,
            `<div style="font-family:sans-serif;color:#18361b;">
              <h2>🚫 Запис скасовано клієнтом</h2>
              <p>Клієнт <strong>${b.name}</strong> (<a href="tel:${b.phone}">${b.phone}</a>) скасував запис на <b>${serviceName}</b>.</p>
              <p>📅 <b>Скасований час:</b> ${b.booking_date} о ${b.booking_time}</p>
              <p style="color:#16a34a;">Слот звільнено і він доступний для інших клієнтів.</p>
            </div>`
          );
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
