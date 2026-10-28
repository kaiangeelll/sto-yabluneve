const serviceCatalog = [
  ['Встановлення та ремонт автокондиціонерів','Діагностика, заправка та ремонт систем кондиціювання','від 600 ₴'],
  ['Гальмівні системи','Перевірка, ремонт і заміна компонентів гальмівної системи','від 500 ₴'],
  ['Діагностика двигуна','Комп’ютерна та механічна діагностика двигуна','від 400 ₴'],
  ['Автоелектрика','Пошук несправностей, проводка, стартер і генератор','від 400 ₴'],
  ['Заміна оливи','Заміна оливи, фільтрів і технічних рідин','від 500 ₴'],
  ['Ремонт кондиціонерів','Ремонт компресора, трубок, радіатора та витоків','від 700 ₴'],
  ['Ремонт двигунів','Діагностика та ремонт двигуна будь-якої складності','від 1 500 ₴'],
  ['Ремонт електрообладнання','Ремонт вузлів і електронних компонентів авто','від 500 ₴'],
  ['Кермове керування та підвіска','Ремонт рульової системи, ходової та підвіски','від 500 ₴'],
  ['Ремонт коробок передач','Діагностика, обслуговування та ремонт КПП','від 1 500 ₴']
];
const base = {schema:2,name:'СТО Евакуатор',phone:'+380 68 067 9909',address:'вул. Яблунева, 20, Нове, Київська область, 08150',hours:'Щодня · 09:00–19:00',map:'https://maps.app.goo.gl/B1xcUJHgVeRC3Avm7',services:serviceCatalog};
let data = JSON.parse(localStorage.getItem('stoData') || 'null') || base;
if(data.schema !== 2){data=base; localStorage.setItem('stoData',JSON.stringify(data));}
let bookings = JSON.parse(localStorage.getItem('stoBookings') || '[]');
let reviews = JSON.parse(localStorage.getItem('stoReviews') || 'null') || [
  {name:'Клієнт Google Maps',rating:5,text:'Якісне та індивідуальне обслуговування. Рекомендую майстра.',date:'Відгук із Google Maps'},
  {name:'Клієнт Google Maps',rating:5,text:'Несправність усунули якісно й швидко. Тепер звертаюся сюди з усіх питань авто.',date:'Відгук із Google Maps'}
];
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const escapeHtml=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const stars=n=>'★'.repeat(Number(n))+'☆'.repeat(5-Number(n));
const save=()=>localStorage.setItem('stoData',JSON.stringify(data));
const saveBookings=()=>localStorage.setItem('stoBookings',JSON.stringify(bookings));
const saveReviews=()=>localStorage.setItem('stoReviews',JSON.stringify(reviews));
function bookingStatus(b){if(b.status==='closed')return 'Завершено'; if(new Date(`${b.date}T${b.time}`)<new Date())return 'Завершено'; return 'Нова';}
function render(){
 document.title=`${data.name} — ремонт авто в Новому`;
 const digits=data.phone.replace(/\D/g,'');
 $$('[data-phone]').forEach(e=>{e.textContent=data.phone;e.href='tel:'+digits});
 $$('[data-address]').forEach(e=>e.innerHTML=escapeHtml(data.address).replace(', ', ',<br />'));
 $$('[data-hours]').forEach(e=>e.textContent=data.hours); $$('[data-map]').forEach(e=>e.href=data.map);
 $$('[data-whatsapp]').forEach(e=>e.href=`https://wa.me/${digits}`); $$('[data-viber]').forEach(e=>e.href=`viber://chat?number=%2B${digits}`);
 $('[data-services]').innerHTML=data.services.map((s,i)=>`<article class="service"><span class="service-num">${String(i+1).padStart(2,'0')}</span><h3>${escapeHtml(s[0])}</h3><p>${escapeHtml(s[1])}</p><span class="price">${escapeHtml(s[2])}</span></article>`).join('');
 $('[data-service-options]').innerHTML='<option value="">Оберіть послугу</option>'+data.services.map(s=>`<option>${escapeHtml(s[0])}</option>`).join('');
 $('[data-reviews]').innerHTML=reviews.slice().reverse().map(r=>`<article class="review-card"><header><div><strong>${escapeHtml(r.name)}</strong><span class="stars">${stars(r.rating)}</span></div><time>${escapeHtml(r.date)}</time></header><p>${escapeHtml(r.text)}</p></article>`).join('');
 const actual=reviews.filter(r=>r.date!=='Відгук із Google Maps'); if(actual.length){$('[data-rating]').textContent=((4.3*18+actual.reduce((a,r)=>a+Number(r.rating),0))/(18+actual.length)).toFixed(1);}
 renderBookings();
}
function open(id){const dialog=$('#'+id); if(id==='bookingDialog'){$('#bookingForm').hidden=false;$('.success',dialog).hidden=true;$('#bookingForm').reset();} if(id==='accountDialog'){$('.account-tabs').hidden=false;$('.account-success').hidden=true;$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='login'));$$('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!=='login');$('#loginForm').reset();$('#registerForm').reset();} dialog.showModal();}
function closeAll(){$$('dialog[open]').forEach(d=>d.close());}
function serviceRow(s=['Нова послуга','Короткий опис','від 500 ₴']){return `<div class="admin-service"><input data-k="0" value="${escapeHtml(s[0])}" aria-label="Назва послуги"><input data-k="2" value="${escapeHtml(s[2])}" aria-label="Ціна"><button type="button" class="remove-service" aria-label="Видалити послугу">×</button></div>`;}
function fillAdmin(){const f=$('#adminForm');['name','phone','address','hours','map'].forEach(k=>f.elements[k].value=data[k]);$('[data-admin-services]').innerHTML=data.services.map(serviceRow).join('');$$('.remove-service').forEach(b=>b.onclick=()=>b.closest('.admin-service').remove());renderBookings();}
function renderBookings(){
 const target=$('[data-bookings]'); if(!target)return; const active=bookings.filter(b=>bookingStatus(b)==='Нова').length;$$('[data-booking-count]').forEach(x=>x.textContent=active);
 target.innerHTML=bookings.length?bookings.slice().reverse().map(b=>{const status=bookingStatus(b);return `<article class="booking-admin-card"><header><strong>${escapeHtml(b.name)} · ${escapeHtml(b.service)}</strong><span class="status ${status==='Завершено'?'done':''}">${status}</span></header><p>${escapeHtml(b.date)} о ${escapeHtml(b.time)} · ${escapeHtml(b.phone)}${b.note?' · '+escapeHtml(b.note):''}</p>${status==='Нова'?`<button data-close-booking="${b.id}">Позначити виконаною</button>`:''}</article>`;}).join(''):'<p class="admin-hint">Нових заявок поки немає.</p>';
 $$('[data-close-booking]').forEach(b=>b.onclick=()=>{const item=bookings.find(x=>String(x.id)===b.dataset.closeBooking); if(item){item.status='closed';saveBookings();renderBookings();}});
}
$$('[data-open-booking]').forEach(b=>b.onclick=()=>open('bookingDialog'));$$('[data-open-account]').forEach(b=>b.onclick=()=>open('accountDialog'));$$('[data-open-review]').forEach(b=>b.onclick=()=>open('reviewDialog'));$$('[data-open-admin]').forEach(b=>b.onclick=()=>{fillAdmin();open('adminDialog')});$$('[data-close]').forEach(b=>b.onclick=closeAll);
$('#year').textContent=new Date().getFullYear();$('#bookingForm [name=date]').min=new Date().toISOString().slice(0,10);
$('#bookingForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);bookings.push({id:Date.now(),name:fd.get('name'),phone:fd.get('phone'),service:fd.get('service'),date:fd.get('date'),time:fd.get('time'),note:fd.get('note'),status:'new'});saveBookings();$('#bookingForm').hidden=true;$('.success',$('#bookingDialog')).hidden=false;renderBookings();};
$('#reviewForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);reviews.push({name:fd.get('name'),rating:fd.get('rating'),text:fd.get('text'),date:'Щойно додано'});saveReviews();render();closeAll();};
$$('[data-tab]').forEach(b=>b.onclick=()=>{$$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==b.dataset.tab)});
function accountDone(e){e.preventDefault();$$('[data-panel]').forEach(x=>x.hidden=true);$('.account-tabs').hidden=true;$('.account-success').hidden=false;}$('#loginForm').onsubmit=accountDone;$('#registerForm').onsubmit=accountDone;
$$('[data-admin-tab]').forEach(b=>b.onclick=()=>{$$('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-admin-panel]').forEach(x=>x.hidden=x.dataset.adminPanel!==b.dataset.adminTab)});
$( '[data-add-service]').onclick=()=>{$('[data-admin-services]').insertAdjacentHTML('beforeend',serviceRow());$$('.remove-service').forEach(b=>b.onclick=()=>b.closest('.admin-service').remove());};
$('#adminForm').onsubmit=e=>{e.preventDefault();const f=e.target;['name','phone','address','hours','map'].forEach(k=>data[k]=f.elements[k].value);data.services=$$('[data-admin-services] .admin-service').map(row=>[row.querySelector('[data-k="0"]').value,'Опис послуги уточнює майстер',row.querySelector('[data-k="2"]').value]).filter(s=>s[0].trim());save();render();closeAll();};
render();
