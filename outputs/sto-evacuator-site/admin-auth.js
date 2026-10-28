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

  function renderUserBookings(user){
    const listEls=document.querySelectorAll('[data-my-bookings-list], [data-my-inline-bookings-list]'),
          countEls=document.querySelectorAll('[data-my-count], [data-user-active-count]');
    if(!listEls.length)return;

    let allBookings=[];
    try{allBookings=JSON.parse(localStorage.getItem('stoBookings')||'[]');}catch(e){}

    const uPhone=(user.phone||'').replace(/\D/g,''),
          uName=(user.name||'').toLowerCase().trim(),
          uEmail=(user.email||'').toLowerCase().trim();

    const my=allBookings.filter(b=>{
      const bPhone=b.phone||'';
      const bName=(b.name||'').toLowerCase().trim();
      const bNote=(b.note||'').toLowerCase();
      if(uPhone&&isPhoneMatch(uPhone,bPhone))return true;
      if(uName&&bName&&uName.length>=3&&(bName===uName||bName.includes(uName)||uName.includes(bName)))return true;
      if(uEmail&&uEmail.length>=5&&bNote.includes(uEmail))return true;
      return false;
    });

    countEls.forEach(c=>c.textContent=my.length);

    let html='';
    if(!my.length){
      html='<p style="font-size:13px;color:#6d7f70;text-align:center;padding:16px 0;grid-column:1/-1;">У вас поки немає активних записів. Натисніть кнопку «+ Записатися на сервіс», щоб обрати зручний час!</p>';
    }else{
      html=my.slice().reverse().map(b=>{
        const isCompleted=b.status==='closed'||b.status==='completed';
        const isConfirmed=b.status==='confirmed'||b.status==='accepted';
        const isRejected=b.status==='rejected';
        const isPastDate=!isCompleted&&!isRejected&&new Date(`${b.date}T${b.time}`)<new Date();

        let badgeText='🕒 Очікує підтвердження';
        let badgeClass='booking-badge pending';
        let hintText='Майстер невдовзі зателефонує або підтвердить запис.';

        if(isCompleted){
          badgeText='✅ Виконано';
          badgeClass='booking-badge done';
          hintText='Обслуговування успішно завершено.';
        }else if(isConfirmed){
          badgeText='🟢 Прийнято майстром';
          badgeClass='booking-badge confirmed';
          hintText='Чекаємо вас на СТО у призначений час!';
        }else if(isRejected){
          badgeText='❌ Відхилено';
          badgeClass='booking-badge rejected';
          hintText=b.reject_reason?`Причина: ${b.reject_reason}`:'На цей час немає вільного місця. Будь ласка, оберіть інший день.';
        }else if(isPastDate){
          badgeText='Минулий візит';
          badgeClass='booking-badge past';
          hintText='';
        }

        return `
          <div class="user-booking-card ${isCompleted?'is-done':''} ${isRejected?'is-rejected':''}">
            <div class="user-booking-head">
              <strong>${b.service||'Ремонт авто'}</strong>
              <span class="${badgeClass}">${badgeText}</span>
            </div>
            <p class="user-booking-meta">📅 <b>${b.date}</b> об <b>${b.time}</b></p>
            ${hintText?`<p style="font-size:12px;color:${isRejected?'#c0392b':'#276d33'};margin:3px 0 0;font-weight:600;">${hintText}</p>`:''}
            ${b.note?`<p style="font-size:12px;color:#7a8d7d;margin:4px 0 0;">Примітка: ${b.note}</p>`:''}
          </div>
        `;
      }).join('');
    }

    listEls.forEach(el=>el.innerHTML=html);
  }

  function showProfile(user){
    window.currentUser=user;
    try{
      localStorage.setItem('stoUserSession',JSON.stringify(user));
    }catch(e){}

    const name=user.name||user.user_metadata?.full_name||user.user_metadata?.name||'Клієнт';
    const email=user.email||'';
    const phone=user.phone||'';
    const avatar=user.user_metadata?.avatar_url||user.user_metadata?.picture;

    // 1. Відображення на головній сторінці (Особистий кабінет клієнта)
    const inlineDash=document.querySelector('#userInlineDashboard');
    if(inlineDash){
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
      if(adminBox)adminBox.hidden=!isAdmin;
      if(userTabs)userTabs.hidden=isAdmin;
      dialog.querySelectorAll('[data-profile-panel]').forEach(p=>{
        p.hidden=isAdmin;
      });

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

  // Profile tabs (Bookings vs Edit)
  dialog.querySelectorAll('[data-profile-tab]').forEach(btn=>{
    btn.onclick=()=>{
      dialog.querySelectorAll('[data-profile-tab]').forEach(b=>b.classList.toggle('active',b===btn));
      const target=btn.dataset.profileTab;
      dialog.querySelectorAll('[data-profile-panel]').forEach(p=>{
        p.hidden=p.dataset.profilePanel!==target;
      });
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
        const admUser={name:'Адміністратор СТО',email:'admin@sto-yabluneve.ua',role:'admin',is_admin:true};
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
