(()=>{
  const input=document.querySelector('#bookingForm [name=date]');
  if(!input)return;
  const holder=input.parentElement,
        box=document.createElement('div'),
        today=new Date();
  today.setHours(0,0,0,0);
  let index=0,yearsOpen=false;

  box.className='date-picker';
  box.innerHTML='<div class="calendar-head"><button type="button" data-prev>←</button><button type="button" class="calendar-title">Оберіть дату</button><button type="button" data-next>→</button></div><div class="calendar-week"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span style="color:#d9534f;">Нд</span></div><div class="calendar-days"></div><div class="calendar-years" hidden></div>';
  holder.append(box);

  const pad=n=>String(n).padStart(2,'0'),
        dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
        monthAt=i=>new Date(today.getFullYear(),today.getMonth()+i,1);

  function getClosedDates(){
    try{
      const stoData=JSON.parse(localStorage.getItem('stoData')||'{}');
      return (stoData.closedDates||'').split(';').map(x=>x.trim()).filter(Boolean);
    }catch(e){
      return [];
    }
  }

  function draw(){
    const view=monthAt(index),
          names=['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'],
          days=box.querySelector('.calendar-days'),
          years=box.querySelector('.calendar-years');

    box.querySelector('.calendar-title').textContent=`${names[view.getMonth()]} ${view.getFullYear()}`;
    box.querySelector('[data-prev]').disabled=index===0;
    box.querySelector('[data-next]').disabled=index===6;
    days.hidden=yearsOpen;
    years.hidden=!yearsOpen;

    if(yearsOpen){
      const list=[...new Set(Array.from({length:7},(_,i)=>monthAt(i).getFullYear()))];
      years.innerHTML=list.map(y=>`<button type="button" data-year="${y}" class="${view.getFullYear()===y?'active':''}">${y}</button>`).join('');
      years.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>{
        const n=Array.from({length:7},(_,i)=>i).find(i=>monthAt(i).getFullYear()===+b.dataset.year);
        if(n!==undefined)index=n;
        yearsOpen=false;
        draw();
      });
      return;
    }

    const first=new Date(view.getFullYear(),view.getMonth(),1),
          offset=(first.getDay()+6)%7,
          last=new Date(view.getFullYear(),view.getMonth()+1,0).getDate(),
          closedAdmin=getClosedDates();

    days.innerHTML='<span></span>'.repeat(offset)+Array.from({length:last},(_,i)=>{
      const d=new Date(view.getFullYear(),view.getMonth(),i+1);
      const isPast=d<today;
      const isSunday=d.getDay()===0;
      const key=dateKey(d);
      const isClosed=closedAdmin.includes(key);

      const disabled=isPast||isSunday||isClosed;
      let title='';
      if(isSunday)title='Неділя — вихідний день';
      else if(isClosed)title='Вихідний день СТО';
      else if(isPast)title='Минула дата';

      let cls=['cal-day-cell'];
      if(input.value===key)cls.push('selected');
      if(isSunday)cls.push('is-sunday');
      if(isClosed)cls.push('is-closed-admin');

      return `<button type="button" data-day="${key}" ${disabled?'disabled':''} title="${title}" class="${cls.join(' ')}">${i+1}</button>`;
    }).join('');

    days.querySelectorAll('[data-day]:not(:disabled)').forEach(b=>b.onclick=()=>{
      input.value=b.dataset.day;
      input.dispatchEvent(new Event('change',{bubbles:true}));
      draw();
    });
  }

  box.querySelector('[data-prev]').onclick=()=>{if(index){index--;draw();}};
  box.querySelector('[data-next]').onclick=()=>{if(index<6){index++;draw();}};
  box.querySelector('.calendar-title').onclick=()=>{yearsOpen=!yearsOpen;draw();};

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-open-booking],[data-service]'))setTimeout(draw,0);
  });

  draw();
  window.redrawBookingCalendar=draw;
})();
