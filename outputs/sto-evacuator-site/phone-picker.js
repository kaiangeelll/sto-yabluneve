/**
 * Phone Country Picker & National Number Formatter
 * СТО Евакуатор (м. Нове, вул. Яблунева, 20)
 * Підтримка України (+380 за замовчуванням) та країн Європи / світу (Росія виключена).
 */
(()=>{
  const COUNTRIES=[
    {code:'UA',name:'Україна',dial:'+380',flag:'🇺🇦',mask:'(XX) XXX-XX-XX',len:9},
    {code:'PL',name:'Польща',dial:'+48',flag:'🇵🇱',mask:'XXX XXX XXX',len:9},
    {code:'DE',name:'Німеччина',dial:'+49',flag:'🇩🇪',mask:'XXXX XXXXXXX',len:11},
    {code:'MD',name:'Молдова',dial:'+373',flag:'🇲🇩',mask:'XXXX XXXX',len:8},
    {code:'RO',name:'Румунія',dial:'+40',flag:'🇷🇴',mask:'XXX XXX XXX',len:9},
    {code:'CZ',name:'Чехія',dial:'+420',flag:'🇨🇿',mask:'XXX XXX XXX',len:9},
    {code:'SK',name:'Словаччина',dial:'+421',flag:'🇸🇰',mask:'XXX XXX XXX',len:9},
    {code:'GB',name:'Велика Британія',dial:'+44',flag:'🇬🇧',mask:'XXXX XXXXXX',len:10},
    {code:'US',name:'США / Канада',dial:'+1',flag:'🇺🇸',mask:'(XXX) XXX-XXXX',len:10},
    {code:'IT',name:'Італія',dial:'+39',flag:'🇮🇹',mask:'XXX XXX XXXX',len:10},
    {code:'ES',name:'Іспанія',dial:'+34',flag:'🇪🇸',mask:'XXX XX XX XX',len:9},
    {code:'FR',name:'Франція',dial:'+33',flag:'🇫🇷',mask:'X XX XX XX XX',len:9},
    {code:'LT',name:'Литва',dial:'+370',flag:'🇱🇹',mask:'(XX) XXX-XX',len:8},
    {code:'LV',name:'Латвія',dial:'+371',flag:'🇱🇻',mask:'XX XXX XXX',len:8},
    {code:'EE',name:'Естонія',dial:'+372',flag:'🇪🇪',mask:'XXXX XXXX',len:8},
    {code:'AT',name:'Австрія',dial:'+43',flag:'🇦🇹',mask:'XXXX XXXXXX',len:10},
    {code:'CH',name:'Швейцарія',dial:'+41',flag:'🇨🇭',mask:'XX XXX XX XX',len:9},
    {code:'NL',name:'Нідерланди',dial:'+31',flag:'🇳🇱',mask:'X XX XX XX XX',len:9},
    {code:'BE',name:'Бельгія',dial:'+32',flag:'🇧🇪',mask:'XXX XX XX XX',len:9},
    {code:'HU',name:'Угорщина',dial:'+36',flag:'🇭🇺',mask:'XX XXX XXXX',len:9},
    {code:'IE',name:'Ірландія',dial:'+353',flag:'🇮🇪',mask:'XX XXX XXXX',len:9},
    {code:'PT',name:'Португалія',dial:'+351',flag:'🇵🇹',mask:'XXX XXX XXX',len:9},
    {code:'SE',name:'Швеція',dial:'+46',flag:'🇸🇪',mask:'XX XXX XX XX',len:9},
    {code:'NO',name:'Норвегія',dial:'+47',flag:'🇳🇴',mask:'XXX XX XXX',len:8},
    {code:'DK',name:'Данія',dial:'+45',flag:'🇩🇰',mask:'XX XX XX XX',len:8},
    {code:'FI',name:'Фінляндія',dial:'+358',flag:'🇫🇮',mask:'XX XXX XX XX',len:9},
    {code:'BG',name:'Болгарія',dial:'+359',flag:'🇧🇬',mask:'XXX XXX XXX',len:9},
    {code:'GR',name:'Греція',dial:'+30',flag:'🇬🇷',mask:'XXX XXX XXXX',len:10},
    {code:'HR',name:'Хорватія',dial:'+385',flag:'🇭🇷',mask:'XX XXX XXXX',len:9},
    {code:'CY',name:'Кіпр',dial:'+357',flag:'🇨🇾',mask:'XX XXX XXX',len:8},
    {code:'IL',name:'Ізраїль',dial:'+972',flag:'🇮🇱',mask:'(XX) XXX-XXXX',len:9},
    {code:'TR',name:'Туреччина',dial:'+90',flag:'🇹🇷',mask:'(XXX) XXX-XX-XX',len:10},
    {code:'GE',name:'Грузія',dial:'+995',flag:'🇬🇪',mask:'XXX XX-XX-XX',len:9},
    {code:'AM',name:'Вірменія',dial:'+374',flag:'🇦🇲',mask:'XX XX-XX-XX',len:8},
    {code:'AZ',name:'Азербайджан',dial:'+994',flag:'🇦🇿',mask:'XX XXX-XX-XX',len:9},
    {code:'KZ',name:'Казахстан',dial:'+77',flag:'🇰🇿',mask:'(XXX) XXX-XX-XX',len:10}
  ];

  function formatPhoneLocal(rawVal,country){
    let digits=String(rawVal||'').replace(/\D/g,'');
    if(!digits.length)return '';

    if(country.code==='UA'){
      // Якщо ввели +380 або 380 на початку
      if(digits.startsWith('380')){
        digits=digits.slice(3);
        if(!digits.length)return '(';
      }
      // Якщо ввели перший 0 (наприклад 091...), прибираємо його
      if(digits.startsWith('0')){
        if(digits.length===1)return '(';
        digits=digits.slice(1);
      }
      digits=digits.slice(0,9);
      if(!digits.length)return '';

      let res='('+digits.slice(0,2);
      if(digits.length>=2)res+=') '+digits.slice(2,5);
      if(digits.length>=5)res+='-'+digits.slice(5,7);
      if(digits.length>=7)res+='-'+digits.slice(7,9);
      return res;
    }

    // Інші країни
    const dialDigits=country.dial.replace(/\D/g,'');
    if(digits.startsWith(dialDigits))digits=digits.slice(dialDigits.length);
    if(digits.startsWith('0'))digits=digits.slice(1);
    const maxLen=country.len||10;
    digits=digits.slice(0,maxLen);
    if(!digits.length)return '';

    let res='';
    let dIdx=0;
    for(let i=0;i<country.mask.length&&dIdx<digits.length;i++){
      const ch=country.mask[i];
      if(ch==='X'){
        res+=digits[dIdx++];
      }else{
        res+=ch;
      }
    }
    if(dIdx<digits.length){
      res+=' '+digits.slice(dIdx);
    }
    return res;
  }

  function initPhoneGroup(group){
    if(group._phoneInitialized)return;
    group._phoneInitialized=true;

    let currentCountry=COUNTRIES[0]; // UA
    const btn=group.querySelector('[data-phone-btn]'),
          flagEl=group.querySelector('[data-phone-flag]'),
          dialEl=group.querySelector('[data-phone-dial]'),
          localInput=group.querySelector('[data-phone-local]'),
          hiddenInput=group.querySelector('[data-phone-hidden]'),
          dropdown=group.querySelector('[data-phone-dropdown]'),
          searchInput=group.querySelector('[data-phone-search]'),
          listEl=group.querySelector('[data-phone-list]');

    function syncValue(){
      if(!localInput||!hiddenInput)return;
      const formatted=formatPhoneLocal(localInput.value,currentCountry);
      localInput.value=formatted;
      const cleanDigits=formatted.replace(/\D/g,'');
      if(cleanDigits.length>=4){
        hiddenInput.value=`${currentCountry.dial} ${formatted}`;
      }else{
        hiddenInput.value='';
      }
    }

    function setCountry(c){
      currentCountry=c;
      if(flagEl)flagEl.textContent=c.flag;
      if(dialEl)dialEl.textContent=c.dial;
      if(localInput){
        localInput.placeholder=c.code==='UA'?'(91) 906-53-08':c.mask.replace(/X/g,'_');
      }
      syncValue();
      closeDropdown();
      if(localInput)localInput.focus();
    }

    function openDropdown(){
      if(!dropdown)return;
      // Закриваємо всі інші відкриті меню
      document.querySelectorAll('[data-phone-dropdown]').forEach(d=>{
        if(d!==dropdown)d.hidden=true;
      });
      document.querySelectorAll('[data-phone-btn]').forEach(b=>{
        if(b!==btn)b.classList.remove('is-active');
      });

      dropdown.hidden=false;
      if(btn)btn.classList.add('is-active');
      if(searchInput){
        searchInput.value='';
        renderList('');
        setTimeout(()=>searchInput.focus(),60);
      }
    }

    function closeDropdown(){
      if(dropdown)dropdown.hidden=true;
      if(btn)btn.classList.remove('is-active');
    }

    function renderList(query){
      if(!listEl)return;
      const q=String(query||'').toLowerCase().trim();
      const filtered=COUNTRIES.filter(c=>{
        if(!q)return true;
        return c.name.toLowerCase().includes(q)||c.dial.includes(q)||c.code.toLowerCase().includes(q);
      });

      if(!filtered.length){
        listEl.innerHTML='<div style="padding:12px;font-size:12px;color:#7a8d7d;text-align:center;">Країну не знайдено</div>';
        return;
      }

      listEl.innerHTML=filtered.map(c=>`
        <button type="button" class="phone-country-item ${c.code===currentCountry.code?'is-selected':''}" data-country-code="${c.code}">
          <span class="item-left">
            <span class="item-flag">${c.flag}</span>
            <span class="item-name">${c.name}</span>
          </span>
          <span class="item-dial">${c.dial}</span>
        </button>
      `).join('');

      listEl.querySelectorAll('[data-country-code]').forEach(itemBtn=>{
        itemBtn.onclick=e=>{
          e.preventDefault();
          e.stopPropagation();
          const code=itemBtn.dataset.countryCode;
          const found=COUNTRIES.find(x=>x.code===code);
          if(found)setCountry(found);
        };
      });
    }

    if(btn){
      btn.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        if(dropdown&&!dropdown.hidden){
          closeDropdown();
        }else{
          openDropdown();
        }
      };
    }

    if(searchInput){
      searchInput.oninput=e=>{
        renderList(e.target.value);
      };
      searchInput.onkeydown=e=>{
        if(e.key==='Escape'){
          closeDropdown();
          if(localInput)localInput.focus();
        }
      };
    }

    if(localInput){
      localInput.addEventListener('focus',()=>{
        if(!localInput.value && currentCountry.code==='UA'){
          localInput.value='(';
        }
      });
      localInput.addEventListener('blur',()=>{
        if(localInput.value==='('){
          localInput.value='';
          syncValue();
        }
      });
      localInput.addEventListener('input',syncValue);
      localInput.addEventListener('paste',()=>{
        setTimeout(syncValue,20);
      });
    }

    // Зберігаємо внутрішні методи
    group._setCountry=setCountry;
    group._syncValue=syncValue;
    group._getCurrentCountry=()=>currentCountry;
    group._closeDropdown=closeDropdown;
  }

  // Закриття списку при кліку поза полем
  document.addEventListener('click',e=>{
    const group=e.target.closest('[data-phone-group]');
    if(!group){
      document.querySelectorAll('[data-phone-dropdown]').forEach(d=>d.hidden=true);
      document.querySelectorAll('[data-phone-btn]').forEach(b=>b.classList.remove('is-active'));
    }
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      document.querySelectorAll('[data-phone-dropdown]').forEach(d=>d.hidden=true);
      document.querySelectorAll('[data-phone-btn]').forEach(b=>b.classList.remove('is-active'));
    }
  });

  // Глобальний метод для встановлення номера з коду або з сесії
  window.setPhoneGroupValue=function(group,fullVal){
    if(!group)return;
    if(!group._phoneInitialized)initPhoneGroup(group);

    const localInput=group.querySelector('[data-phone-local]');
    const hiddenInput=group.querySelector('[data-phone-hidden]');

    if(!fullVal){
      if(localInput)localInput.value='';
      if(hiddenInput)hiddenInput.value='';
      if(group._setCountry)group._setCountry(COUNTRIES[0]);
      return;
    }

    const clean=String(fullVal).trim();
    // Шукаємо країну за кодом на початку номера
    let matchedCountry=COUNTRIES.find(c=>clean.startsWith(c.dial));
    if(!matchedCountry){
      matchedCountry=COUNTRIES[0]; // UA
    }

    if(group._setCountry)group._setCountry(matchedCountry);

    let restDigits=clean;
    if(clean.startsWith(matchedCountry.dial)){
      restDigits=clean.slice(matchedCountry.dial.length).trim();
    }

    if(localInput){
      localInput.value=restDigits;
      if(group._syncValue)group._syncValue();
    }
  };

  window.initPhonePickers=function(){
    document.querySelectorAll('[data-phone-group]').forEach(initPhoneGroup);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',window.initPhonePickers);
  }else{
    window.initPhonePickers();
  }
})();