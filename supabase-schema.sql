-- ============================================================
-- СХЕМА, ТРИГЕРИ ТА EMAIL-ПОВІДОМЛЕННЯ ДЛЯ СТО ЕВАКУАТОР
-- (SUPABASE POSTGRES + PG_NET + RESEND EMAIL NOTIFICATIONS)
-- ============================================================

-- Вмикаємо розширення для мережевих HTTP-запитів
create extension if not exists pg_net with schema extensions;

-- ============================================================
-- 1. ТРИГЕР НА СТВОРЕННЯ ЗАЯВКИ (INSERT)
--    - Повідомлення адміністратору про новий запис
--    - Підтвердження клієнту про прийняття заявки в обробку
-- ============================================================
create or replace function public.notify_booking_created()
returns trigger as $$
declare
  resend_key text := 'YOUR_RESEND_API_KEY'; -- Ключ із resend.com
  admin_email text := 'YOUR_ADMIN_EMAIL';    -- Email адміністратора СТО
  cust_email text := null;
  site_url text := 'https://kaiangeelll.github.io/sto-kyiv/?action=admin';
  admin_html text;
  cust_html text;
begin
  -- Витягуємо пошту клієнта з поля note
  if NEW.note ~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' then
    cust_email := substring(NEW.note from '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})');
  end if;

  -- 1. Лист адміністратору СТО
  admin_html := '<div style="background-color:#f6f8f4;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#18361b;">' ||
    '<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe7db;box-shadow:0 8px 24px rgba(0,0,0,0.06);">' ||
      '<tr>' ||
        '<td style="background-color:#132617;padding:26px 30px;color:#ffffff;">' ||
          '<span style="background:#d6ff4a;color:#132617;font-weight:800;font-size:12px;padding:4px 8px;border-radius:6px;display:inline-block;letter-spacing:0.5px;margin-bottom:8px;">СТО ЕВАКУАТОР</span>' ||
          '<h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:800;">Нова онлайн-заявка на сервіс!</h1>' ||
          '<p style="margin:4px 0 0;font-size:13px;color:#9eb8a1;">вул. Яблунева, 20, Нове · Київська область</p>' ||
        '</td>' ||
      '</tr>' ||
      '<tr>' ||
        '<td style="padding:28px 30px;">' ||
          '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;">' ||
            '<tr><td style="padding:8px 0;font-size:14px;color:#5a6e5d;width:120px;">Клієнт:</td><td style="padding:8px 0;font-size:15px;font-weight:700;color:#102213;">' || NEW.name || '</td></tr>' ||
            '<tr><td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Телефон:</td><td style="padding:8px 0;font-size:16px;font-weight:800;"><a href="tel:' || NEW.phone || '" style="color:#256528;text-decoration:none;">' || NEW.phone || '</a></td></tr>' ||
            '<tr><td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Послуга:</td><td style="padding:8px 0;font-size:15px;font-weight:700;color:#1b4c1f;">' || NEW.service_name || '</td></tr>' ||
            '<tr><td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Дата та час:</td><td style="padding:8px 0;font-size:15px;font-weight:700;color:#102213;">📅 ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</td></tr>' ||
            coalesce('<tr><td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Примітка:</td><td style="padding:8px 0;font-size:14px;color:#334435;">' || NEW.note || '</td></tr>', '') ||
          '</table>' ||
          '<div style="text-align:center;padding-top:16px;border-top:1px solid #eef3ee;">' ||
            '<a href="' || site_url || '" style="background:#d6ff4a;color:#102613;display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;text-decoration:none;border-radius:14px;box-shadow:0 4px 14px rgba(214,255,74,0.4);">' ||
              'Відкрити заявку в кабінеті СТО →' ||
            '</a>' ||
            '<p style="margin:12px 0 0;font-size:12px;color:#7a8d7d;">Клікніть, щоб прийняти або звʼязатися з клієнтом.</p>' ||
          '</div>' ||
        '</td>' ||
      '</tr>' ||
    '</table>' ||
  '</div>';

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
    body := json_build_object(
      'from', 'СТО Евакуатор <onboarding@resend.dev>',
      'to', json_build_array(admin_email),
      'subject', '🚗 Новий запис на СТО: ' || NEW.name || ' (' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' ' || NEW.booking_time || ')',
      'html', admin_html
    )::jsonb
  );

  -- 2. Лист клієнту (підтвердження отримання)
  if cust_email is not null then
    cust_html := '<div style="background:#f6f8f4;padding:32px 16px;font-family:sans-serif;color:#18361b;">' ||
      '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #dce8dc;box-shadow:0 6px 20px rgba(0,0,0,0.05);">' ||
        '<span style="background:#d6ff4a;color:#132617;font-weight:800;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;">СТО ЕВАКУАТОР</span>' ||
        '<h2 style="color:#1b6321;margin:10px 0 6px;">🕒 Вашу заявку прийнято в обробку!</h2>' ||
        '<p>Шановний(а) <strong>' || NEW.name || '</strong>, дякуємо за запис на автосервіс. Майстер невдовзі підтвердить ваш візит або зателефонує для уточнення деталей.</p>' ||
        '<div style="background:#eef7ed;border-radius:12px;padding:16px;margin:16px 0;">' ||
          '<p style="margin:4px 0;">🔧 <b>Послуга:</b> ' || NEW.service_name || '</p>' ||
          '<p style="margin:4px 0;">📅 <b>Бажаний час:</b> ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</p>' ||
          '<p style="margin:4px 0;">📍 <b>Адреса СТО:</b> вул. Яблунева, 20, Нове, Київська область</p>' ||
        '</div>' ||
        '<p style="font-size:13px;color:#5a6e5d;margin:0;">Телефон для довідок: <a href="tel:+380680679909" style="color:#256528;font-weight:700;">+380 68 067 9909</a></p>' ||
      '</div>' ||
    '</div>';

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
      body := json_build_object(
        'from', 'СТО Евакуатор <onboarding@resend.dev>',
        'to', json_build_array(cust_email),
        'subject', '🕒 Вашу заявку на СТО Евакуатор прийнято в обробку!',
        'html', cust_html
      )::jsonb
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_created_email on public.bookings;
create trigger on_booking_created_email
  after insert on public.bookings
  for each row execute function public.notify_booking_created();


-- ============================================================
-- 2. ТРИГЕР НА ОНОВЛЕННЯ ЗАЯВКИ (UPDATE)
--    - Запит на перенесення від клієнта (повідомлення адміну)
--    - Погодження нового часу майстром (повідомлення клієнту)
--    - Звичайне підтвердження заявки (повідомлення клієнту)
--    - Відхилення перенесення / пропозиція іншого часу (повідомлення клієнту)
--    - Відхилення / скасування заявки майстром (повідомлення клієнту)
--    - Скасування заявки клієнтом (повідомлення адміну)
-- ============================================================
create or replace function public.notify_booking_status_change()
returns trigger as $$
declare
  resend_key text := 'YOUR_RESEND_API_KEY';
  admin_email text := 'YOUR_ADMIN_EMAIL';
  site_url text := 'https://kaiangeelll.github.io/sto-kyiv/?action=admin';
  cust_email text := null;
  resched_target text := '';
  resched_reason text := '';
  admin_proposal text := '';
  email_subject text;
  email_content text;
begin
  -- Витягуємо email клієнта з поля note
  if NEW.note ~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' then
    cust_email := substring(NEW.note from '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})');
  end if;

  -- Витягуємо запитаний новий час переносу, якщо є
  if NEW.note ~* '\[ПЕРЕНЕСЕННЯ:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})' then
    resched_target := substring(NEW.note from '\[ПЕРЕНЕСЕННЯ:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})');
  end if;
  if NEW.note ~* 'Причина:\s*([^\]]+)' then
    resched_reason := substring(NEW.note from 'Причина:\s*([^\]]+)');
  end if;

  -- Витягуємо пропозицію майстра СТО, якщо є
  if NEW.note ~* '\[ВІДПОВІДЬ_СТО:\s*([^\]]+)\]' then
    admin_proposal := substring(NEW.note from '\[ВІДПОВІДЬ_СТО:\s*([^\]]+)\]');
  end if;

  -- -----------------------------------------------------------
  -- СЦЕНАРІЙ 1: КЛІЄНТ ПОДАВ ЗАПИТ НА ПЕРЕНЕСЕННЯ ЧАСУ
  -- Повідомляємо адміністратора
  -- -----------------------------------------------------------
  if NEW.status = 'reschedule_requested' and (OLD.status is distinct from NEW.status or OLD.note is distinct from NEW.note) then
    email_subject := '⏳ Клієнт ' || NEW.name || ' просить перенести час візиту на СТО!';
    email_content := '<div style="background:#f6f8f4;padding:32px 16px;font-family:sans-serif;color:#18361b;">' ||
      '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #fcd34d;box-shadow:0 6px 20px rgba(0,0,0,0.06);">' ||
        '<span style="background:#fef3c7;color:#92400e;font-weight:800;font-size:12px;padding:4px 8px;border-radius:6px;display:inline-block;">ЗАПИТ НА ПЕРЕНЕСЕННЯ</span>' ||
        '<h2 style="color:#b45309;margin:10px 0 6px;">⚠️ Клієнт просить перенести час візиту!</h2>' ||
        '<p>Клієнт <strong>' || NEW.name || '</strong> (тел: <a href="tel:' || NEW.phone || '">' || NEW.phone || '</a>) просить перенести запис:</p>' ||
        '<div style="background:#fffbe6;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #f59e0b;">' ||
          '<p style="margin:4px 0;">📅 <b>Поточний час:</b> ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</p>' ||
          '<p style="margin:4px 0;">➡️ <b>Бажаний новий час:</b> <strong style="color:#1b6321;font-size:15px;">' || coalesce(nullif(resched_target, ''), 'вказано у картці') || '</strong></p>' ||
          coalesce('<p style="margin:4px 0;font-size:13px;color:#78350f;">Причина: ' || nullif(resched_reason, '') || '</p>', '') ||
        '</div>' ||
        '<div style="text-align:center;padding-top:14px;">' ||
          '<a href="' || site_url || '" style="background:#1b6321;color:#ffffff;display:inline-block;padding:12px 26px;font-size:14px;font-weight:800;text-decoration:none;border-radius:12px;">' ||
            'Відкрити в кабінеті (Підтвердити / Запропонувати інший час) →' ||
          '</a>' ||
        '</div>' ||
      '</div>' ||
    '</div>';

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
      body := json_build_object(
        'from', 'СТО Евакуатор <onboarding@resend.dev>',
        'to', json_build_array(admin_email),
        'subject', email_subject,
        'html', email_content
      )::jsonb
    );

  -- -----------------------------------------------------------
  -- СЦЕНАРІЙ 2: АДМІНІСТРАТОР ПІДТВЕРДИВ ПЕРЕНЕСЕННЯ НА НОВИЙ ЧАС
  -- Повідомляємо клієнта
  -- -----------------------------------------------------------
  elsif (NEW.status = 'confirmed' or NEW.status = 'accepted') and
        (OLD.booking_date is distinct from NEW.booking_date or OLD.booking_time is distinct from NEW.booking_time) then
    if cust_email is not null then
      email_subject := '✅ Ваш візит на СТО перенесено на новий час: ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time;
      email_content := '<div style="background:#f6f8f4;padding:32px 16px;font-family:sans-serif;color:#18361b;">' ||
        '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #bce6bf;box-shadow:0 6px 20px rgba(0,0,0,0.06);">' ||
          '<span style="background:#d6ff4a;color:#132617;font-weight:800;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;">СТО ЕВАКУАТОР</span>' ||
          '<h2 style="color:#1b6321;margin:10px 0 6px;">✅ Новий час візиту успішно підтверджено!</h2>' ||
          '<p>Шановний(а) <strong>' || NEW.name || '</strong>, майстер погодив перенесення. Чекаємо на вас у новий час:</p>' ||
          '<div style="background:#eef7ed;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #16a34a;">' ||
            '<p style="margin:4px 0;font-size:16px;">📅 <b>Нова дата:</b> <strong style="color:#1b6321;">' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</strong></p>' ||
            '<p style="margin:4px 0;font-size:13px;color:#5a6e5d;">Попередня дата була: ' || to_char(OLD.booking_date, 'YYYY-MM-DD') || ' о ' || OLD.booking_time || '</p>' ||
            '<p style="margin:6px 0 0;">🔧 <b>Послуга:</b> ' || NEW.service_name || '</p>' ||
            '<p style="margin:4px 0;">📍 <b>Адреса:</b> вул. Яблунева, 20, Нове, Київська область</p>' ||
          '</div>' ||
          '<p style="font-size:13px;color:#5a6e5d;">Якщо виникнуть питання, зателефонуйте нам: <a href="tel:+380680679909" style="color:#256528;font-weight:700;">+380 68 067 9909</a>.</p>' ||
        '</div>' ||
      '</div>';

      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
        body := json_build_object(
          'from', 'СТО Евакуатор <onboarding@resend.dev>',
          'to', json_build_array(cust_email),
          'subject', email_subject,
          'html', email_content
        )::jsonb
      );
    end if;

  -- -----------------------------------------------------------
  -- СЦЕНАРІЙ 3: АДМІНІСТРАТОР ПІДТВЕРДИВ ЗВИЧАЙНИЙ ЗАПИС
  -- Повідомляємо клієнта
  -- -----------------------------------------------------------
  elsif (NEW.status = 'confirmed' or NEW.status = 'accepted') and OLD.status is distinct from NEW.status then
    if cust_email is not null then
      email_subject := '🟢 Вашу заявку на СТО Евакуатор підтверджено!';
      email_content := '<div style="background:#f6f8f4;padding:32px 16px;font-family:sans-serif;color:#18361b;">' ||
        '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #dce8dc;box-shadow:0 6px 20px rgba(0,0,0,0.06);">' ||
          '<span style="background:#d6ff4a;color:#132617;font-weight:800;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;">СТО ЕВАКУАТОР</span>' ||
          '<h2 style="color:#1b6321;margin:10px 0 6px;">🟢 Запис підтверджено майстром!</h2>' ||
          '<p>Шановний(а) <strong>' || NEW.name || '</strong>, чекаємо на вас у призначений час:</p>' ||
          '<div style="background:#eef7ed;border-radius:12px;padding:16px;margin:16px 0;">' ||
            '<p style="margin:4px 0;">📅 <b>Дата та час:</b> ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</p>' ||
            '<p style="margin:4px 0;">🔧 <b>Послуга:</b> ' || NEW.service_name || '</p>' ||
            '<p style="margin:4px 0;">📍 <b>Адреса:</b> вул. Яблунева, 20, Нове, Київська область</p>' ||
          '</div>' ||
          '<p style="font-size:13px;color:#5a6e5d;">Якщо плани зміняться, ви можете перенести або скасувати запис в особистому кабінеті або за тел: <a href="tel:+380680679909" style="color:#256528;font-weight:700;">+380 68 067 9909</a>.</p>' ||
        '</div>' ||
      '</div>';

      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
        body := json_build_object(
          'from', 'СТО Евакуатор <onboarding@resend.dev>',
          'to', json_build_array(cust_email),
          'subject', email_subject,
          'html', email_content
        )::jsonb
      );
    end if;

  -- -----------------------------------------------------------
  -- СЦЕНАРІЙ 4: МАЙСТЕР ЗАПРОПОНУВАВ ІНШИЙ ЧАС / ВІДХИЛИВ ПЕРЕНОС
  -- Повідомляємо клієнта
  -- -----------------------------------------------------------
  elsif NEW.status = 'reschedule_rejected' and (OLD.status is distinct from NEW.status or OLD.note is distinct from NEW.note) then
    if cust_email is not null then
      email_subject := '⚠️ Щодо перенесення запису на СТО Евакуатор';
      email_content := '<div style="background:#f6f8f4;padding:32px 16px;font-family:sans-serif;color:#18361b;">' ||
        '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #fed7aa;box-shadow:0 6px 20px rgba(0,0,0,0.06);">' ||
          '<span style="background:#fff7ed;color:#c2410c;font-weight:800;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;">ПОВІДОМЛЕННЯ ВІД МАЙСТРА</span>' ||
          '<h2 style="color:#9a3412;margin:10px 0 6px;">⚠️ Щодо перенесення часу запису</h2>' ||
          '<p>Шановний(а) <strong>' || NEW.name || '</strong>, майстер СТО надав відповідь на ваш запит переносу:</p>' ||
          '<div style="background:#fffbeb;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #f97316;">' ||
            '<p style="margin:0;font-weight:700;color:#7c2d12;">«' || coalesce(nullif(admin_proposal, ''), 'На жаль, у цей час майстер зайнятий. Будь ласка, оберіть інший вільний час.') || '»</p>' ||
          '</div>' ||
          '<p style="margin:8px 0;font-size:14px;">Поки що за вами залишається початковий час: 📅 <b>' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</b>.</p>' ||
          '<p style="font-size:13px;color:#5a6e5d;">Ви можете відкрити особистий кабінет, щоб обрати інший зручний день, або зателефонувати майстру: <a href="tel:+380680679909" style="color:#256528;font-weight:700;">+380 68 067 9909</a>.</p>' ||
        '</div>' ||
      '</div>';

      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
        body := json_build_object(
          'from', 'СТО Евакуатор <onboarding@resend.dev>',
          'to', json_build_array(cust_email),
          'subject', email_subject,
          'html', email_content
        )::jsonb
      );
    end if;

  -- -----------------------------------------------------------
  -- СЦЕНАРІЙ 5: МАЙСТЕР ВІДХИЛИВ / СКАСУВАВ ЗАПИС
  -- Повідомляємо клієнта
  -- -----------------------------------------------------------
  elsif NEW.status = 'rejected' and OLD.status is distinct from NEW.status then
    if cust_email is not null then
      email_subject := 'Звернення щодо запису на СТО Евакуатор';
      email_content := '<div style="background:#f6f8f4;padding:32px 16px;font-family:sans-serif;color:#18361b;">' ||
        '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #fecaca;box-shadow:0 6px 20px rgba(0,0,0,0.06);">' ||
          '<span style="background:#fef2f2;color:#991b1b;font-weight:800;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;">СТО ЕВАКУАТОР</span>' ||
          '<h2 style="color:#b91c1c;margin:10px 0 6px;">Звернення щодо запису</h2>' ||
          '<p>Шановний(а) <strong>' || NEW.name || '</strong>, на жаль, майстер не зможе прийняти авто на <b>' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' об ' || NEW.booking_time || '</b>.</p>' ||
          '<div style="background:#fef2f2;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #ef4444;color:#991b1b;">' ||
            '<p style="margin:0;font-weight:600;">' || coalesce(NEW.note, 'На цей час немає вільного підйомника або майстра.') || '</p>' ||
          '</div>' ||
          '<p style="font-size:13px;color:#5a6e5d;">Будь ласка, оберіть інший зручний час на нашому сайті або зателефонуйте нам: <a href="tel:+380680679909" style="color:#256528;font-weight:700;">+380 68 067 9909</a>.</p>' ||
        '</div>' ||
      '</div>';

      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
        body := json_build_object(
          'from', 'СТО Евакуатор <onboarding@resend.dev>',
          'to', json_build_array(cust_email),
          'subject', email_subject,
          'html', email_content
        )::jsonb
      );
    end if;

  -- -----------------------------------------------------------
  -- СЦЕНАРІЙ 6: КЛІЄНТ СКАСУВАВ ЗАПИС
  -- Повідомляємо адміністратора
  -- -----------------------------------------------------------
  elsif NEW.status = 'cancelled' and OLD.status is distinct from NEW.status then
    email_subject := '🚫 Клієнт ' || NEW.name || ' скасував запис на ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' ' || NEW.booking_time;
    email_content := '<div style="background:#f6f8f4;padding:32px 16px;font-family:sans-serif;color:#18361b;">' ||
      '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #d1d5db;box-shadow:0 6px 20px rgba(0,0,0,0.06);">' ||
        '<span style="background:#f3f4f6;color:#4b5563;font-weight:800;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-block;">СКАСОВАНО КЛІЄНТОМ</span>' ||
        '<h2 style="color:#374151;margin:10px 0 6px;">🚫 Клієнт скасував свій запис</h2>' ||
        '<p>Клієнт <strong>' || NEW.name || '</strong> (тел: <a href="tel:' || NEW.phone || '">' || NEW.phone || '</a>) скасував запис на сервіс:</p>' ||
        '<div style="background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #9ca3af;">' ||
          '<p style="margin:4px 0;">📅 <b>Скасований час:</b> ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</p>' ||
          '<p style="margin:4px 0;">🔧 <b>Послуга:</b> ' || NEW.service_name || '</p>' ||
        '</div>' ||
        '<p style="font-size:13px;color:#16a34a;font-weight:600;">Час візиту звільнено, слот доступний для нових клієнтів на сайті.</p>' ||
      '</div>' ||
    '</div>';

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := json_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json')::jsonb,
      body := json_build_object(
        'from', 'СТО Евакуатор <onboarding@resend.dev>',
        'to', json_build_array(admin_email),
        'subject', email_subject,
        'html', email_content
      )::jsonb
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_status_updated on public.bookings;
create trigger on_booking_status_updated
  after update on public.bookings
  for each row execute function public.notify_booking_status_change();


-- ============================================================
-- 3. RLS ПОЛІТИКИ ДОСТУПУ
-- ============================================================
create policy if not exists "Allow select bookings" on public.bookings for select using (true);
create policy if not exists "Allow insert bookings" on public.bookings for insert with check (true);
create policy if not exists "Allow update bookings" on public.bookings for update using (true);
