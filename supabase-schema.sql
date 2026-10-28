-- ============================================================
-- СХЕМА БАЗИ ДАНИХ ДЛЯ СТО ЕВАКУАТОР (SUPABASE)
-- ============================================================

-- 1. Таблиця налаштувань сервісу
create table if not exists public.site_settings (
    id int primary key default 1,
    site_name text default 'СТО Евакуатор',
    phone text default '+380680679909',
    address text default 'вул. Яблунева, 20, Нове, Київська область',
    hours text default 'Щодня · 09:00–19:00',
    map_url text default 'https://maps.app.goo.gl/B1xcUJHgVeRC3Avm7',
    whatsapp text default '',
    viber text default '',
    telegram text default '',
    closed_dates jsonb default '[]'::jsonb,
    closed_slots jsonb default '[]'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Початкові дані налаштувань
insert into public.site_settings (id, site_name, phone, address, hours, map_url)
values (1, 'СТО Евакуатор', '+380680679909', 'вул. Яблунева, 20, Нове, Київська область', 'Щодня · 09:00–19:00', 'https://maps.app.goo.gl/B1xcUJHgVeRC3Avm7')
on conflict (id) do nothing;

-- 2. Таблиця послуг
create table if not exists public.services (
    id text primary key,
    title text not null,
    price text not null,
    description text,
    sort_order int default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Початкові послуги
insert into public.services (id, title, price, description, sort_order)
values
  ('engine-diagnostics', 'Діагностика двигуна', 'від 500 ₴', 'Комп’ютерна перевірка помилок, параметрів датчиків, системи запалювання та впорскування.', 1),
  ('chassis', 'Ремонт ходової частини', 'від 400 ₴', 'Огляд підвіски, заміна важелів, сайлентблоків, кульових опор, амортизаторів та пружин.', 2),
  ('electrics', 'Автоелектрика', 'від 600 ₴', 'Пошук обривів і витоків струму, ремонт проводки, генераторів, стартерів та освітлення.', 3),
  ('climate', 'Обслуговування кондиціонерів', 'від 800 ₴', 'Діагностика герметичності, заправка фреоном, антибактеріальна чистка випарника.', 4),
  ('transmission', 'Ремонт трансмісії та МКПП', 'від 1 200 ₴', 'Заміна зчеплення, мастила, сальників, діагностика шумів і перемикання передач.', 5),
  ('evacuator', 'Послуги евакуатора', 'від 1 500 ₴', 'Подача по Новому, Боярці, Тарасівці, Вишневому та напрямку Києва. Цілодобово за викликом.', 6)
on conflict (id) do nothing;

-- 3. Таблиця заявок на ремонт
create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    name text not null,
    phone text not null,
    service_id text references public.services(id) on delete set null,
    service_name text not null,
    booking_date date not null,
    booking_time text not null,
    note text,
    status text default 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    user_id uuid references auth.users(id) on delete set null
);

-- Індекс для запобігання дублюванню активного запису на один і той же час
create unique index if not exists idx_unique_booking_slot
on public.bookings (booking_date, booking_time)
where status in ('pending', 'confirmed');

-- 4. Таблиця відгуків
create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    name text not null,
    rating int not null check (rating between 1 and 5),
    text text not null,
    is_approved boolean default true,
    user_id uuid references auth.users(id) on delete set null
);

-- 5. Політики безпеки Row Level Security (RLS)
alter table public.site_settings enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

-- Налаштування та послуги: читати можуть усі
create policy "Anyone can read site_settings" on public.site_settings for select using (true);
create policy "Anyone can read services" on public.services for select using (true);

-- Заявки: створювати може будь-який відвідувач
create policy "Anyone can insert booking" on public.bookings for insert with check (true);

-- Заявки: відвідувач може читати слоти для перевірки зайнятості
create policy "Anyone can check booked slots" on public.bookings for select using (true);

-- Відгуки: читати можуть усі схвалені, додавати будь-хто
create policy "Anyone can read approved reviews" on public.reviews for select using (is_approved = true);
create policy "Anyone can submit review" on public.reviews for insert with check (true);

-- Адміністратори (користувачі з певною роллю або авторизовані адміни) мають повний доступ
create policy "Admins full access settings" on public.site_settings for all using (auth.role() = 'authenticated');
create policy "Admins full access services" on public.services for all using (auth.role() = 'authenticated');
create policy "Admins full access bookings" on public.bookings for all using (auth.role() = 'authenticated');
create policy "Admins full access reviews" on public.reviews for all using (auth.role() = 'authenticated');
