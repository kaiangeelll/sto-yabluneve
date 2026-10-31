(()=>{
  const SUPABASE_URL='https://nabwuaxzogfuzaznvmph.supabase.co';
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYnd1YXh6b2dmdXphem52bXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzc2MDQsImV4cCI6MjEwODc1MzYwNH0.bvkJPsimj--W21Zort-I1saszUhbI2um96VUlxgwS2U';

  let sb=null;
  if(window.supabase&&window.supabase.createClient){
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    });
  }

  const dialog=document.querySelector('#accountDialog'),
        userView=dialog?dialog.querySelector('#accountUserView'):null,
        guestView=dialog?dialog.querySelector('#accountGuestView'):null,
        loginForm=document.querySelector('#loginForm'),
        regForm=document.querySelector('#registerForm'),
        forgotForm=document.querySelector('#forgotForm'),
        resetForm=document.querySelector('#resetPassForm'),
        editForm=document.querySelector('#profileEditForm'),
        adminBox=dialog?dialog.querySelector('[data-admin-panel-btn-box]'):null,
        userTabs=dialog?dialog.querySelector('[data-user-tabs]'):null,
        loginError=dialog?dialog.querySelector('[data-login-error]'):null,
        loginSuccess=dialog?dialog.querySelector('[data-login-success]'):null,
        regError=dialog?dialog.querySelector('[data-register-error]'):null,
        forgotError=dialog?dialog.querySelector('[data-forgot-error]'):null,
        resetError=dialog?dialog.querySelector('[data-reset-error]'):null,
        resetDisplay=dialog?dialog.querySelector('[data-reset-user-display]'):null,
        tabs=dialog?dialog.querySelector('.account-tabs'):null,
        panels=dialog?dialog.querySelectorAll('[data-panel]'):[];

  window.currentUser=null;
  let targetResetUser=null;

  function normPhone(p){
    return (p||'').replace(/\D/g,'');
  }

  function isPhoneMatch(p1,p2){
    const c1=normPhone(p1);
    const c2=normPhone(p2);
    if(!c1||!c2||c1.length<7||c2.length<7)return false;
    if(c1===c2)return true;
    return c1.endsWith(c2.slice(-9))||c2.endsWith(c1.slice(-9));
  }

  const esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function populateReschedTimes(bookingId, targetDate){
    const box=document.getElementById(`resched-box-${bookingId}`);
    if(!box)return;
    const timeSelect=box.querySelector(`[data-resched-time-input="${bookingId}"]`);
    const msgEl=box.querySelector(`[data-resched-msg="${bookingId}"]`);
    const sendBtn=box.querySelector(`[data-send-resched="${bookingId}"]`);
    if(!timeSelect)return;

    if(!targetDate){
      timeSelect.innerHTML='<option value="">Спочатку оберіть дату</option>';
      timeSelect.disabled=true;
      if(sendBtn)sendBtn.disabled=true;
      return;
    }

    const d=new Date(targetDate+'T12:00:00');
    const day=d.getDay();
    if(day===0){
      timeSelect.innerHTML='<option value="" disabled selected>Неділя — вихідний день</option>';
      timeSelect.disabled=true;
      if(sendBtn)sendBtn.disabled=true;
      if(msgEl){
        msgEl.textContent='У неділю СТО не працює (вихідний). Будь ласка, оберіть будній день або суботу.';
        msgEl.style.color='#c0392b';
      }
      return;
    }

    let times=['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
    if(day===6)times=['09:00','10:00','11:00','12:00','13:00','14:00'];

    let allBookings=[];
    try{allBookings=JSON.parse(localStorage.getItem('stoBookings')||'[]');}catch(e){}

    let freeCount=0;
    let html='<option value="">Оберіть зручний час</option>';

    times.forEach(t=>{
      let isBusy=false;
      if(window.unavailable){
        const reason=window.unavailable(targetDate,t,bookingId);
        if(reason)isBusy=true;
      }else{
        isBusy=allBookings.some(b=>{
          if(String(b.id)===String(bookingId))return false;
          const st=(b.status||'').toLowerCase();
          if(st==='closed'||st==='completed'||st==='rejected'||st==='cancelled')return false;
          if(b.date===targetDate&&(b.time||'').slice(0,5)===t)return true;
          if(b.reschedule_date===targetDate&&(b.reschedule_time||'').slice(0,5)===t)return true;
          return false;
        });
      }

      if(!isBusy){
        freeCount++;
        html+=`<option value="${t}">🟢 ${t} — Вільно</option>`;
      }else{
        html+=`<option value="${t}" disabled style="color:#888;background:#f5f5f5;">❌ ${t} — Зайнято</option>`;
      }
    });

    timeSelect.innerHTML=html;
    timeSelect.disabled=!freeCount;
    if(sendBtn)sendBtn.disabled=!freeCount;

    if(msgEl){
      if(freeCount>0){
        msgEl.textContent=`Доступно ${freeCount} вільних слотів.${day===6?' (Субота до 15:00).':''}`;
        msgEl.style.color='#256528';
      }else{
        msgEl.textContent='На цю дату весь час зайнято. Будь ласка, оберіть іншу дату.';
        msgEl.style.color='#c0392b';
      }
    }
  }

  const IGNORED_TEST_IDS=['5e6377e6-276b-431a-8358-caa628ee17b3','9497c1e7-2cfa-4de6-87fc-a897c03359a1','56e56666-3934-44dd-89d7-d6563a293929'];

  function renderUserBookings(user){
    const listEls=document.querySelectorAll('[data-my-bookings-list], [data-my-inline-bookings-list]'),
          countEls=document.querySelectorAll('[data-my-count], [data-user-active-count]');
    if(!listEls.length)return;

    let allBookings=[];
    try{
      let stored=JSON.parse(localStorage.getItem('stoBookings')||'[]');
      allBookings=stored.filter(b=>!IGNORED_TEST_IDS.includes(String(b.id))&&b.status!=='deleted');
      if(allBookings.length!==stored.length){
        localStorage.setItem('stoBookings',JSON.stringify(allBookings));
      }
    }catch(e){}

    const uPhone=(user.phone||'').replace(/\D/g,''),
          uName=(user.name||'').toLowerCase().trim(),
          uEmail=(user.email||'').toLowerCase().trim();

    const my=allBookings.filter(b=>{
      if(IGNORED_TEST_IDS.includes(String(b.id))||b.status==='archived'||b.status==='deleted')return false;
      const bPhone=b.phone||'';
      const bName=(b.name||'').toLowerCase().trim();
      const bNote=(b.note||'').toLowerCase();
      if(uPhone&&isPhoneMatch(uPhone,bPhone))return true;
      if(uName&&bName&&uName.length>=3&&(bName===uName||bName.includes(uName)||uName.includes(bName)))return true;
      if(uEmail&&uEmail.length>=5&&bNote.includes(uEmail))return true;
      return false;
    });

    const activeCount=my.filter(b=>b.status!=='closed'&&b.status!=='completed'&&b.status!=='rejected'&&b.status!=='cancelled').length;
    countEls.forEach(c=>c.textContent=activeCount);

    let html='';
    if(!my.length){
      html='<p style="font-size:13px;color:#6d7f70;text-align:center;padding:16px 0;grid-column:1/-1;">У вас поки немає активних записів. Натисніть кнопку «+ Записатися на сервіс», щоб обрати зручний час!</p>';
    }else{
      html=my.slice().reverse().map(b=>{
        const isCompleted=b.status==='closed'||b.status==='completed';
        const isConfirmed=b.status==='confirmed'||b.status==='accepted';
        const isRejected=b.status==='rejected';
        const isCancelled=b.status==='cancelled';
        const isReschedReq=b.status==='reschedule_requested';
        const isReschedRej=b.status==='reschedule_rejected';
        const isPastDate=!isCompleted&&!isRejected&&!isCancelled&&new Date(`${b.date}T${b.time}`)<new Date();

        let badgeText='🕒 Очікує підтвердження';
        let badgeClass='booking-badge pending';
        let hintText='Майстер невдовзі зателефонує або підтвердить запис.';

        if(isCompleted){
          badgeText='✅ Виконано';
          badgeClass='booking-badge done';
          hintText='Обслуговування успішно завершено.';
        }else if(isCancelled){
          badgeText='🚫 Скасовано вами';
          badgeClass='booking-badge cancelled';
          hintText='Цей запис було скасовано.';
        }else if(isReschedReq){
          badgeText='⏳ Запит на перенесення';
          badgeClass='booking-badge reschedule-requested';
          hintText=`Очікується погодження майстром нового часу: <b>${esc(b.reschedule_date)} об ${esc(b.reschedule_time)}</b>`;
        }else if(isReschedRej){
          badgeText='⚠️ Потрібно обрати інший час';
          badgeClass='booking-badge rejected';
          hintText=b.reschedule_admin_message?`Відповідь майстра СТО: «${esc(b.reschedule_admin_message)}»`:'Майстер не може прийняти авто на цей час. Будь ласка, оберіть інший час.';
        }else if(isConfirmed){
          badgeText='🟢 Прийнято майстром';
          badgeClass='booking-badge confirmed';
          hintText='Чекаємо вас на СТО у призначений час!';
        }else if(isRejected){
          badgeText='❌ Відхилено';
          badgeClass='booking-badge rejected';
          hintText=b.reject_reason?`Причина: ${esc(b.reject_reason)}`:'На цей час немає вільного місця. Будь ласка, оберіть інший день.';
        }else if(isPastDate){
          badgeText='Минулий візит';
          badgeClass='booking-badge past';
          hintText='';
        }

        const canAct=!isCompleted && !isRejected && !isCancelled && !isPastDate;

        return `
          <div class="user-booking-card ${isCompleted?'is-done':''} ${isRejected?'is-rejected':''} ${isCancelled?'is-cancelled':''} ${isReschedReq?'is-resched':''}">
            <div class="user-booking-head">
              <strong>${esc(b.service||'Ремонт авто')}</strong>
              <span class="${badgeClass}">${badgeText}</span>
            </div>
            <p class="user-booking-meta">📅 Поточний час: <b>${esc(b.date)}</b> об <b>${esc(b.time)}</b></p>
            ${isReschedReq?`
              <div class="user-resched-banner" style="margin:8px 0; padding:8px 12px; background:#fff8e6; border:1px solid #fcd34d; border-radius:8px; font-size:12px; color:#92400e;">
                <b>Запит на новий час:</b> 📅 ${esc(b.reschedule_date)} об ${esc(b.reschedule_time)}
                ${b.reschedule_reason?`<br /><span>Причина: ${esc(b.reschedule_reason)}</span>`:''}
              </div>
            `:''}
            ${isReschedRej?`
              <div class="user-resched-banner" style="margin:8px 0; padding:8px 12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; font-size:12px; color:#991b1b;">
                <b>Відповідь майстра СТО:</b> ${esc(b.reschedule_admin_message||'На жаль, цей час зайнятий.')}<br />
                <span style="color:#6b7280;">Ви можете обрати інший зручний час або залишити початковий час (${esc(b.date)} ${esc(b.time)}).</span>
              </div>
            `:''}
            ${hintText?`<p style="font-size:12px;color:${isRejected||isReschedRej?'#c0392b':'#276d33'};margin:4px 0 0;font-weight:600;">${hintText}</p>`:''}
            ${b.note?`<p style="font-size:12px;color:#7a8d7d;margin:4px 0 0;">Примітка: ${esc(b.note)}</p>`:''}

            ${canAct?`
              <div class="user-booking-actions-row" style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">
                ${(!isReschedReq)?`
                  <button type="button" class="user-btn-action user-btn-resched" data-toggle-resched="${b.id}" style="padding:6px 12px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #a3d9a7; background:#eaf7eb; color:#184a1e; cursor:pointer;">
                    🔄 Перенести час
                  </button>
                `:''}
                ${isReschedReq?`
                  <button type="button" class="user-btn-action user-btn-revert" data-revert-resched="${b.id}" style="padding:6px 12px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1; background:#fff; color:#475569; cursor:pointer;">
                    ↩️ Скасувати запит переносу (залишити ${esc(b.date)} ${esc(b.time)})
                  </button>
                `:''}
                ${isReschedRej?`
                  <button type="button" class="user-btn-action user-btn-revert" data-revert-resched="${b.id}" style="padding:6px 12px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #cbd5e1; background:#fff; color:#475569; cursor:pointer;">
                    Залишити попередній час (${esc(b.date)} ${esc(b.time)})
                  </button>
                `:''}
                <button type="button" class="user-btn-action user-btn-cancel" data-cancel-booking="${b.id}" style="padding:6px 12px; font-size:12px; font-weight:700; border-radius:8px; border:1px solid #fca5a5; background:#fff1f2; color:#be123c; cursor:pointer;">
                  ❌ Скасувати запис
                </button>
              </div>

              <!-- Форма вибору нового часу -->
              <div id="resched-box-${b.id}" class="resched-box" style="display:none; margin-top:12px; padding:12px; background:#f8faf8; border:1.5px solid #bfe3c2; border-radius:12px;">
                <div style="font-size:13px; font-weight:700; color:#18361b; margin-bottom:8px;">Оберіть нову дату та зручний час:</div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-bottom:8px;">
                  <div>
                    <label style="font-size:11px; font-weight:700; color:#4a624d; display:block; margin-bottom:2px;">Нова дата:</label>
                    <input type="date" class="resched-date-input" data-resched-date-input="${b.id}" min="${new Date().toISOString().split('T')[0]}" value="${esc(b.date)}" style="width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #bdd7c0; border-radius:8px; font-size:13px;" />
                  </div>
                  <div>
                    <label style="font-size:11px; font-weight:700; color:#4a624d; display:block; margin-bottom:2px;">Новий час:</label>
                    <select class="resched-time-select" data-resched-time-input="${b.id}" style="width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #bdd7c0; border-radius:8px; font-size:13px;">
                      <option value="">Оберіть дату</option>
                    </select>
                  </div>
                </div>
                <div style="margin-bottom:8px;">
                  <input type="text" data-resched-reason-input="${b.id}" placeholder="Причина перенесення (необов'язково)" style="width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #bdd7c0; border-radius:8px; font-size:12px;" />
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  <button type="button" class="btn-resched-send" data-send-resched="${b.id}" style="padding:7px 14px; background:#1b6321; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">
                    Надіслати запит на перенесення
                  </button>
                  <button type="button" class="btn-resched-close" data-toggle-resched="${b.id}" style="padding:7px 12px; background:#e5ede6; color:#314434; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">
                    Закрити
                  </button>
                </div>
                <div data-resched-msg="${b.id}" style="font-size:11px; margin-top:6px; font-weight:600;"></div>
              </div>
            `:''}
          </div>
        `;
      }).join('');
    }

    listEls.forEach(el=>el.innerHTML=html);

    // Додаємо обробники подій для кнопок скасування та перенесення
    document.querySelectorAll('[data-toggle-resched]').forEach(btn=>{
      btn.onclick=()=>{
        const id=btn.dataset.toggleResched;
        const box=document.getElementById(`resched-box-${id}`);
        if(!box)return;
        const isHidden=box.style.display==='none'||!box.style.display;
        box.style.display=isHidden?'block':'none';
        if(isHidden){
          const dateInput=box.querySelector(`[data-resched-date-input="${id}"]`);
          if(dateInput&&dateInput.value){
            populateReschedTimes(id,dateInput.value);
          }
        }
      };
    });

    document.querySelectorAll('[data-resched-date-input]').forEach(inp=>{
      inp.onchange=()=>{
        const id=inp.dataset.reschedDateInput;
        populateReschedTimes(id,inp.value);
      };
    });

    document.querySelectorAll('[data-send-resched]').forEach(btn=>{
      btn.onclick=async ()=>{
        const id=btn.dataset.sendResched;
        const box=document.getElementById(`resched-box-${id}`);
        if(!box)return;
        const dateInp=box.querySelector(`[data-resched-date-input="${id}"]`);
        const timeSel=box.querySelector(`[data-resched-time-input="${id}"]`);
        const reasonInp=box.querySelector(`[data-resched-reason-input="${id}"]`);
        const msgEl=box.querySelector(`[data-resched-msg="${id}"]`);

        const newDate=dateInp?dateInp.value:'';
        const newTime=timeSel?timeSel.value:'';
        const reason=reasonInp?(reasonInp.value||'').trim():'';

        if(!newDate||!newTime){
          if(msgEl){
            msgEl.textContent='Будь ласка, оберіть дату та вільний час.';
            msgEl.style.color='#c0392b';
          }
          return;
        }

        let allBookings=[];
        try{allBookings=JSON.parse(localStorage.getItem('stoBookings')||'[]');}catch(e){}
        let target=allBookings.find(q=>String(q.id)===String(id));
        if(!target)return;

        target.status='reschedule_requested';
        target.reschedule_date=newDate;
        target.reschedule_time=newTime;
        target.reschedule_reason=reason;

        const tag=`[ПЕРЕНЕСЕННЯ: ${newDate} ${newTime}${reason?' | Причина: '+reason:''}]`;
        target.note=(target.note||'').replace(/\[ПЕРЕНЕСЕННЯ:[^\]]*\]/g,'').trim();
        target.note=(target.note?target.note+' | ':'')+tag;

        localStorage.setItem('stoBookings',JSON.stringify(allBookings));

        if(window.reloadBookings)window.reloadBookings();
        if(window.renderBookings)window.renderBookings();
        if(window.refreshTimes)window.refreshTimes();
        renderUserBookings(user);

        try{
          if(window.sbFetch){
            await window.sbFetch(`bookings?id=eq.${id}`,{
              method:'PATCH',
              body:JSON.stringify({
                status:'reschedule_requested',
                note:target.note
              })
            });
          }
        }catch(e){}

        alert(`Запит на перенесення візиту на ${newDate} об ${newTime} надіслано! Майстер невдовзі підтвердить новий час.`);
      };
    });

    document.querySelectorAll('[data-cancel-booking]').forEach(btn=>{
      btn.onclick=async ()=>{
        const id=btn.dataset.cancelBooking;
        let allBookings=[];
        try{allBookings=JSON.parse(localStorage.getItem('stoBookings')||'[]');}catch(e){}
        let target=allBookings.find(q=>String(q.id)===String(id));
        if(!target)return;

        if(!confirm(`Ви дійсно бажаєте скасувати запис на ${target.date} об ${target.time}?`))return;

        target.status='cancelled';
        target.note=(target.note||'').trim()+' | [Скасовано клієнтом '+new Date().toLocaleDateString('uk-UA')+']';
        localStorage.setItem('stoBookings',JSON.stringify(allBookings));

        if(window.reloadBookings)window.reloadBookings();
        if(window.renderBookings)window.renderBookings();
        if(window.refreshTimes)window.refreshTimes();
        renderUserBookings(user);

        try{
          if(window.sbFetch){
            await window.sbFetch(`bookings?id=eq.${id}`,{
              method:'PATCH',
              body:JSON.stringify({
                status:'cancelled',
                note:target.note
              })
            });
          }
        }catch(e){}

        alert('Ваш запис успішно скасовано. Час звільнено для запису.');
      };
    });

    document.querySelectorAll('[data-revert-resched]').forEach(btn=>{
      btn.onclick=async ()=>{
        const id=btn.dataset.revertResched;
        let allBookings=[];
        try{allBookings=JSON.parse(localStorage.getItem('stoBookings')||'[]');}catch(e){}
        let target=allBookings.find(q=>String(q.id)===String(id));
        if(!target)return;

        target.status='confirmed';
        target.reschedule_date='';
        target.reschedule_time='';
        target.reschedule_reason='';
        target.reschedule_admin_message='';
        target.note=(target.note||'')
          .replace(/\[ПЕРЕНЕСЕННЯ:[^\]]*\]/g,'')
          .replace(/\[ВІДПОВІДЬ_СТО:[^\]]*\]/g,'')
          .trim();

        localStorage.setItem('stoBookings',JSON.stringify(allBookings));

        if(window.reloadBookings)window.reloadBookings();
        if(window.renderBookings)window.renderBookings();
        if(window.refreshTimes)window.refreshTimes();
        renderUserBookings(user);

        try{
          if(window.sbFetch){
            await window.sbFetch(`bookings?id=eq.${id}`,{
              method:'PATCH',
              body:JSON.stringify({
                status:'confirmed',
                note:target.note
              })
            });
          }
        }catch(e){}

        alert(`Залишено попередній час візиту: ${target.date} об ${target.time}.`);
      };
    });
  }

  function switchProfileTab(tabName='bookings'){
    if(!dialog)return;
    dialog.querySelectorAll('[data-profile-tab]').forEach(b=>{
      b.classList.toggle('active',b.dataset.profileTab===tabName);
    });
    dialog.querySelectorAll('[data-profile-panel]').forEach(p=>{
      p.hidden=p.dataset.profilePanel!==tabName;
    });
  }
  window.switchProfileTab=switchProfileTab;

  function showProfile(user){
    window.currentUser=user;
    try{
      localStorage.setItem('stoUserSession',JSON.stringify(user));
    }catch(e){}

    const isAdmin=user.role==='admin'||user.is_admin===true;
    document.body.classList.toggle('is-admin-session',isAdmin);

    const name=user.name||user.user_metadata?.full_name||user.user_metadata?.name||'Клієнт';
    const email=user.email||'';
    const phone=user.phone||'';
    const avatar=user.user_metadata?.avatar_url||user.user_metadata?.picture;

    // 1. Відображення на головній сторінці (Особистий кабінет клієнта) — тільки для звичайних клієнтів, не для адміна!
    const inlineDash=document.querySelector('#userInlineDashboard');
    if(inlineDash){
      if(isAdmin){
        inlineDash.hidden=true;
      }else{
        inlineDash.hidden=false;
        const inName=inlineDash.querySelector('[data-user-inline-name]');
        const inEmail=inlineDash.querySelector('[data-user-inline-email]');
        const inPhone=inlineDash.querySelector('[data-user-inline-phone]');
        const inAvatar=inlineDash.querySelector('[data-user-inline-avatar]');

        if(inName)inName.textContent=name;
        if(inEmail)inEmail.textContent=email||'Google аккаунт';
        if(inPhone)inPhone.textContent=phone?phone:'номер не вказано';
        if(inAvatar&&avatar)inAvatar.src=avatar;
      }
    }

    // 2. Відображення у спливаючому вікні
    if(dialog){
      if(guestView)guestView.hidden=true;
      if(userView)userView.hidden=false;

      const nameEl=dialog.querySelector('[data-user-name]');
      const emailEl=dialog.querySelector('[data-user-email]');
      const phoneEl=dialog.querySelector('[data-user-phone]');
      const avatarEl=dialog.querySelector('[data-user-avatar]');
      const initialsEl=dialog.querySelector('[data-user-initials]');

      if(nameEl)nameEl.textContent=name;
      if(phoneEl){
        phoneEl.textContent=phone?'тел: '+phone:'';
        phoneEl.hidden=!phone;
      }
      if(emailEl){
        emailEl.textContent=email?'email: '+email:'';
        emailEl.hidden=!email;
      }

      if(avatar&&avatarEl){
        avatarEl.src=avatar;
        avatarEl.hidden=false;
        if(initialsEl)initialsEl.hidden=true;
      }else if(initialsEl){
        const cleanLetters=(name||'').replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ]/g,'');
        initialsEl.textContent=(cleanLetters[0]||'К').toUpperCase();
        initialsEl.hidden=false;
        if(avatarEl)avatarEl.hidden=true;
      }

      const isAdmin=user.role==='admin'||user.is_admin===true;
      document.body.classList.toggle('is-admin-session',isAdmin);
      if(adminBox)adminBox.hidden=!isAdmin;
      if(userTabs)userTabs.hidden=isAdmin;

      if(isAdmin){
        dialog.querySelectorAll('[data-profile-panel]').forEach(p=>{
          p.hidden=true;
        });
      }else{
        // Чітко розділяємо: у вкладці «Мої записи» показуються тільки записи, а форма контактів прихована
        const currentActive=dialog.querySelector('[data-profile-tab].active');
        const activeTabId=(currentActive&&currentActive.dataset.profileTab)?currentActive.dataset.profileTab:'bookings';
        switchProfileTab(activeTabId);
      }

      if(editForm){
        editForm.elements.name.value=user.name||'';
        const eg=editForm.querySelector('[data-phone-group]');
        if(window.setPhoneGroupValue&&eg){
          window.setPhoneGroupValue(eg,user.phone||'');
        }else if(editForm.elements.phone){
          editForm.elements.phone.value=user.phone||'';
        }
        editForm.elements.email.value=user.email||'';
      }
    }

    // 3. Оновлюємо кнопки в шапці сайту
    const firstName=name.split(' ')[0]||'Клієнт';
    document.querySelectorAll('[data-account-btn-text]').forEach(t=>{
      t.textContent=user.role==='admin'?'Панель керування':`Кабінет (${firstName})`;
    });
    document.querySelectorAll('[data-open-account]').forEach(btn=>{
      btn.title=user.role==='admin'?'Панель керування':'Особистий кабінет';
      btn.classList.toggle('is-admin',user.role==='admin');
    });

    document.querySelectorAll('[data-open-booking]').forEach(btn=>{
      if(user.role==='admin'){
        btn.setAttribute('data-admin-active','true');
        btn.title='Адміністратор керує заявками в Панелі керування';
      }else{
        btn.removeAttribute('data-admin-active');
        btn.title='';
      }
    });

    renderUserBookings(user);
  }
  window.showUserProfile=showProfile;
  window.renderUserBookings=renderUserBookings;

  function resetToAuth(){
    window.currentUser=null;
    targetResetUser=null;
    localStorage.removeItem('stoUserSession');
    document.body.classList.remove('is-admin-session');

    // Ховаємо кабінет на сторінці
    const inlineDash=document.querySelector('#userInlineDashboard');
    if(inlineDash)inlineDash.hidden=true;

    if(dialog){
      if(userView)userView.hidden=true;
      if(guestView)guestView.hidden=false;

      if(tabs)tabs.hidden=false;
      panels.forEach(p=>{
        p.hidden=p.dataset.panel!=='login';
      });
      if(tabs){
        tabs.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t.dataset.tab==='login'));
      }
      if(adminBox)adminBox.hidden=true;
      if(loginError)loginError.hidden=true;
      if(loginSuccess)loginSuccess.hidden=true;
      if(regError)regError.hidden=true;
      if(forgotError)forgotError.hidden=true;
      if(resetError)resetError.hidden=true;
    }

    document.querySelectorAll('[data-account-btn-text]').forEach(t=>{
      t.textContent='Кабінет';
    });
    document.querySelectorAll('[data-open-account]').forEach(btn=>{
      btn.title='Особистий кабінет';
      btn.classList.remove('is-admin');
    });
    document.querySelectorAll('[data-open-booking]').forEach(btn=>{
      btn.removeAttribute('data-admin-active');
      btn.title='';
    });
  }

  function openForgotPanel(){
    if(tabs){
      tabs.querySelectorAll('[data-tab]').forEach(t=>t.classList.remove('active'));
    }
    panels.forEach(p=>{
      p.hidden=p.dataset.panel!=='forgot';
    });
    if(loginError)loginError.hidden=true;
    if(loginSuccess)loginSuccess.hidden=true;
    if(forgotError)forgotError.hidden=true;
    if(forgotForm)forgotForm.reset();
  }

  function openResetPanel(user){
    targetResetUser=user;
    if(resetDisplay){
      const idLabel=user.email||user.phone||'клієнт';
      resetDisplay.textContent=`${user.name||'Клієнт'} (${idLabel})`;
    }
    panels.forEach(p=>{
      p.hidden=p.dataset.panel!=='reset';
    });
    if(resetError)resetError.hidden=true;
    if(resetForm)resetForm.reset();
  }

  function backToLogin(prefillLogin='',successMsg=''){
    panels.forEach(p=>{
      p.hidden=p.dataset.panel!=='login';
    });
    if(tabs){
      tabs.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t.dataset.tab==='login'));
    }
    if(loginError)loginError.hidden=true;
    if(forgotError)forgotError.hidden=true;
    if(resetError)resetError.hidden=true;
    if(loginSuccess){
      if(successMsg){
        loginSuccess.textContent=successMsg;
        loginSuccess.hidden=false;
      }else{
        loginSuccess.hidden=true;
      }
    }
    if(loginForm&&prefillLogin){
      loginForm.elements.login.value=prefillLogin;
      loginForm.elements.password.value='';
      setTimeout(()=>{
        if(loginForm.elements.password)loginForm.elements.password.focus();
      },50);
    }
  }

  document.querySelectorAll('[data-open-forgot]').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      openForgotPanel();
    };
  });

  document.querySelectorAll('[data-back-to-login]').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      backToLogin();
    };
  });

  // Кнопка перемикання видимості пароля (очко)
  document.querySelectorAll('.password-toggle-btn').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const wrap=btn.closest('.password-field-wrapper');
      if(!wrap)return;
      const inp=wrap.querySelector('input');
      if(!inp)return;
      const isPass=inp.type==='password';
      inp.type=isPass?'text':'password';
      const showSpan=btn.querySelector('.eye-show');
      const hideSpan=btn.querySelector('.eye-hide');
      if(showSpan)showSpan.style.display=isPass?'none':'inline-block';
      if(hideSpan)hideSpan.style.display=isPass?'inline-block':'none';
      btn.title=isPass?'Приховати пароль':'Показати пароль';
      btn.setAttribute('aria-label',btn.title);
    };
  });

  // Profile tabs (Bookings vs Edit)
  dialog.querySelectorAll('[data-profile-tab]').forEach(btn=>{
    btn.onclick=()=>{
      switchProfileTab(btn.dataset.profileTab);
    };
  });

  // Profile Edit Form Submit
  if(editForm){
    editForm.onsubmit=e=>{
      e.preventDefault();
      if(!window.currentUser)return;
      const f=editForm.elements;
      const newName=f.name.value.trim()||'Клієнт';
      const newPhone=f.phone.value.trim();
      const newEmail=f.email.value.trim();

      window.currentUser.name=newName;
      window.currentUser.phone=newPhone;
      window.currentUser.email=newEmail;

      localStorage.setItem('stoUserSession',JSON.stringify(window.currentUser));

      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
      const idx=users.findIndex(u=>(u.phone&&u.phone===newPhone)||(u.email&&u.email===newEmail));
      if(idx>=0){
        users[idx]={...users[idx],...window.currentUser};
      }else{
        users.push(window.currentUser);
      }
      localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));

      // Миттєво оновлюємо ім'я, аватарку і пошту в шапці
      showProfile(window.currentUser);

      const msg=dialog.querySelector('[data-save-msg]');
      if(msg){
        msg.textContent='✅ Контакти успішно збережено!';
        msg.hidden=false;
      }

      setTimeout(()=>{
        const bookTabBtn=dialog.querySelector('[data-profile-tab="bookings"]');
        if(bookTabBtn)bookTabBtn.click();
        if(msg)msg.hidden=true;
      },800);
    };
  }

  // New Booking Button inside profile
  const newBookBtn=dialog.querySelector('[data-new-booking-btn]');
  if(newBookBtn){
    newBookBtn.onclick=()=>{
      dialog.close();
      const bookBtn=document.querySelector('[data-open-booking]');
      if(bookBtn)bookBtn.click();
    };
  }

  // Офіційний вхід через Google OAuth з куками та сесією
  document.querySelectorAll('[data-google-login]').forEach(btn=>{
    btn.onclick=async ()=>{
      if(!sb){
        alert('Сервіс авторизації завантажується, спробуйте ще раз...');
        return;
      }
      btn.disabled=true;
      btn.textContent='Перенаправлення на Google...';
      try{
        const {error}=await sb.auth.signInWithOAuth({
          provider:'google',
          options:{
            redirectTo:window.location.origin+window.location.pathname
          }
        });
        if(error){
          alert('Увага: у панелі Supabase вимкнено провайдер Google!\nПерейдіть у Supabase -> Auth -> Providers -> Google та увімкніть його (Enable).');
          btn.disabled=false;
          btn.innerHTML='Увійти через Google';
        }
      }catch(err){
        alert('Помилка підключення до Google: '+err.message);
        btn.disabled=false;
        btn.innerHTML='Увійти через Google';
      }
    };
  });

  function saveAndActivateUser(user,shouldOpenCabinet=false){
    if(!user)return;
    const meta=user.user_metadata||{};
    const formattedUser={
      name:meta.full_name||meta.name||user.name||(user.email?user.email.split('@')[0]:'Клієнт Google'),
      email:user.email||'',
      phone:user.phone||'',
      role:'customer',
      provider:'google',
      user_metadata:meta
    };

    localStorage.setItem('stoUserSession',JSON.stringify(formattedUser));
    window.currentUser=formattedUser;

    let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
    const existIdx=users.findIndex(u=>u.email&&u.email.toLowerCase()===formattedUser.email.toLowerCase());
    if(existIdx>=0){
      users[existIdx]={...users[existIdx],...formattedUser};
    }else{
      users.push(formattedUser);
    }
    localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));

    showProfile(formattedUser);

    if(shouldOpenCabinet){
      try{
        window.history.replaceState({},document.title,window.location.pathname);
      }catch(e){}
      setTimeout(()=>{
        if(typeof open==='function')open('accountDialog');
      },300);
    }
  }

  // Автоматичне підхоплення Google сесії при поверненні з accounts.google.com
  if(sb){
    sb.auth.onAuthStateChange((event,session)=>{
      if(session?.user){
        const isOAuth=window.location.hash.includes('access_token')||window.location.search.includes('code=');
        saveAndActivateUser(session.user,isOAuth||event==='SIGNED_IN');
      }
    });
  }

  // Logout (і на сторінці, і в модалці)
  document.querySelectorAll('[data-logout]').forEach(btn=>{
    btn.onclick=async ()=>{
      if(sb)try{await sb.auth.signOut();}catch(e){}
      resetToAuth();
    };
  });

  function safeDecodeJwt(jwtStr){
    try{
      const parts=jwtStr.split('.');
      if(parts.length<2)return null;
      let b64=parts[1].replace(/-/g,'+').replace(/_/g,'/');
      while(b64.length%4!==0){b64+='=';}
      const binStr=atob(b64);
      const bytes=Uint8Array.from(binStr,c=>c.charCodeAt(0));
      return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    }catch(e){
      console.warn('JWT Decode failed:',e);
      return null;
    }
  }

  // Check existing session & direct OAuth parser
  async function checkSession(){
    const hash=window.location.hash?window.location.hash.substring(1):'';
    const search=window.location.search?window.location.search.substring(1):'';

    // 0. Перевірка на помилки авторизації від Google
    if(hash.includes('error=')||search.includes('error=')){
      const errParams={};
      (hash+'&'+search).split('&').forEach(part=>{
        const [k,v]=part.split('=');
        if(k&&v)errParams[decodeURIComponent(k)]=decodeURIComponent(v);
      });
      if(errParams.error||errParams.error_description){
        alert('Помилка входу через Google: '+(errParams.error_description||errParams.error));
      }
    }

    // 1. ПРЯМИЙ БЕЗВІДМОВНИЙ РОЗБІР ACCESS_TOKEN З URL (Миттєво після повернення з Google)
    if(hash.includes('access_token=')){
      try{
        const params={};
        hash.split('&').forEach(part=>{
          const [k,v]=part.split('=');
          if(k&&v)params[decodeURIComponent(k)]=decodeURIComponent(v);
        });

        if(params.access_token){
          const payload=safeDecodeJwt(params.access_token);
          if(payload){
            const meta=payload.user_metadata||{};
            const userFromToken={
              id:payload.sub,
              name:meta.full_name||meta.name||(payload.email?payload.email.split('@')[0]:'Клієнт Google'),
              email:payload.email||'',
              phone:payload.phone||'',
              role:'customer',
              provider:'google',
              user_metadata:meta
            };

            saveAndActivateUser(userFromToken,true);

            if(sb&&params.refresh_token){
              sb.auth.setSession({
                access_token:params.access_token,
                refresh_token:params.refresh_token
              }).catch(()=>{});
            }
            return;
          }
        }
      }catch(err){
        console.warn('Direct hash parse error:',err);
      }
    }

    // 2. Якщо повернулися з Google з кодом PKCE ?code=
    if(search.includes('code=')&&sb){
      try{
        const params=new URLSearchParams(search);
        const code=params.get('code');
        if(code){
          const {data,error}=await sb.auth.exchangeCodeForSession(code);
          if(data?.session?.user){
            saveAndActivateUser(data.session.user,true);
            return;
          }
        }
      }catch(err){
        console.warn('PKCE exchange:',err);
      }
    }

    // 3. Читаємо збережену сесію з localStorage
    const local=localStorage.getItem('stoUserSession');
    if(local){
      try{
        const u=JSON.parse(local);
        showProfile(u);
        return;
      }catch(e){}
    }

    // 4. Сесія Supabase у localStorage
    const sbLocalKey='sb-nabwuaxzogfuzaznvmph-auth-token';
    const sbRaw=localStorage.getItem(sbLocalKey);
    if(sbRaw){
      try{
        const parsed=JSON.parse(sbRaw);
        if(parsed?.user){
          saveAndActivateUser(parsed.user,false);
          return;
        }
      }catch(e){}
    }

    // 5. Запит до getSession()
    if(sb){
      try{
        const {data:{session}}=await sb.auth.getSession();
        if(session?.user){
          saveAndActivateUser(session.user,false);
          return;
        }
      }catch(e){}
    }
  }

  // Login handler
  if(loginForm){
    loginForm.onsubmit=e=>{
      e.preventDefault();
      if(loginSuccess)loginSuccess.hidden=true;
      const fd=new FormData(loginForm),
            login=String(fd.get('login')||'').trim(),
            password=String(fd.get('password')||'').trim();

      if(!login||!password){
        if(loginError){loginError.textContent='Введіть логін та пароль.';loginError.hidden=false;}
        return;
      }

      // Адміністратор СТО
      if(login.toLowerCase()==='admin'&&password==='sto-2026'){
        const admUser={name:'Адміністратор СТО',email:'admin@sto-kyiv.ua',role:'admin',is_admin:true};
        localStorage.setItem('stoUserSession',JSON.stringify(admUser));
        showProfile(admUser);
        if(loginError)loginError.hidden=true;
        if(dialog)dialog.close();
        if(typeof fillAdmin==='function')fillAdmin();
        if(typeof open==='function')open('adminDialog');
        return;
      }

      // Перевіряємо збережених користувачів
      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
      const cleanLogin=login.toLowerCase().trim();

      let user=users.find(u=>{
        const uEmail=(u.email||'').toLowerCase().trim();
        if(cleanLogin&&uEmail===cleanLogin)return true;
        if(isPhoneMatch(u.phone,login))return true;
        return false;
      });

      if(user){
        if(user.password===password){
          localStorage.setItem('stoUserSession',JSON.stringify(user));
          showProfile(user);
          if(loginError)loginError.hidden=true;
          return;
        }else{
          if(loginError){
            loginError.textContent='❌ Невірний пароль! Якщо ви його забули, скористайтесь «Забули пароль?» нижче.';
            loginError.hidden=false;
          }
          return;
        }
      }

      if(loginError){
        loginError.textContent='❌ Акаунт із такими даними не знайдено. Перевірте номер/пошту або створіть кабінет на вкладці «Створити кабінет».';
        loginError.hidden=false;
      }
    };
  }

  // Registration handler
  if(regForm){
    regForm.onsubmit=e=>{
      e.preventDefault();
      const fd=new FormData(regForm),
            name=String(fd.get('name')||'').trim(),
            phone=String(fd.get('phone')||'').trim(),
            email=String(fd.get('email')||'').trim(),
            password=String(fd.get('password')||'').trim();

      if(!phone&&!email){
        if(regError){regError.textContent='Вкажіть хоча б номер телефону або Email!';regError.hidden=false;}
        return;
      }

      if(!password||password.length<4){
        if(regError){regError.textContent='Пароль має містити щонайменше 4 символи!';regError.hidden=false;}
        return;
      }

      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');

      // 1. Перевірка на вже зареєстрований номер телефону
      const cleanPhone=normPhone(phone);
      if(cleanPhone.length>=9){
        const existByPhone=users.find(u=>isPhoneMatch(u.phone,phone));
        if(existByPhone){
          if(regError){
            regError.textContent='❌ На цей номер телефону вже зареєстровано акаунт! Будь ласка, увійдіть або скористайтесь «Забули пароль?».';
            regError.hidden=false;
          }
          return;
        }
      }

      // 2. Перевірка на вже зареєстрований Email
      const cleanEmail=email.toLowerCase().trim();
      if(cleanEmail.length>3){
        const existByEmail=users.find(u=>(u.email||'').toLowerCase().trim()===cleanEmail);
        if(existByEmail){
          if(regError){
            regError.textContent='❌ На цю пошту вже зареєстровано акаунт! Будь ласка, увійдіть або скористайтесь «Забули пароль?».';
            regError.hidden=false;
          }
          return;
        }
      }

      const newUser={name:name||'Клієнт',phone:phone,email:email,password:password,role:'customer'};
      users.push(newUser);
      localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));
      localStorage.setItem('stoUserSession',JSON.stringify(newUser));

      if(regError)regError.hidden=true;
      showProfile(newUser);
    };
  }

  // Forgot password request handler
  if(forgotForm){
    forgotForm.onsubmit=e=>{
      e.preventDefault();
      const fd=new FormData(forgotForm),
            target=String(fd.get('recoveryTarget')||'').trim();

      if(!target){
        if(forgotError){forgotError.textContent='Вкажіть номер телефону або Email!';forgotError.hidden=false;}
        return;
      }

      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
      const cleanTarget=target.toLowerCase().trim();

      let foundUser=users.find(u=>{
        const uEmail=(u.email||'').toLowerCase().trim();
        if(cleanTarget&&uEmail===cleanTarget)return true;
        if(isPhoneMatch(u.phone,target))return true;
        return false;
      });

      // Перевіряємо також збережені записи
      if(!foundUser){
        let allBookings=[];
        try{allBookings=JSON.parse(localStorage.getItem('stoBookings')||'[]');}catch(err){}
        const bk=allBookings.find(b=>isPhoneMatch(b.phone,target)||((b.note||'').toLowerCase().includes(cleanTarget)));
        if(bk){
          foundUser={
            name:bk.name||'Клієнт',
            phone:bk.phone||target,
            email:target.includes('@')?target:'',
            password:'',
            role:'customer'
          };
          users.push(foundUser);
          localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));
        }
      }

      if(!foundUser){
        if(forgotError){
          forgotError.textContent='❌ Акаунт із цим номером або Email не знайдено. Перевірте ввід або створіть новий кабінет.';
          forgotError.hidden=false;
        }
        return;
      }

      if(forgotError)forgotError.hidden=true;
      openResetPanel(foundUser);
    };
  }

  // Reset password handler
  if(resetForm){
    resetForm.onsubmit=e=>{
      e.preventDefault();
      if(!targetResetUser){
        backToLogin();
        return;
      }

      const fd=new FormData(resetForm),
            newPass=String(fd.get('newPassword')||'').trim(),
            confPass=String(fd.get('confirmPassword')||'').trim();

      if(!newPass||newPass.length<4){
        if(resetError){
          resetError.textContent='❌ Пароль має містити щонайменше 4 символи!';
          resetError.hidden=false;
        }
        return;
      }

      if(newPass!==confPass){
        if(resetError){
          resetError.textContent='❌ Паролі не співпадають! Перевірте правильність введення.';
          resetError.hidden=false;
        }
        return;
      }

      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
      const idx=users.findIndex(u=>{
        if(targetResetUser.phone&&isPhoneMatch(u.phone,targetResetUser.phone))return true;
        if(targetResetUser.email&&(u.email||'').toLowerCase()===(targetResetUser.email||'').toLowerCase())return true;
        return false;
      });

      if(idx>=0){
        users[idx].password=newPass;
      }else{
        targetResetUser.password=newPass;
        users.push(targetResetUser);
      }
      localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));

      const prefill=targetResetUser.phone||targetResetUser.email||'';
      targetResetUser=null;
      backToLogin(prefill,'✅ Пароль успішно змінено! Тепер ви можете увійти з новим паролем.');
    };
  }

  checkSession();
})();
