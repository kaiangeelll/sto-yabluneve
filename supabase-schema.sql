-- ============================================================
-- СХЕМА ТА ТРИГЕРИ ДЛЯ СТО ЕВАКУАТОР (SUPABASE + TG + RESEND)
-- ============================================================

-- Вмикаємо розширення для HTTP-запитів
create extension if not exists pg_net with schema extensions;

-- Створення функцій та тригера сповіщень
create or replace function public.notify_telegram_booking()
returns trigger as $$
declare
  bot_token text := 'YOUR_TELEGRAM_BOT_TOKEN';
  chat_id text := 'YOUR_TELEGRAM_CHAT_ID';
  resend_key text := 'YOUR_RESEND_API_KEY';
  admin_email text := 'YOUR_ADMIN_EMAIL';
  message_text text;
  email_html text;
begin
  -- 1. Відправка в Telegram
  message_text := '🚗 *НОВА ЗАЯВКА НА СТО ЕВАКУАТОР!*' || chr(10) || chr(10) ||
    '👤 *Клієнт:* ' || NEW.name || chr(10) ||
    '📞 *Телефон:* ' || NEW.phone || chr(10) ||
    '🔧 *Послуга:* ' || NEW.service_name || chr(10) ||
    '📅 *Дата:* ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || chr(10) ||
    '⏰ *Час:* ' || NEW.booking_time || chr(10) ||
    coalesce('📝 *Коментар:* ' || NEW.note || chr(10), '') || chr(10) ||
    '🌐 _Створено через сайт СТО_';

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body := json_build_object(
      'chat_id', chat_id,
      'text', message_text,
      'parse_mode', 'Markdown'
    )::jsonb
  );

  -- 2. Відправка на Email (через Resend)
  email_html := '<h2>Нова заявка на обслуговування авто!</h2>' ||
    '<p><strong>Клієнт:</strong> ' || NEW.name || '</p>' ||
    '<p><strong>Телефон:</strong> <a href="tel:' || NEW.phone || '">' || NEW.phone || '</a></p>' ||
    '<p><strong>Послуга:</strong> ' || NEW.service_name || '</p>' ||
    '<p><strong>Дата та час:</strong> ' || to_char(NEW.booking_date, 'YYYY-MM-DD') || ' о ' || NEW.booking_time || '</p>' ||
    coalesce('<p><strong>Коментар клієнта:</strong> ' || NEW.note || '</p>', '');

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

drop trigger if exists on_booking_created on public.bookings;
create trigger on_booking_created
  after insert on public.bookings
  for each row execute function public.notify_telegram_booking();
