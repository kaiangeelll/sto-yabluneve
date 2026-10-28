(()=>{
  const SUPABASE_URL='https://nabwuaxzogfuzaznvmph.supabase.co';
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYnd1YXh6b2dmdXphem52bXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzc2MDQsImV4cCI6MjEwODc1MzYwNH0.bvkJPsimj--W21Zort-I1saszUhbI2um96VUlxgwS2U';

  let sb=null;
  if(window.supabase&&window.supabase.createClient){
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  }

  const dialog=document.querySelector('#accountDialog'),
        loginForm=document.querySelector('#loginForm'),
        regForm=document.querySelector('#registerForm'),
        adminButtons=document.querySelectorAll('[data-open-admin]'),
        loginError=dialog?dialog.querySelector('[data-login-error]'):null,
        regError=dialog?dialog.querySelector('[data-register-error]'):null,
        userBox=dialog?dialog.querySelector('[data-user-profile]'):null,
        tabs=dialog?dialog.querySelector('.account-tabs'):null,
        panels=dialog?dialog.querySelectorAll('[data-panel]'):[];

  function showProfile(user){
    if(!dialog||!userBox)return;
    if(tabs)tabs.hidden=true;
    panels.forEach(p=>p.hidden=true);
    userBox.hidden=false;

    const name=user.name||user.user_metadata?.full_name||user.user_metadata?.name||user.email||user.phone||'Клієнт';
    const email=user.email||'';
    const phone=user.phone||'';
    const avatar=user.user_metadata?.avatar_url||user.user_metadata?.picture;

    const nameEl=dialog.querySelector('[data-user-name]');
    const emailEl=dialog.querySelector('[data-user-email]');
    const phoneEl=dialog.querySelector('[data-user-phone]');
    const avatarEl=dialog.querySelector('[data-user-avatar]');
    const initialsEl=dialog.querySelector('[data-user-initials]');
    const descEl=dialog.querySelector('[data-account-role-desc]');

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
    adminButtons.forEach(b=>b.hidden=!isAdmin);
    if(descEl){
      descEl.textContent=isAdmin?'Ви увійшли як Адміністратор сервісу. Доступне повне керування сайтом.':'Ви авторизовані як клієнт. Ваші авто та записи збережено.';
    }
  }

  function resetToAuth(){
    if(!dialog)return;
    if(userBox)userBox.hidden=true;
    if(tabs)tabs.hidden=false;
    panels.forEach(p=>{
      p.hidden=p.dataset.panel!=='login';
    });
    if(tabs){
      tabs.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t.dataset.tab==='login'));
    }
    adminButtons.forEach(b=>b.hidden=true);
    if(loginError)loginError.hidden=true;
    if(regError)regError.hidden=true;
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
          btn.innerHTML='<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>Увійти через Google';
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
    if(sb){
      try{
        const {data:{session}}=await sb.auth.getSession();
        if(session?.user){
          showProfile(session.user);
          return;
        }
      }catch(e){}
    }
    const local=localStorage.getItem('stoUserSession');
    if(local){
      try{showProfile(JSON.parse(local));}catch(e){}
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

      // Якщо користувач ще не створив пароль, але ввів логін
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
