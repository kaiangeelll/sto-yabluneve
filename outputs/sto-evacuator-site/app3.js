const catalog=[['Встановлення та ремонт автокондиціонерів','Діагностика, заправка та ремонт систем кондиціювання','від 600 ₴'],['Гальмівні системи','Перевірка, ремонт і заміна компонентів гальмівної системи','від 500 ₴'],['Діагностика двигуна','Комп’ютерна та механічна діагностика двигуна','від 400 ₴'],['Автоелектрика','Пошук несправностей, проводка, стартер і генератор','від 400 ₴'],['Заміна оливи','Заміна оливи, фільтрів і технічних рідин','від 500 ₴'],['Ремонт кондиціонерів','Ремонт компресора, трубок, радіатора та витоків','від 700 ₴'],['Ремонт двигунів','Діагностика та ремонт двигуна будь-якої складності','від 1 500 ₴'],['Ремонт електрообладнання','Ремонт вузлів і електронних компонентів авто','від 500 ₴'],['Кермове керування та підвіска','Ремонт рульової системи, ходової та підвіски','від 500 ₴'],['Ремонт коробок передач','Діагностика, обслуговування та ремонт КПП','від 1 500 ₴']];
const base={schema:3,name:'СТО Евакуатор',adminEmail:'',phone:'+380 68 067 9909',address:'вул. Яблунева, 20, Нове, Київська область, 08150',hours:'Пн–Пт: 09:00–19:00 · Сб: 09:00–15:00 · Нд: Вихідний',map:'https://maps.app.goo.gl/B1xcUJHgVeRC3Avm7',whatsapp:'',viber:'',telegram:'',closedDates:'',closedSlots:'',services:catalog};
let data=JSON.parse(localStorage.getItem('stoData')||'null')||base;
if(data.schema!==3||data.hours==='Щодня · 09:00–19:00'||!data.hours.includes('Сб:')){
  data.hours='Пн–Пт: 09:00–19:00 · Сб: 09:00–15:00 · Нд: Вихідний';
  localStorage.setItem('stoData',JSON.stringify(data));
}
let bookings=JSON.parse(localStorage.getItem('stoBookings')||'[]'),reviews=JSON.parse(localStorage.getItem('stoReviews')||'null')||[{name:'Клієнт Google Maps',rating:5,text:'Якісне та індивідуальне обслуговування. Рекомендую майстра.',date:'Відгук із Google Maps'},{name:'Клієнт Google Maps',rating:5,text:'Несправність усунули якісно й швидко. Тепер звертаюся сюди з усіх питань авто.',date:'Відгук із Google Maps'}];

const SUPABASE_URL='https://nabwuaxzogfuzaznvmph.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYnd1YXh6b2dmdXphem52bXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzc2MDQsImV4cCI6MjEwODc1MzYwNH0.bvkJPsimj--W21Zort-I1saszUhbI2um96VUlxgwS2U';

async function sbFetch(path,options={}){
  const headers={'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json',...(options.headers||{})};
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers});
    if(!res.ok)return null;
    return await res.json();
  }catch(e){return null;}
}

const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)],esc=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])),stars=n=>'★'.repeat(+n)+'☆'.repeat(5-(+n));
const save=()=>localStorage.setItem('stoData',JSON.stringify(data)),saveBookings=()=>localStorage.setItem('stoBookings',JSON.stringify(bookings)),saveReviews=()=>localStorage.setItem('stoReviews',JSON.stringify(reviews));
const split=s=>(s||'').split(';').map(x=>x.trim()).filter(Boolean);
const status=b=>{
  if(b.status==='closed'||b.status==='completed')return 'Завершено';
  if(b.status==='rejected')return 'Відхилено';
  if(b.status==='confirmed'||b.status==='accepted')return 'Підтверджено';
  if(new Date(`${b.date}T${b.time}`)<new Date())return 'Завершено';
  return 'Нова';
};

function linkFor(kind,digits){
  let v=data[kind]?.trim();
  if(!v)return '';
  if(kind==='telegram'){
    let u=v.replace(/^https?:\/\/t\.me\//i,'').replace(/^@/,'').trim();
    return `https://t.me/${u}`;
  }
  if(/^https?:|^viber:/.test(v))return v;
  if(kind==='whatsapp')return `https://wa.me/${v.replace(/\D/g,'')}`;
  if(kind==='viber')return `viber://chat?number=%2B${v.replace(/\D/g,'')}`;
  return v;
}

function getKyivNow(){
  try{
    const str=new Date().toLocaleString('en-US',{timeZone:'Europe/Kyiv'});
    return new Date(str);
  }catch(e){
    const d=new Date();
    const utc=d.getTime()+(d.getTimezoneOffset()*60000);
    return new Date(utc+(3*3600000));
  }
}

function updateHeroStatus(){
  const now=getKyivNow();
  const day=now.getDay(); // 0 = Неділя, 1..5 = Будні, 6 = Субота
  const hours=now.getHours();
  const mins=now.getMinutes();
  const totalMins=hours*60+mins;

  const card=$('[data-hero-status-card]');
  const badgeEl=$('[data-status-badge]');
  const detailEl=$('[data-status-detail]');
  const dotEl=$('[data-status-dot]');

  let isOpen=false;
  let badgeText='Зараз зачинено';
  let detailText='';

  if(day===0){
    // Неділя: Закрито
    isOpen=false;
    badgeText='Зараз зачинено';
    detailText='Неділя — вихідний день · Відкриємося в понеділок о 09:00';
  }else if(day===6){
    // Субота: 09:00 - 15:00 (540..900)
    if(totalMins>=540 && totalMins<900){
      isOpen=true;
      badgeText='Зараз працюємо';
      detailText='Сьогодні (субота) відчинено до 15:00';
    }else if(totalMins<540){
      isOpen=false;
      badgeText='Зараз зачинено';
      detailText='Відкриємося сьогодні (субота) о 09:00 (до 15:00)';
    }else{
      isOpen=false;
      badgeText='Зараз зачинено';
      detailText='Робочий день завершено · Відкриємося в понеділок о 09:00';
    }
  }else{
    // Будні: 09:00 - 19:00 (540..1140)
    if(totalMins>=540 && totalMins<1140){
      isOpen=true;
      badgeText='Зараз працюємо';
      detailText='Сьогодні відчинено до 19:00';
    }else if(totalMins<540){
      isOpen=false;
      badgeText='Зараз зачинено';
      detailText='Відкриємося сьогодні о 09:00 (до 19:00)';
    }else{
      isOpen=false;
      badgeText='Зараз зачинено';
      const nextDay=day===5?'завтра (субота) о 09:00 (до 15:00)':'завтра о 09:00';
      detailText=`Робочий день завершено · Відкриємося ${nextDay}`;
    }
  }

  if(badgeEl)badgeEl.textContent=badgeText;
  if(detailEl)detailEl.textContent=detailText;
  if(dotEl){
    dotEl.classList.toggle('is-closed',!isOpen);
    dotEl.classList.toggle('is-open',isOpen);
  }
}

function render(){
  let digits=data.phone.replace(/\D/g,'');
  document.title=`${data.name} — ремонт авто в Новому`;
  $$('[data-brand-name]').forEach(e=>{
    const sub=e.querySelector('small');
    const clean=data.name.replace(/^СТО\s*/i,'').trim()||data.name;
    e.textContent=clean;
    if(sub)e.appendChild(sub);
  });
  $$('[data-phone]').forEach(e=>{e.textContent=data.phone;e.href='tel:'+digits});
  $$('[data-address]').forEach(e=>e.innerHTML=esc(data.address).replace(', ', ',<br />'));
  $$('[data-hours]').forEach(e=>e.textContent=data.hours);
  $$('[data-map]').forEach(e=>e.href=data.map);
  [['whatsapp','WhatsApp'],['viber','Viber'],['telegram','Telegram']].forEach(([k])=>$$(`[data-${k}]`).forEach(e=>{let l=linkFor(k,digits);e.hidden=!l;if(l)e.href=l}));
  $('[data-services]').innerHTML=data.services.map((s,i)=>`<article class="service" tabindex="0" role="button" data-service="${i}"><span class="service-num">${String(i+1).padStart(2,'0')}</span><h3>${esc(s[0])}</h3><p>${esc(s[1])}</p><span class="price">${esc(s[2])}</span></article>`).join('');
  $('[data-service-options]').innerHTML='<option value="">Оберіть послугу</option>'+data.services.map(s=>`<option>${esc(s[0])}</option>`).join('');
  $$('[data-service]').forEach(el=>{let act=()=>open('bookingDialog',data.services[+el.dataset.service][0]);el.onclick=act;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')act()}});
  $('[data-reviews]').innerHTML=reviews.slice().reverse().map(r=>`<article class="review-card"><header><div><strong>${esc(r.name)}</strong><span class="stars">${stars(r.rating)}</span></div><time>${esc(r.date)}</time></header><p>${esc(r.text)}</p></article>`).join('');
  renderBookings();
  updateHeroStatus();
}

function unavailable(date,time){
  if(!date||!time)return '';
  const d=new Date(date+'T12:00:00');
  const day=d.getDay();
  if(day===0)return 'У неділю автосервіс зачинений (вихідний).';
  if(day===6&&time>'14:00')return 'У суботу автосервіс працює до 15:00.';
  if(split(data.closedDates).includes(date.trim()))return 'Цей день зачинений адміністратором.';
  if(split(data.closedSlots).includes(`${date.trim()} ${time.trim().slice(0,5)}`))return 'Цей час заблоковано адміністратором.';

  const tNorm=time.trim().slice(0,5);
  const isBooked=bookings.some(b=>{
    const bDate=(b.date||'').trim();
    const bTime=(b.time||'').trim().slice(0,5);
    const st=status(b);
    return bDate===date.trim() && bTime===tNorm && (st==='Нова'||st==='Підтверджено');
  });
  if(isBooked)return 'Цей час уже зайнятий іншим клієнтом.';
  return '';
}

function refreshTimes(){
  let date=$('#bookingForm [name=date]').value,
      select=$('[data-time-options]'),
      note=$('[data-availability]'),
      submit=$('#bookingForm [type=submit]');
  if(!date){
    select.innerHTML='<option value="">Спочатку оберіть дату</option>';
    select.disabled=true;
    note.textContent='Оберіть дату, щоб побачити вільний час.';
    submit.disabled=true;
    return;
  }

  const d=new Date(date+'T12:00:00');
  const day=d.getDay();
  if(day===0){
    select.innerHTML='<option value="" disabled selected>Неділя — вихідний день</option>';
    select.disabled=true;
    submit.disabled=true;
    note.textContent='У неділю автосервіс не працює (вихідний). Оберіть будній день або суботу.';
    note.style.color='#c0392b';
    return;
  }

  let times=['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  if(day===6){
    times=['09:00','10:00','11:00','12:00','13:00','14:00']; // Субота до 15:00
  }

  let optionsHtml='<option value="">Оберіть зручний час</option>';
  let freeCount=0;

  times.forEach(t=>{
    const reason=unavailable(date,t);
    if(!reason){
      freeCount++;
      optionsHtml+=`<option value="${t}">🟢 ${t} — Вільно для запису</option>`;
    }else if(reason.includes('зайнятий')){
      optionsHtml+=`<option value="" disabled style="color:#b82618;background:#fdeeee;">❌ ${t} — Зайнято (запис клієнта)</option>`;
    }else if(reason.includes('заблоковано')||reason.includes('недоступний')||reason.includes('зачинений')){
      optionsHtml+=`<option value="" disabled style="color:#777;background:#f0f0f0;">⛔ ${t} — Недоступно (перерва)</option>`;
    }else{
      optionsHtml+=`<option value="" disabled style="color:#777;">⛔ ${t}</option>`;
    }
  });

  select.innerHTML=optionsHtml;
  select.disabled=!freeCount;
  submit.disabled=!freeCount;

  if(freeCount>0){
    note.textContent=`Доступно ${freeCount} вільн. слотів.${day===6?' (Субота до 15:00).':''} Зайнятий час заблоковано.`;
    note.style.color='#246828';
  }else{
    note.textContent='На цю дату весь час уже зайнятий клієнтами або недоступний. Оберіть інший день.';
    note.style.color='#c0392b';
  }
}

function open(id,service=''){
  let d=$('#'+id);
  if(id==='bookingDialog'){
    let u=null;
    try{u=JSON.parse(localStorage.getItem('stoUserSession')||'null');}catch(e){}
    if(u&&(u.role==='admin'||u.is_admin)){
      alert('Ви увійшли як адміністратор СТО.\nАдміністратор керує графіком та заявками в Панелі керування. Створення клієнтських заявок для свого акаунта вимкнено.');
      return;
    }
    $('#bookingForm').hidden=false;
    $('.success',d).hidden=true;
    $('#bookingForm').reset();
    if(service)$('[data-service-options]').value=service;
    if(u){
      if(u.name&&u.role!=='admin')$('#bookingForm [name=name]').value=u.name;
      const bGroup=$('#bookingForm [data-phone-group]');
      if(window.setPhoneGroupValue&&bGroup)window.setPhoneGroupValue(bGroup,u.phone||'');
      if(u.email&&$('#bookingForm [name=email]'))$('#bookingForm [name=email]').value=u.email;
    }else{
      const bGroup=$('#bookingForm [data-phone-group]');
      if(window.setPhoneGroupValue&&bGroup)window.setPhoneGroupValue(bGroup,'');
    }
    refreshTimes();
  }
  if(id==='accountDialog'){
    let u=null;
    try{u=JSON.parse(localStorage.getItem('stoUserSession')||'null');}catch(e){}
    if(!u&&window.currentUser)u=window.currentUser;
    if(u&&window.showUserProfile){
      window.showUserProfile(u);
    }else{
      const uv=$('#accountUserView');if(uv)uv.hidden=true;
      const gv=$('#accountGuestView');if(gv)gv.hidden=false;
      $$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='login'));
      $$('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!=='login');
    }
    if(typeof syncWithCloud==='function'){
      syncWithCloud();
    }
  }
  if(id==='adminDialog'){
    fillAdmin();
    $$('[data-admin-tab]').forEach(y=>y.classList.toggle('active',y.dataset.adminTab==='bookings'));
    $$('[data-admin-panel]').forEach(y=>y.hidden=y.dataset.adminPanel!=='bookings');
  }
  d.showModal();
}
function closeAll(){$$('dialog[open]').forEach(x=>x.close())}

function row(s=['Нова послуга','Опис послуги уточнює майстер','від 500 ₴']){return `<div class="admin-service"><input data-k="0" value="${esc(s[0])}" placeholder="Назва послуги"><input data-k="1" type="hidden" value="${esc(s[1]||'Якісний ремонт та обслуговування')}"><input data-k="2" value="${esc(s[2])}" placeholder="Ціна"><button type="button" class="remove-service">×</button></div>`}
function bindRemove(){$$('.remove-service').forEach(x=>x.onclick=()=>x.closest('.admin-service').remove())}

let adminCalDate=new Date();
let adminSelectedDay=null;

function renderAdminCal(){
  const calGrid=$('[data-admin-cal-grid]'),
        calTitle=$('[data-admin-cal-title]');
  if(!calGrid||!calTitle)return;

  const y=adminCalDate.getFullYear(),
        m=adminCalDate.getMonth();

  const monthNames=['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
  calTitle.textContent=`${monthNames[m]} ${y}`;

  const closedDays=split(data.closedDates);
  const closedSlots=split(data.closedSlots);

  const firstDayIndex=(new Date(y,m,1).getDay()+6)%7;
  const daysInMonth=new Date(y,m+1,0).getDate();

  let html='<div class="week-day">Пн</div><div class="week-day">Вт</div><div class="week-day">Ср</div><div class="week-day">Чт</div><div class="week-day">Пт</div><div class="week-day">Сб</div><div class="week-day">Нд</div>';

  for(let i=0;i<firstDayIndex;i++){html+='<span></span>';}

  const pad=n=>String(n).padStart(2,'0');

  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${y}-${pad(m+1)}-${pad(d)}`;
    const isClosed=closedDays.includes(dateStr);
    const hasSlots=closedSlots.some(s=>s.startsWith(dateStr));
    const isSel=adminSelectedDay===dateStr;

    let cls=['admin-cal-day-btn'];
    if(isClosed)cls.push('is-closed');
    if(hasSlots)cls.push('has-slots');
    if(isSel)cls.push('selected');

    html+=`<button type="button" class="${cls.join(' ')}" data-admin-day="${dateStr}">${d}</button>`;
  }

  calGrid.innerHTML=html;

  $$('[data-admin-day]').forEach(btn=>{
    btn.onclick=()=>{
      adminSelectedDay=btn.dataset.adminDay;
      renderAdminCal();
      renderAdminDayDetails();
    };
  });
}

function renderAdminDayDetails(){
  const dayManager=$('[data-admin-day-manager]'),
        selLabel=$('[data-admin-selected-date]'),
        toggleWholeBtn=$('[data-toggle-whole-day]'),
        hoursGrid=$('[data-admin-hours-grid]');

  if(!dayManager||!adminSelectedDay)return;
  dayManager.hidden=false;
  if(selLabel)selLabel.textContent=adminSelectedDay;

  const closedDays=split(data.closedDates);
  const isWholeClosed=closedDays.includes(adminSelectedDay);

  if(toggleWholeBtn){
    toggleWholeBtn.textContent=isWholeClosed?'✅ Відкрити день':'❌ Закрити весь день (Вихідний)';
    toggleWholeBtn.classList.toggle('active',isWholeClosed);

    toggleWholeBtn.onclick=()=>{
      let list=split(data.closedDates);
      if(list.includes(adminSelectedDay)){
        list=list.filter(d=>d!==adminSelectedDay);
      }else{
        list.push(adminSelectedDay);
      }
      data.closedDates=list.join('; ');
      const inp=$('#adminForm [name=closedDates]');
      if(inp)inp.value=data.closedDates;
      save();
      renderAdminCal();
      renderAdminDayDetails();
      refreshTimes();
      syncAdminCalendarToCloud();
    };
  }

  const times=['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  const closedSlots=split(data.closedSlots);

  if(hoursGrid){
    hoursGrid.innerHTML=times.map(t=>{
      const slotKey=`${adminSelectedDay} ${t}`;
      const isBlocked=closedSlots.includes(slotKey);
      return `<button type="button" class="admin-hour-chip ${isBlocked?'blocked':''}" data-hour-slot="${slotKey}">${t} ${isBlocked?'(закр.)':''}</button>`;
    }).join('');

    $$('[data-hour-slot]').forEach(b=>{
      b.onclick=()=>{
        const slot=b.dataset.hourSlot;
        let slots=split(data.closedSlots);
        if(slots.includes(slot)){
          slots=slots.filter(s=>s!==slot);
        }else{
          slots.push(slot);
        }
        data.closedSlots=slots.join('; ');
        const inp=$('#adminForm [name=closedSlots]');
        if(inp)inp.value=data.closedSlots;
        save();
        renderAdminCal();
        renderAdminDayDetails();
        refreshTimes();
        syncAdminCalendarToCloud();
      };
    });
  }
}

function fillAdmin(){
  let f=$('#adminForm');
  if(f){
    ['name','adminEmail','phone','address','hours','map','whatsapp','viber','telegram','closedDates','closedSlots'].forEach(k=>f.elements[k]?f.elements[k].value=data[k]||'':null);
  }
  const pEl=$('[data-admin-side-phone]');if(pEl)pEl.textContent=data.phone||'+380 68 067 9909';
  const eEl=$('[data-admin-side-email]');if(eEl)eEl.textContent=data.adminEmail||'admin@sto-yabluneve.ua';
  const scEl=$('[data-services-count]');if(scEl)scEl.textContent=data.services.length;
  $('[data-admin-services]').innerHTML=data.services.map(row).join('');
  bindRemove();
  renderBookings();
  renderAdminCal();
  renderAdminReviews();
  if(adminSelectedDay)renderAdminDayDetails();
}

function renderAdminReviews(){
  const container=$('[data-admin-reviews-list]');
  const countEl=$('[data-reviews-admin-count]');
  if(countEl)countEl.textContent=reviews.length;
  if(!container)return;

  if(!reviews.length){
    container.innerHTML='<p class="admin-hint" style="text-align:center;padding:24px 0;">Відгуків поки немає.</p>';
    return;
  }

  container.innerHTML=reviews.slice().reverse().map((r,revIndex)=>{
    const realIndex=reviews.length-1-revIndex;
    return `
      <article class="booking-admin-card review-admin-card" style="margin-bottom:12px;">
        <header>
          <div>
            <strong>${esc(r.name)}</strong> · <span class="stars" style="color:#2e7d32;">${stars(r.rating)}</span>
          </div>
          <time style="font-size:12px;color:#7a8d7d;">${esc(r.date||'Відгук з сайту')}</time>
        </header>
        <p style="margin:8px 0 12px;font-size:14px;color:#2c3e2e;line-height:1.5;">${esc(r.text)}</p>
        <div style="display:flex;justify-content:flex-end;">
          <button type="button" class="admin-reject-btn" data-delete-review="${realIndex}">🗑️ Видалити відгук</button>
        </div>
      </article>
    `;
  }).join('');

  $$('[data-delete-review]').forEach(btn=>{
    btn.onclick=async ()=>{
      const idx=+btn.dataset.deleteReview;
      if(confirm('Ви впевнені, що хочете видалити цей відгук із сайту?')){
        reviews.splice(idx,1);
        saveReviews();
        render();
        renderAdminReviews();
      }
    };
  });
}

function renderBookings(){
  let t=$('[data-bookings]');if(!t)return;
  let active=bookings.filter(b=>status(b)==='Нова'||status(b)==='Підтверджено').length;
  let done=bookings.filter(b=>status(b)==='Завершено').length;
  $$('[data-booking-count]').forEach(x=>x.textContent=active);
  const totalEl=$('[data-stat-total]');if(totalEl)totalEl.textContent=bookings.length;
  const doneEl=$('[data-stat-done]');if(doneEl)doneEl.textContent=done;
  const servCount=$('[data-services-count]');if(servCount)servCount.textContent=data.services.length;

  t.innerHTML=bookings.length?bookings.slice().reverse().map(b=>{
    let st=status(b);
    const cleanPhone=esc(b.phone).replace(/\D/g,'');
    let badgeClass='status';
    let badgeText='🕒 Нова заявка';

    if(st==='Завершено'){
      badgeClass='status done';
      badgeText='✅ Виконано';
    }else if(st==='Підтверджено'){
      badgeClass='status confirmed';
      badgeText='🟢 Прийнято майстром';
    }else if(st==='Відхилено'){
      badgeClass='status rejected';
      badgeText='❌ Відхилено';
    }

    return `
      <article class="booking-admin-card ${st==='Підтверджено'?'is-confirmed':''} ${st==='Відхилено'?'is-rejected':''}">
        <header>
          <div>
            <strong>${esc(b.name)}</strong> · <span style="color:#256528;font-weight:700;">${esc(b.service)}</span>
          </div>
          <span class="${badgeClass}">${badgeText}</span>
        </header>
        <p>
          📅 <b>${esc(b.date)}</b> об <b>${esc(b.time)}</b> · 📞 <a href="tel:${cleanPhone}" style="color:inherit;font-weight:800;text-decoration:underline;">${esc(b.phone)}</a>
          ${b.note?`<br /><span style="color:#576b5b;font-size:12px;">Примітка: ${esc(b.note)}</span>`:''}
          ${b.reject_reason?`<br /><span style="color:#b82618;font-size:12px;font-weight:600;">Причина відхилення: ${esc(b.reject_reason)}</span>`:''}
        </p>
        <div class="admin-card-actions-row">
          ${st==='Нова'?`
            <button type="button" class="admin-accept-btn" data-accept-booking="${b.id}">🟢 Прийняти заявку</button>
            <button type="button" class="admin-reject-btn" data-reject-booking="${b.id}">❌ Відхилити</button>
          `:''}
          ${st==='Підтверджено'?`
            <button type="button" class="admin-accept-btn" data-close-booking="${b.id}">✓ Позначити виконаною</button>
            <button type="button" class="admin-reject-btn" data-reject-booking="${b.id}">Скасувати / Відхилити</button>
          `:''}
        </div>
      </article>
    `;
  }).join(''):'<p class="admin-hint" style="text-align:center;padding:28px 0;font-size:14px;">Нових заявок поки немає.</p>';

  // Прийняти заявку
  $$('[data-accept-booking]').forEach(x=>x.onclick=async ()=>{
    const targetId=x.dataset.acceptBooking;
    let b=bookings.find(q=>String(q.id)===String(targetId));
    if(b){
      b.status='confirmed';
      saveBookings();
      renderBookings();
      if(window.renderUserBookings&&window.currentUser){
        window.renderUserBookings(window.currentUser);
      }
      refreshTimes();
      try{
        await sbFetch(`bookings?id=eq.${b.id}`,{method:'PATCH',body:JSON.stringify({status:'confirmed'})});
      }catch(e){}
    }
  });

  // Відхилити заявку з поясненням
  $$('[data-reject-booking]').forEach(x=>x.onclick=async ()=>{
    const targetId=x.dataset.rejectBooking;
    let b=bookings.find(q=>String(q.id)===String(targetId));
    if(b){
      const reason=prompt('Вкажіть причину відхилення для клієнта (необов’язково):', 'На жаль, на цей час немає вільних підйомників. Оберіть інший час.');
      if(reason===null)return; // Скасовано адміном
      b.status='rejected';
      b.reject_reason=reason.trim();
      saveBookings();
      renderBookings();
      if(window.renderUserBookings&&window.currentUser){
        window.renderUserBookings(window.currentUser);
      }
      refreshTimes();
      try{
        await sbFetch(`bookings?id=eq.${b.id}`,{method:'PATCH',body:JSON.stringify({status:'rejected',note:(b.note?b.note+' | ':'')+'Відхилено: '+reason.trim()})});
      }catch(e){}
    }
  });

  // Завершити заявку
  $$('[data-close-booking]').forEach(x=>x.onclick=async ()=>{
    const targetId=x.dataset.closeBooking;
    let b=bookings.find(q=>String(q.id)===String(targetId));
    if(b){
      b.status='closed';
      saveBookings();
      renderBookings();
      if(window.renderUserBookings&&window.currentUser){
        window.renderUserBookings(window.currentUser);
      }
      refreshTimes();
      try{
        await sbFetch(`bookings?id=eq.${b.id}`,{method:'PATCH',body:JSON.stringify({status:'completed'})});
      }catch(e){}
    }
  });
}

async function syncWithCloud(){
  const cloudBookings=await sbFetch('bookings?select=*&order=created_at.desc');
  if(cloudBookings&&Array.isArray(cloudBookings)){
    bookings=cloudBookings.map(b=>({
      id:b.id,
      name:b.name,
      phone:b.phone,
      service:b.service_name,
      date:b.booking_date,
      time:b.booking_time,
      note:b.note,
      status:b.status==='completed'||b.status==='closed'?'closed':b.status==='confirmed'||b.status==='accepted'?'confirmed':b.status==='rejected'?'rejected':'new',
      reject_reason:(b.note&&b.note.includes('Відхилено: '))?b.note.split('Відхилено: ')[1]:''
    }));
    saveBookings();
    renderBookings();
    refreshTimes();
    if(window.currentUser&&window.renderUserBookings){
      window.renderUserBookings(window.currentUser);
    }
  }
  const cloudSettings=await sbFetch('site_settings?id=eq.1&select=*');
  if(cloudSettings&&cloudSettings[0]){
    const s=cloudSettings[0];
    if(s.site_name)data.name=s.site_name;
    if(s.admin_email!==undefined)data.adminEmail=s.admin_email;
    if(s.phone)data.phone=s.phone;
    if(s.address)data.address=s.address;
    if(s.hours)data.hours=s.hours;
    if(s.map_url)data.map=s.map_url;
    if(s.whatsapp!==undefined)data.whatsapp=s.whatsapp;
    if(s.viber!==undefined)data.viber=s.viber;
    if(s.telegram!==undefined)data.telegram=s.telegram;
    if(s.closed_dates)data.closedDates=Array.isArray(s.closed_dates)?s.closed_dates.join('; '):s.closed_dates;
    if(s.closed_slots)data.closedSlots=Array.isArray(s.closed_slots)?s.closed_slots.join('; '):s.closed_slots;
    if(s.services&&Array.isArray(s.services)&&s.services.length)data.services=s.services;
    save();
    render();
    if($('#adminDialog')?.open && typeof fillAdmin==='function'){
      fillAdmin();
    }
  }
}

$$('[data-open-booking]').forEach(x=>x.onclick=()=>open('bookingDialog'));
$$('[data-open-account]').forEach(x=>x.onclick=()=>open('accountDialog'));
$$('[data-open-review]').forEach(x=>x.onclick=()=>open('reviewDialog'));
$$('[data-open-admin]').forEach(x=>x.onclick=()=>{fillAdmin();open('adminDialog')});
$$('[data-close]').forEach(x=>x.onclick=closeAll);
$('#year').textContent=new Date().getFullYear();
$('#bookingForm [name=date]').min=new Date().toISOString().slice(0,10);
$('#bookingForm [name=date]').onchange=refreshTimes;

function formatPhone(val){
  let digits=val.replace(/\D/g,'');
  if(digits.startsWith('380'))digits=digits.slice(3);
  else if(digits.startsWith('0'))digits=digits.slice(1);
  digits=digits.slice(0,9);
  if(!digits.length)return '';
  let res='+380';
  if(digits.length>0)res+=' ('+digits.slice(0,2);
  if(digits.length>=2)res+=') '+digits.slice(2,5);
  if(digits.length>=5)res+='-'+digits.slice(5,7);
  if(digits.length>=7)res+='-'+digits.slice(7,9);
  return res;
}

document.querySelectorAll('input[type=tel]:not([data-phone-local]), input[name=phone]:not([data-phone-hidden])').forEach(inp=>{
  inp.addEventListener('input',()=>{
    if(!inp.value.trim())return;
    const formatted=formatPhone(inp.value);
    if(formatted)inp.value=formatted;
  });
});

const copyAddrBtn=document.querySelector('[data-copy-address]');
if(copyAddrBtn){
  copyAddrBtn.onclick=async ()=>{
    const fullAddr=data.address||'вул. Яблунева, 20, Нове, Київська область, 08150';
    try{
      await navigator.clipboard.writeText(fullAddr);
      const prev=copyAddrBtn.textContent;
      copyAddrBtn.textContent='✅ Адресу скопійовано!';
      setTimeout(()=>{copyAddrBtn.textContent=prev;},2000);
    }catch(e){
      prompt('Скопіюйте адресу:',fullAddr);
    }
  };
}

$('#bookingForm').onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target),
      bDate=f.get('date'),
      bTime=f.get('time'),
      bName=f.get('name'),
      bPhone=f.get('phone')?String(f.get('phone')).trim():'',
      bEmail=f.get('email')?String(f.get('email')).trim():'',
      bService=f.get('service'),
      bNote=f.get('note');

  const phoneDigits=bPhone.replace(/\D/g,'');
  if(phoneDigits.length<10){
    alert('Будь ласка, вкажіть коректний номер телефону (наприклад: +380 68 067 9909)');
    return;
  }

  let issue=unavailable(bDate,bTime);
  if(issue){$('[data-availability]').textContent=issue;refreshTimes();return;}

  const submitBtn=$('#bookingForm [type=submit]');
  if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='Надсилаємо...';}

  let fullNote=bNote||'';
  if(bEmail){fullNote=fullNote?`${fullNote} · Пошта: ${bEmail}`:`Пошта: ${bEmail}`;}

  let createdId=Date.now();
  const res=await sbFetch('bookings',{
    method:'POST',
    headers:{'Prefer':'return=representation'},
    body:JSON.stringify({
      name:bName,
      phone:bPhone,
      service_name:bService,
      booking_date:bDate,
      booking_time:bTime,
      note:fullNote,
      status:'pending'
    })
  });
  if(res&&res[0]&&res[0].id)createdId=res[0].id;

  bookings.push({id:createdId,name:bName,phone:bPhone,service:bService,date:bDate,time:bTime,note:bNote,status:'new'});
  saveBookings();
  $('#bookingForm').hidden=true;
  $('.success',$('#bookingDialog')).hidden=false;
  if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML='Надіслати заявку <span>→</span>';}
  renderBookings();
  refreshTimes();
};

$('#reviewForm').onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target),
      rName=f.get('name'),
      rRating=+f.get('rating'),
      rText=f.get('text');

  await sbFetch('reviews',{
    method:'POST',
    body:JSON.stringify({name:rName,rating:rRating,text:rText,is_approved:true})
  });
  reviews.push({name:rName,rating:rRating,text:rText,date:'Щойно додано'});
  saveReviews();
  render();
  closeAll();
};

$$('[data-tab]').forEach(x=>x.onclick=()=>{
  $$('[data-tab]').forEach(y=>y.classList.toggle('active',y===x));
  $$('[data-panel]').forEach(y=>y.hidden=y.dataset.panel!==x.dataset.tab);
});



$$('[data-admin-tab]').forEach(x=>x.onclick=()=>{
  $$('[data-admin-tab]').forEach(y=>y.classList.toggle('active',y===x));
  $$('[data-admin-panel]').forEach(y=>y.hidden=y.dataset.adminPanel!==x.dataset.adminTab);
});

$('[data-add-service]').onclick=()=>{
  $('[data-admin-services]').insertAdjacentHTML('beforeend',row());
  bindRemove();
};

async function syncAdminCalendarToCloud(){
  try{
    await sbFetch('site_settings?id=eq.1',{
      method:'PATCH',
      body:JSON.stringify({
        closed_dates:split(data.closedDates),
        closed_slots:split(data.closedSlots)
      })
    });
  }catch(e){}
}

$('#adminForm').onsubmit=async e=>{
  e.preventDefault();
  const submitBtn=$('#adminForm button:not([type=button])');
  const originalText=submitBtn?submitBtn.textContent:'';
  if(submitBtn){
    submitBtn.disabled=true;
    submitBtn.textContent='Збереження в базі даних...';
  }

  let f=e.target;
  ['name','adminEmail','phone','address','hours','map','whatsapp','viber','telegram','closedDates','closedSlots'].forEach(k=>f.elements[k]?data[k]=f.elements[k].value:null);
  data.services=$$('[data-admin-services] .admin-service').map(r=>[
    r.querySelector('[data-k="0"]').value.trim(),
    (r.querySelector('[data-k="1"]')?.value || 'Якісний ремонт та обслуговування').trim(),
    r.querySelector('[data-k="2"]').value.trim()
  ]).filter(s=>s[0]);

  save();
  render();

  try{
    await sbFetch('site_settings?id=eq.1',{
      method:'PATCH',
      body:JSON.stringify({
        site_name:data.name,
        admin_email:data.adminEmail||'',
        phone:data.phone,
        address:data.address,
        hours:data.hours,
        map_url:data.map,
        whatsapp:data.whatsapp,
        viber:data.viber,
        telegram:data.telegram,
        closed_dates:split(data.closedDates),
        closed_slots:split(data.closedSlots),
        services:data.services
      })
    });
    if(submitBtn){
      submitBtn.textContent='✅ Збережено на сайті!';
      fillAdmin();
      setTimeout(()=>{
        submitBtn.disabled=false;
        submitBtn.textContent=originalText;
      },1000);
    }
  }catch(err){
    if(submitBtn){
      submitBtn.disabled=false;
      submitBtn.textContent=originalText;
    }
  }
};

$$('[data-logout-admin]').forEach(btn=>{
  btn.onclick=()=>{
    localStorage.removeItem('stoUserSession');
    window.currentUser=null;
    closeAll();
    if(typeof resetToAuth==='function')resetToAuth();
  };
});

render();
syncWithCloud();

window.addEventListener('focus', syncWithCloud);
setInterval(syncWithCloud, 20000);
setInterval(updateHeroStatus, 60000);

const prevCalBtn=$('[data-admin-cal-prev]');
if(prevCalBtn)prevCalBtn.onclick=()=>{adminCalDate.setMonth(adminCalDate.getMonth()-1);renderAdminCal();};
const nextCalBtn=$('[data-admin-cal-next]');
if(nextCalBtn)nextCalBtn.onclick=()=>{adminCalDate.setMonth(adminCalDate.getMonth()+1);renderAdminCal();};

if(window.location.search.includes('action=admin')){
  setTimeout(()=>{
    open('adminDialog');
  },400);
}
