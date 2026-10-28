-- ============================================================
-- СХЕМА, ТРИГЕРИ ТА EMAIL-ПОВІДОМЛЕННЯ ДЛЯ СТО ЕВАКУАТОР
-- (SUPABASE POSTGRES + PG_NET + RESEND / EMAIL NOTIFICATIONS)
-- ============================================================

-- Вмикаємо розширення для мережевих запитів
create extension if not exists pg_net with schema extensions;

-- ============================================================
-- 1. ТРИГЕР: ПОВІДОМЛЕННЯ АДМІНІСТРАТОРУ НА EMAIL ПРИ НОВІЙ ЗАЯВЦІ
-- ============================================================
create or replace function public.notify_admin_email_booking()
returns trigger as $$
declare
  resend_key text := 'YOUR_RESEND_API_KEY'; -- Ключ із resend.com
  admin_email text := 'YOUR_ADMIN_EMAIL';    -- Пошта адміністратора СТО
  site_url text := 'https://kaiangeelll.github.io/sto-yabluneve/?action=admin';
  email_html text;
begin
  -- Фірмовий шаблон у стилі сайту (темно-зелений + білий + лайм)
  email_html := '<div style="background-color:#f6f8f4;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#18361b;">' ||
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
            '<tr>' ||
              '<td style="padding:8px 0;font-size:14px;color:#5a6e5d;width:120px;">Клієнт:</td>' ||
              '<td style="padding:8px 0;font-size:15px;font-weight:700;color:#102213;">' || NEW.name || '</td>' ||
            '</tr>' ||
            '<tr>' ||
              '<td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Телефон:</td>' ||
              '<td style="padding:8px 0;font-size:16px;font-weight:800;"><a href="tel:' || NEW.phone || '" style="color:#256528;text-decoration:none;">' || NEW.phone || '</a></td>' ||
            '</tr>' ||
            '<tr>' ||
              '<td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Послуга:</td>' ||
              '<td style="padding:8px 0;font-size:15px;font-weight:700;color:#1b4c1f;">' || NEW.service_name || '</td>' ||
            '</tr>' ||
            '<tr>' ||
              '<td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Дата та час:</td>' ||
              '<td style="padding:8px 0;font-size:15px;font-weight:700;color:#102213;">📅 ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</td>' ||
            '</tr>' ||
            coalesce('<tr><td style="padding:8px 0;font-size:14px;color:#5a6e5d;">Примітка:</td><td style="padding:8px 0;font-size:14px;color:#334435;">' || NEW.note || '</td></tr>', '') ||
          '</table>' ||
          '<div style="text-align:center;padding-top:16px;border-top:1px solid #eef3ee;">' ||
            '<a href="' || site_url || '" style="background:#d6ff4a;color:#102613;display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;text-decoration:none;border-radius:14px;box-shadow:0 4px 14px rgba(214,255,74,0.4);">' ||
              'Відкрити заявку в кабінеті СТО →' ||
            '</a>' ||
            '<p style="margin:12px 0 0;font-size:12px;color:#7a8d7d;">Клікніть, щоб прийняти, відхилити або зателефонувати клієнту.</p>' ||
          '</div>' ||
        '</td>' ||
      '</tr>' ||
    '</table>' ||
  '</div>';

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := json_build_object(
      'Authorization', 'Bearer ' || resend_key,
      'Content-Type', 'application/json'
    )::jsonb,
    body := json_build_object(
      'from', 'СТО Евакуатор <onboarding@resend.dev>',
      'to', json_build_array(admin_email),
      'subject', '🚗 Новий запис на СТО: ' || NEW.name || ' (' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' ' || NEW.booking_time || ')',
      'html', email_html
    )::jsonb
  );

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_created_email on public.bookings;
create trigger on_booking_created_email
  after insert on public.bookings
  for each row execute function public.notify_admin_email_booking();


-- ============================================================
-- 2. ТРИГЕР: ПОВІДОМЛЕННЯ КЛІЄНТУ (ПІДТВЕРДЖЕННЯ / ВІДХИЛЕННЯ)
-- ============================================================
create or replace function public.notify_customer_status_change()
returns trigger as $$
declare
  resend_key text := 'YOUR_RESEND_API_KEY';
  cust_email text := null;
  email_subject text;
  email_content text;
begin
  -- Витягуємо пошту клієнта з поля note, якщо вона була зазначена (наприклад, "Пошта: user@gmail.com")
  if NEW.note ~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' then
    cust_email := substring(NEW.note from '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})');
  end if;

  if cust_email is not null and OLD.status is distinct from NEW.status then
    if NEW.status = 'confirmed' or NEW.status = 'accepted' then
      email_subject := '🟢 Вашу заявку на СТО Евакуатор підтверджено!';
      email_content := '<div style="background:#f6f8f4;padding:28px 16px;font-family:sans-serif;color:#18361b;">' ||
        '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #dce8dc;">' ||
          '<h2 style="color:#1b6321;margin-top:0;">🟢 Запис підтверджено майстром!</h2>' ||
          '<p>Шановний(а) <strong>' || NEW.name || '</strong>, чекаємо на вас у призначений час:</p>' ||
          '<div style="background:#eef7ed;border-radius:12px;padding:14px 18px;margin:16px 0;">' ||
            '<p style="margin:4px 0;">📅 <b>Дата:</b> ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</p>' ||
            '<p style="margin:4px 0;">🔧 <b>Послуга:</b> ' || NEW.service_name || '</p>' ||
            '<p style="margin:4px 0;">📍 <b>Адреса:</b> вул. Яблунева, 20, Нове, Київська область</p>' ||
          '</div>' ||
          '<p style="font-size:13px;color:#5a6e5d;">Якщо у вас зміняться плани або запізнюєтесь, будь ласка, зателефонуйте нам: <a href="tel:+380680679909">+380 68 067 9909</a>.</p>' ||
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

    elsif NEW.status = 'rejected' then
      email_subject := 'Звернення щодо запису на СТО Евакуатор';
      email_content := '<div style="background:#f6f8f4;padding:28px 16px;font-family:sans-serif;color:#18361b;">' ||
        '<div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #e5c5c0;">' ||
          '<h2 style="color:#b82618;margin-top:0;">Звернення щодо запису</h2>' ||
          '<p>Шановний(а) <strong>' || NEW.name || '</strong>, на жаль, майстер не може прийняти авто на <b>' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' об ' || NEW.booking_time || '</b>.</p>' ||
          '<div style="background:#fdeeee;border-radius:12px;padding:14px 18px;margin:16px 0;color:#9e2316;">' ||
            '<p style="margin:0;font-weight:600;">' || coalesce(NEW.note, 'На цей час немає вільного підйомника або майстра.') || '</p>' ||
          '</div>' ||
          '<p>Будь ласка, оберіть інший час на нашому сайті або зателефонуйте: <a href="tel:+380680679909">+380 68 067 9909</a>.</p>' ||
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
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_status_updated on public.bookings;
create trigger on_booking_status_updated
  after update on public.bookings
  for each row execute function public.notify_customer_status_change();


-- ============================================================
-- 3. RLS ПОЛІТИКИ ДОСТУПУ (ЩОБ АДМІН МІГ ОНОВЛЮВАТИ СТАТУСИ)
-- ============================================================
create policy if not exists "Allow update bookings" on public.bookings for update using (true);
