const catalog=[['Встановлення та ремонт автокондиціонерів','Діагностика, заправка та ремонт систем кондиціювання','від 600 ₴'],['Гальмівні системи','Перевірка, ремонт і заміна компонентів гальмівної системи','від 500 ₴'],['Діагностика двигуна','Комп’ютерна та механічна діагностика двигуна','від 400 ₴'],['Автоелектрика','Пошук несправностей, проводка, стартер і генератор','від 400 ₴'],['Заміна оливи','Заміна оливи, фільтрів і технічних рідин','від 500 ₴'],['Ремонт кондиціонерів','Ремонт компресора, трубок, радіатора та витоків','від 700 ₴'],['Ремонт двигунів','Діагностика та ремонт двигуна будь-якої складності','від 1 500 ₴'],['Ремонт електрообладнання','Ремонт вузлів і електронних компонентів авто','від 500 ₴'],['Кермове керування та підвіска','Ремонт рульової системи, ходової та підвіски','від 500 ₴'],['Ремонт коробок передач','Діагностика, обслуговування та ремонт КПП','від 1 500 ₴']];
const base={schema:3,name:'СТО Евакуатор',adminEmail:'',phone:'+380 68 067 9909',address:'вул. Яблунева, 20, Нове, Київська область, 08150',hours:'Щодня · 09:00–19:00',map:'https://maps.app.goo.gl/B1xcUJHgVeRC3Avm7',whatsapp:'',viber:'',telegram:'',closedDates:'',closedSlots:'',services:catalog};
let data=JSON.parse(localStorage.getItem('stoData')||'null')||base;if(data.schema!==3){data=base;localStorage.setItem('stoData',JSON.stringify(data));}
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
const split=s=>(s||'').split(';').map(x=>x.trim()).filter(Boolean),status=b=>b.status==='closed'||new Date(`${b.date}T${b.time}`)<new Date()?'Завершено':'Нова';

function linkFor(kind,digits){let v=data[kind]?.trim();if(!v)return '';if(/^https?:|^viber:/.test(v))return v;if(kind==='whatsapp')return `https://wa.me/${v.replace(/\D/g,'')}`;if(kind==='viber')return `viber://chat?number=%2B${v.replace(/\D/g,'')}`;return v;}

function render(){
  let digits=data.phone.replace(/\D/g,'');document.title=`${data.name} — ремонт авто в Новому`;
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
}

function unavailable(date,time){
  if(split(data.closedDates).includes(date))return 'Цей день зачинений адміністратором.';
  if(split(data.closedSlots).includes(`${date} ${time}`))return 'Цей час недоступний.';
  if(bookings.some(b=>b.date===date&&b.time===time&&status(b)==='Нова'))return 'Цей час уже зайнятий.';
  return '';
}

function refreshTimes(){
  let date=$('#bookingForm [name=date]').value,select=$('[data-time-options]'),note=$('[data-availability]'),submit=$('#bookingForm [type=submit]');
  if(!date){select.innerHTML='<option value="">Спочатку оберіть дату</option>';select.disabled=true;note.textContent='Оберіть дату, щоб побачити вільний час.';submit.disabled=true;return;}
  let closed=split(data.closedDates).includes(date);
  let times=['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  let free=times.filter(t=>!unavailable(date,t));
  select.innerHTML=free.length?free.map(t=>`<option>${t}</option>`).join(''):'<option value="">Вільного часу немає</option>';
  select.disabled=!free.length;submit.disabled=!free.length;
  note.textContent=closed?'На цю дату запис недоступний — сервіс зачинений.':free.length?`Доступно ${free.length} вільн. слотів. Зайнятий час не показується.`:'На цю дату немає вільного часу. Оберіть інший день.';
}

function open(id,service=''){
  let d=$('#'+id);
  if(id==='bookingDialog'){
    $('#bookingForm').hidden=false;
    $('.success',d).hidden=true;
    $('#bookingForm').reset();
    if(service)$('[data-service-options]').value=service;
    try{
      const u=JSON.parse(localStorage.getItem('stoUserSession')||'null');
      if(u){
        if(u.name&&u.role!=='admin')$('#bookingForm [name=name]').value=u.name;
        if(u.phone)$('#bookingForm [name=phone]').value=u.phone;
        if(u.email&&$('#bookingForm [name=email]'))$('#bookingForm [name=email]').value=u.email;
      }
    }catch(e){}
    refreshTimes();
  }
  if(id==='accountDialog'){
    let u=null;
    try{u=JSON.parse(localStorage.getItem('stoUserSession')||'null');}catch(e){}
    if(u&&window.showUserProfile){
      window.showUserProfile(u);
    }else{
      const uv=$('#accountUserView');if(uv)uv.hidden=true;
      const gv=$('#accountGuestView');if(gv)gv.hidden=false;
      $$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='login'));
      $$('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!=='login');
    }
  }
  d.showModal();
}
function closeAll(){$$('dialog[open]').forEach(x=>x.close())}

function row(s=['Нова послуга','Опис послуги','від 500 ₴']){return `<div class="admin-service"><input data-k="0" value="${esc(s[0])}"><input data-k="2" value="${esc(s[2])}"><button type="button" class="remove-service">×</button></div>`}
function bindRemove(){$$('.remove-service').forEach(x=>x.onclick=()=>x.closest('.admin-service').remove())}

function fillAdmin(){
  let f=$('#adminForm');
  ['name','adminEmail','phone','address','hours','map','whatsapp','viber','telegram','closedDates','closedSlots'].forEach(k=>f.elements[k]?f.elements[k].value=data[k]||'':null);
  $('[data-admin-services]').innerHTML=data.services.map(row).join('');
  bindRemove();
  renderBookings();
}

function renderBookings(){
  let t=$('[data-bookings]');if(!t)return;
  let active=bookings.filter(b=>status(b)==='Нова').length;
  $$('[data-booking-count]').forEach(x=>x.textContent=active);
  t.innerHTML=bookings.length?bookings.slice().reverse().map(b=>{
    let st=status(b);
    return `<article class="booking-admin-card"><header><strong>${esc(b.name)} · ${esc(b.service)}</strong><span class="status ${st==='Завершено'?'done':''}">${st}</span></header><p>${esc(b.date)} о ${esc(b.time)} · ${esc(b.phone)}${b.note?' · '+esc(b.note):''}</p>${st==='Нова'?`<button data-close-booking="${b.id}">Позначити виконаною</button>`:''}</article>`;
  }).join(''):'<p class="admin-hint">Нових заявок поки немає.</p>';
  $$('[data-close-booking]').forEach(x=>x.onclick=async ()=>{
    let b=bookings.find(q=>String(q.id)===x.dataset.closeBooking);
    if(b){
      b.status='closed';
      saveBookings();
      renderBookings();
      if(String(b.id).includes('-')){
        await sbFetch(`bookings?id=eq.${b.id}`,{method:'PATCH',body:JSON.stringify({status:'completed'})});
      }
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
      status:b.status==='completed'||b.status==='closed'?'closed':'new'
    }));
    saveBookings();
    renderBookings();
    refreshTimes();
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

$('#bookingForm').onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target),
      bDate=f.get('date'),
      bTime=f.get('time'),
      bName=f.get('name'),
      bPhone=f.get('phone'),
      bEmail=f.get('email')?String(f.get('email')).trim():'',
      bService=f.get('service'),
      bNote=f.get('note');

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

$('#adminForm').onsubmit=async e=>{
  e.preventDefault();
  let f=e.target;
  ['name','adminEmail','phone','address','hours','map','whatsapp','viber','telegram','closedDates','closedSlots'].forEach(k=>f.elements[k]?data[k]=f.elements[k].value:null);
  data.services=$$('[data-admin-services] .admin-service').map(r=>[r.querySelector('[data-k="0"]').value,'Опис послуги уточнює майстер',r.querySelector('[data-k="2"]').value]).filter(s=>s[0].trim());
  save();
  render();
  closeAll();

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
};

render();
syncWithCloud();
