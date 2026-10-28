(()=>{
  const SUPABASE_URL='https://nabwuaxzogfuzaznvmph.supabase.co';
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYnd1YXh6b2dmdXphem52bXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzc2MDQsImV4cCI6MjEwODc1MzYwNH0.bvkJPsimj--W21Zort-I1saszUhbI2um96VUlxgwS2U';

  let sb=null;
  if(window.supabase&&window.supabase.createClient){
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  }

  const dialog=document.querySelector('#accountDialog'),
        userView=dialog?dialog.querySelector('#accountUserView'):null,
        guestView=dialog?dialog.querySelector('#accountGuestView'):null,
        loginForm=document.querySelector('#loginForm'),
        regForm=document.querySelector('#registerForm'),
        editForm=document.querySelector('#profileEditForm'),
        adminBox=dialog?dialog.querySelector('[data-admin-panel-btn-box]'):null,
        userTabs=dialog?dialog.querySelector('[data-user-tabs]'):null,
        loginError=dialog?dialog.querySelector('[data-login-error]'):null,
        regError=dialog?dialog.querySelector('[data-register-error]'):null,
        tabs=dialog?dialog.querySelector('.account-tabs'):null,
        panels=dialog?dialog.querySelectorAll('[data-panel]'):[];

  window.currentUser=null;

  function renderUserBookings(user){
    const listEl=dialog.querySelector('[data-my-bookings-list]'),
          countEl=dialog.querySelector('[data-my-count]');
    if(!listEl)return;

    let allBookings=[];
    try{allBookings=JSON.parse(localStorage.getItem('stoBookings')||'[]');}catch(e){}

    const uPhone=(user.phone||'').replace(/\D/g,''),
          uName=(user.name||'').toLowerCase().trim(),
          uEmail=(user.email||'').toLowerCase().trim();

    const my=allBookings.filter(b=>{
      const bPhone=(b.phone||'').replace(/\D/g,'');
      const bName=(b.name||'').toLowerCase().trim();
      const bNote=(b.note||'').toLowerCase();
      if(uPhone&&bPhone&&bPhone===uPhone)return true;
      if(uName&&bName&&bName===uName)return true;
      if(uEmail&&bNote.includes(uEmail))return true;
      return false;
    });

    if(countEl)countEl.textContent=my.length;

    if(!my.length){
      listEl.innerHTML='<p style="font-size:13px;color:#6d7f70;text-align:center;padding:16px 0;">У вас поки немає активних записів. Оберіть зручний час для огляду авто!</p>';
      return;
    }

    listEl.innerHTML=my.slice().reverse().map(b=>{
      const isPast=b.status==='closed'||new Date(`${b.date}T${b.time}`)<new Date();
      const badgeText=isPast?'Виконано / Минулий':'Очікує прийому';
      const badgeClass=isPast?'booking-badge done':'booking-badge';
      return `
        <div class="user-booking-card">
          <div class="user-booking-head">
            <strong>${b.service||'Ремонт авто'}</strong>
            <span class="${badgeClass}">${badgeText}</span>
          </div>
          <p class="user-booking-meta">📅 <b>${b.date}</b> об <b>${b.time}</b></p>
          ${b.note?`<p style="font-size:12px;color:#7a8d7d;margin:4px 0 0;">Примітка: ${b.note}</p>`:''}
        </div>
      `;
    }).join('');
  }

  function showProfile(user){
    if(!dialog)return;
    window.currentUser=user;

    if(guestView)guestView.hidden=true;
    if(userView)userView.hidden=false;

    const name=user.name||user.user_metadata?.full_name||user.user_metadata?.name||user.email||user.phone||'Клієнт';
    const email=user.email||'';
    const phone=user.phone||'';
    const avatar=user.user_metadata?.avatar_url||user.user_metadata?.picture;

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
      initialsEl.textContent=(name[0]||'К').toUpperCase();
      initialsEl.hidden=false;
      if(avatarEl)avatarEl.hidden=true;
    }

    const isAdmin=user.role==='admin'||user.is_admin===true;
    if(adminBox)adminBox.hidden=!isAdmin;
    if(userTabs)userTabs.hidden=isAdmin;

    // Заповнюємо поля редагування
    if(editForm){
      editForm.elements.name.value=user.name||'';
      editForm.elements.phone.value=user.phone||'';
      editForm.elements.email.value=user.email||'';
    }

    renderUserBookings(user);

    // Оновлюємо кнопки в шапці
    const firstName=name.split(' ')[0]||'Клієнт';
    document.querySelectorAll('[data-open-account]').forEach(btn=>{
      btn.textContent=isAdmin?'Панель керування':`Кабінет (${firstName})`;
    });
  }
  window.showUserProfile=showProfile;

  function resetToAuth(){
    if(!dialog)return;
    window.currentUser=null;
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
    if(regError)regError.hidden=true;

    document.querySelectorAll('[data-open-account]').forEach(btn=>{
      btn.textContent='Кабінет';
    });
  }

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
      window.currentUser.name=f.name.value.trim();
      window.currentUser.phone=f.phone.value.trim();
      window.currentUser.email=f.email.value.trim();

      localStorage.setItem('stoUserSession',JSON.stringify(window.currentUser));

      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
      const idx=users.findIndex(u=>u.phone===window.currentUser.phone||u.email===window.currentUser.email);
      if(idx>=0){
        users[idx]={...users[idx],...window.currentUser};
      }else{
        users.push(window.currentUser);
      }
      localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));

      showProfile(window.currentUser);
      const msg=dialog.querySelector('[data-save-msg]');
      if(msg){
        msg.hidden=false;
        setTimeout(()=>{msg.hidden=true;},2500);
      }
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

  // Google OAuth
  document.querySelectorAll('[data-google-login]').forEach(btn=>{
    btn.onclick=async ()=>{
      if(!sb){
        alert('Клієнт завантажується...');
        return;
      }
      btn.disabled=true;
      btn.textContent='Перенаправлення на Google...';
      try{
        const {error:authErr}=await sb.auth.signInWithOAuth({
          provider:'google',
          options:{
            redirectTo:window.location.origin+window.location.pathname
          }
        });
        if(authErr){
          alert('Вхід через Google зараз налаштовується в Google Cloud. Будь ласка, увійдіть за номером або поштою нижче!');
          btn.disabled=false;
          btn.innerHTML='Увійти через Google';
        }
      }catch(err){
        alert('Вхід через Google зараз налаштовується в Google Cloud. Будь ласка, скористайтеся входом за телефоном або email нижче!');
        btn.disabled=false;
      }
    };
  });

  // Logout
  const logoutBtn=dialog?dialog.querySelector('[data-logout]'):null;
  if(logoutBtn){
    logoutBtn.onclick=async ()=>{
      if(sb)try{await sb.auth.signOut();}catch(e){}
      localStorage.removeItem('stoUserSession');
      resetToAuth();
    };
  }

  // Check existing session
  async function checkSession(){
    const local=localStorage.getItem('stoUserSession');
    if(local){
      try{
        showProfile(JSON.parse(local));
        return;
      }catch(e){}
    }
    if(sb){
      try{
        const {data:{session}}=await sb.auth.getSession();
        if(session?.user){
          showProfile(session.user);
          return;
        }
      }catch(e){}
    }
  }

  // Login handler
  if(loginForm){
    loginForm.onsubmit=e=>{
      e.preventDefault();
      const fd=new FormData(loginForm),
            login=String(fd.get('login')||'').trim(),
            password=String(fd.get('password')||'').trim();

      // Адміністратор СТО
      if(login.toLowerCase()==='admin'&&password==='sto-2026'){
        const admUser={name:'Адміністратор СТО',email:'admin@sto-yabluneve.ua',role:'admin',is_admin:true};
        localStorage.setItem('stoUserSession',JSON.stringify(admUser));
        showProfile(admUser);
        if(loginError)loginError.hidden=true;
        return;
      }

      // Перевіряємо збережених користувачів
      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
      let user=users.find(u=>(u.phone&&u.phone===login)||(u.email&&u.email.toLowerCase()===login.toLowerCase()));

      if(user){
        if(user.password===password){
          localStorage.setItem('stoUserSession',JSON.stringify(user));
          showProfile(user);
          if(loginError)loginError.hidden=true;
          return;
        }else{
          if(loginError){loginError.textContent='Невірний пароль.';loginError.hidden=false;}
          return;
        }
      }

      // Якщо новий логін з паролем
      if(login&&password.length>=4){
        const newUser={name:login.split('@')[0],phone:login.includes('@')?'':login,email:login.includes('@')?login:'',password:password,role:'customer'};
        users.push(newUser);
        localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));
        localStorage.setItem('stoUserSession',JSON.stringify(newUser));
        showProfile(newUser);
        if(loginError)loginError.hidden=true;
        return;
      }

      if(loginError){loginError.textContent='Введіть вірний логін та пароль.';loginError.hidden=false;}
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

      const newUser={name:name||'Клієнт',phone:phone,email:email,password:password,role:'customer'};
      let users=JSON.parse(localStorage.getItem('stoRegisteredUsers')||'[]');
      users.push(newUser);
      localStorage.setItem('stoRegisteredUsers',JSON.stringify(users));
      localStorage.setItem('stoUserSession',JSON.stringify(newUser));

      if(regError)regError.hidden=true;
      showProfile(newUser);
    };
  }

  checkSession();
})();
