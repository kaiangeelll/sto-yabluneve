(()=>{
  const SUPABASE_URL='https://nabwuaxzogfuzaznvmph.supabase.co';
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYnd1YXh6b2dmdXphem52bXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzc2MDQsImV4cCI6MjEwODc1MzYwNH0.bvkJPsimj--W21Zort-I1saszUhbI2um96VUlxgwS2U';

  let sb=null;
  if(window.supabase&&window.supabase.createClient){
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  }

  const ADMIN_EMAILS=[];

  const dialog=document.querySelector('#accountDialog'),
        form=document.querySelector('#loginForm'),
        adminButtons=document.querySelectorAll('[data-open-admin]'),
        error=dialog?dialog.querySelector('[data-login-error]'):null,
        userBox=dialog?dialog.querySelector('[data-user-profile]'):null,
        tabs=dialog?dialog.querySelector('.account-tabs'):null,
        panels=dialog?dialog.querySelectorAll('[data-panel]'):[];

  function showProfile(user){
    if(!dialog||!userBox)return;
    if(tabs)tabs.hidden=true;
    panels.forEach(p=>p.hidden=true);
    userBox.hidden=false;

    const name=user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Користувач';
    const email=user.email||'';
    const avatar=user.user_metadata?.avatar_url||user.user_metadata?.picture;

    const nameEl=dialog.querySelector('[data-user-name]');
    const emailEl=dialog.querySelector('[data-user-email]');
    const avatarEl=dialog.querySelector('[data-user-avatar]');
    const initialsEl=dialog.querySelector('[data-user-initials]');
    const descEl=dialog.querySelector('[data-account-role-desc]');

    if(nameEl)nameEl.textContent=name;
    if(emailEl)emailEl.textContent=email;

    if(avatar&&avatarEl){
      avatarEl.src=avatar;
      avatarEl.hidden=false;
      if(initialsEl)initialsEl.hidden=true;
    }else if(initialsEl){
      initialsEl.textContent=(name[0]||'U').toUpperCase();
      initialsEl.hidden=false;
      if(avatarEl)avatarEl.hidden=true;
    }

    const isAdmin=ADMIN_EMAILS.includes((email||'').toLowerCase())||user.role==='admin'||user.is_admin===true;
    adminButtons.forEach(b=>b.hidden=!isAdmin);
    if(descEl){
      descEl.textContent=isAdmin?'Ви увійшли як Адміністратор сервісу. Доступне повне керування сайтом.':'Ви авторизовані як клієнт. Ваші записи та історія зберігаються.';
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
    if(error)error.hidden=true;
  }

  // Google OAuth
  document.querySelectorAll('[data-google-login]').forEach(btn=>{
    btn.onclick=async ()=>{
      if(!sb){
        alert('Supabase Auth клієнт ще завантажується...');
        return;
      }
      btn.disabled=true;
      btn.textContent='Перенаправлення на Google...';
      const {error:authErr}=await sb.auth.signInWithOAuth({
        provider:'google',
        options:{
          redirectTo:window.location.origin+window.location.pathname
        }
      });
      if(authErr){
        alert('Помилка авторизації через Google: '+authErr.message);
        btn.disabled=false;
        btn.innerHTML='Увійти через Google';
      }
    };
  });

  // Logout
  const logoutBtn=dialog?dialog.querySelector('[data-logout]'):null;
  if(logoutBtn){
    logoutBtn.onclick=async ()=>{
      if(sb)await sb.auth.signOut();
      localStorage.removeItem('stoUserSession');
      resetToAuth();
    };
  }

  // Check existing session
  async function checkSession(){
    if(sb){
      const {data:{session}}=await sb.auth.getSession();
      if(session?.user){
        showProfile(session.user);
        return;
      }
    }
    const local=localStorage.getItem('stoUserSession');
    if(local){
      try{showProfile(JSON.parse(local));}catch(e){}
    }
  }

  // Fallback demo login form
  if(form){
    form.onsubmit=e=>{
      e.preventDefault();
      const fd=new FormData(form),
            login=String(fd.get('phone')).trim().toLowerCase(),
            password=String(fd.get('password'));

      if(login==='admin'&&password==='sto-2026'){
        const admUser={email:'admin@sto-yabluneve.ua',user_metadata:{full_name:'Адміністратор СТО'},role:'admin',is_admin:true};
        localStorage.setItem('stoUserSession',JSON.stringify(admUser));
        showProfile(admUser);
        if(error)error.hidden=true;
        return;
      }

      if(login){
        const clientUser={email:login,user_metadata:{full_name:login},role:'customer'};
        localStorage.setItem('stoUserSession',JSON.stringify(clientUser));
        showProfile(clientUser);
        if(error)error.hidden=true;
        return;
      }

      if(error)error.hidden=false;
    };
  }

  checkSession();
})();
