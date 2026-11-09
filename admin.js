(() => {
 'use strict';
 const API='https://odbdyleemkvghmwcwxqi.supabase.co',KEY='sb_publishable_sAdvoyW0Y01RosCZnyFPPw_Uurp_Xq6';
 let active=false,busy=false,stats=new Map();
 const panel=document.createElement('section');panel.hidden=true;panel.className='inline-admin';
 panel.innerHTML=`<h2>Управление уроками</h2><p id="admin-message" role="status" aria-live="polite">Войдите, чтобы увидеть посещения и изменять лайки.</p>
 <div id="admin-login"><form id="admin-email-form"><label>Email <input id="admin-email" type="email" autocomplete="email" required></label> <button>Получить письмо для входа</button></form>
 <form id="admin-code-form" hidden><p>Скопируйте исходную ссылку входа из письма и вставьте ниже. Если в письме указан код, можно ввести код.</p><label>Код или ссылка <input id="admin-code" required autocomplete="one-time-code"></label> <button>Войти</button></form></div>
 <div id="admin-controls" hidden><label>Статистика за <select id="admin-days"><option value="7">7 дней</option><option value="30" selected>30 дней</option><option value="90">90 дней</option></select></label> <button id="admin-refresh">Обновить</button> <button id="admin-logout">Выйти</button>
 <p id="admin-summary"></p><small>Просмотры и приблизительное число посетителей показаны в карточках уроков ниже. Посетитель определяется по браузеру. Просмотр не подтверждает прочтение. Добавленные лайки — искусственные реакции.</small></div>`;
 document.querySelector('.toolbar').before(panel);
 const $=id=>document.getElementById(id),say=text=>{$('admin-message').textContent=text;};
 const style=document.createElement('style');style.textContent='.inline-admin{background:white;padding:18px;border-radius:12px;margin-bottom:16px}.inline-admin h2{font-size:18px}.inline-admin input,.inline-admin select,.inline-admin button,.lesson-admin-tools input,.lesson-admin-tools button{font:inherit;padding:7px;border:1px solid #cbd8e3;border-radius:7px;margin:4px 0;max-width:100%}.inline-admin input{width:240px}.lesson-admin-tools{border-top:1px solid #d9e2ec;margin-top:12px;padding-top:10px;cursor:default;font-size:13px;color:#51606f}.lesson-admin-tools input{width:80px}.lesson-admin-tools button{background:#eef6ff;cursor:pointer}.inline-admin [hidden]{display:none!important}';document.head.append(style);
 async function api(path,body,auth=false){
  const headers={apikey:KEY,'Content-Type':'application/json'};
  if(auth){const token=sessionStorage.getItem('lesson_admin_token');if(!token)throw Error('Войдите заново');headers.Authorization='Bearer '+token;}
  const response=await fetch(API+path,{method:'POST',headers,body:JSON.stringify(body)}),data=await response.json().catch(()=>null);
  if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||'Ошибка запроса');return data;
 }
 const rpc=(name,body={})=>api('/rest/v1/rpc/'+name,body,true);
 function lock(value){busy=value;document.querySelectorAll('.inline-admin button,.lesson-admin-tools button').forEach(b=>b.disabled=value);}
 function decorate(){
  document.querySelectorAll('.lesson-admin-tools').forEach(el=>el.remove());if(!active)return;
  for(const card of document.querySelectorAll('.lesson-card')){
   const id=card.querySelector('[data-like-id]')?.dataset.likeId;if(!id)continue;
   const data=stats.get(id),box=document.createElement('div');box.className='lesson-admin-tools';
   box.onclick=e=>e.stopPropagation();const info=document.createElement('p');info.textContent=`За ${$('admin-days').value} дней: просмотры ${data?.views||0} · посетители ${data?.visitors||0}`;
   const label=document.createElement('label');label.textContent='Добавить лайков: ';const input=document.createElement('input');input.type='number';input.min='1';input.max='1000';input.step='1';input.value='1';label.append(input);
   const button=document.createElement('button');button.textContent='Добавить';button.disabled=busy;
   button.onclick=async e=>{e.preventDefault();e.stopPropagation();if(busy)return;const amount=Number(input.value);if(!Number.isInteger(amount)||amount<1||amount>1000){say('Укажите целое число от 1 до 1000.');return;}
    lock(true);try{const count=await rpc('admin_add_lesson_likes',{p_content_id:id,p_min:amount,p_max:amount,p_mode:'add'});await load();say(`Добавлено ${amount}. Теперь у урока ${count} лайков.`);}catch(error){say(error.message+' Перед повтором обновите данные.');}finally{lock(false);}};
   box.append(info,label,document.createTextNode(' '),button);card.append(box);
  }
 }
 async function load(){
  if(!await rpc('is_lesson_admin'))throw Error('У этого email нет прав администратора.');
  const [counts,visits]=await Promise.all([rpc('admin_lesson_counts'),rpc('admin_lesson_stats',{p_days:Number($('admin-days').value)})]);
  stats=new Map(visits.map(row=>[row.content_id,row]));active=true;panel.hidden=false;$('admin-login').hidden=true;$('admin-controls').hidden=false;
  $('admin-summary').textContent=`Просмотры уроков: ${visits.filter(r=>r.content_id!=='__catalog__').reduce((n,r)=>n+Number(r.views),0)} · Главная: ${stats.get('__catalog__')?.views||0}`;
  window.dispatchEvent(new CustomEvent('lesson-admin-counts',{detail:counts.map(r=>[r.content_id,Number(r.likes)])}));decorate();say('Управление включено. Статистика и поля лайков находятся в карточках уроков.');
 }
 $('admin-email-form').onsubmit=async e=>{e.preventDefault();lock(true);try{await api('/auth/v1/otp',{email:$('admin-email').value.trim(),create_user:true});$('admin-code-form').hidden=false;say('Письмо отправлено. Вставьте ссылку входа из письма или код.');}catch(error){say(error.message);}finally{lock(false);}};
 $('admin-code-form').onsubmit=async e=>{e.preventDefault();lock(true);try{
  const input=$('admin-code').value.trim();let body;
  if(/^https:\/\//.test(input)){const link=new URL(input),type=link.searchParams.get('type'),token=link.searchParams.get('token_hash')||link.searchParams.get('token');
   if(link.origin!==API||link.pathname!=='/auth/v1/verify'||!['signup','magiclink','email'].includes(type)||!token)throw Error('Вставьте исходную ссылку входа из письма Supabase.');body={token_hash:token,type};
  }else{body={email:$('admin-email').value.trim(),token:input,type:'email'};}
  const data=await api('/auth/v1/verify',body);sessionStorage.setItem('lesson_admin_token',data.access_token);$('admin-code').value='';await load();
 }catch(error){sessionStorage.removeItem('lesson_admin_token');active=false;decorate();say(error.message);}finally{lock(false);}};
 async function refresh(){lock(true);try{await load();}catch(error){say(error.message);}finally{lock(false);}}
 $('admin-refresh').onclick=refresh;$('admin-days').onchange=refresh;
 $('admin-logout').onclick=async()=>{lock(true);try{await api('/auth/v1/logout',{},true);}catch(_){}finally{sessionStorage.removeItem('lesson_admin_token');active=false;stats.clear();$('admin-controls').hidden=true;$('admin-login').hidden=false;decorate();say('Вы вышли.');lock(false);}};
 $('open-admin').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'start'});};
 document.addEventListener('lesson-cards-rendered',decorate);
 if(location.hash==='#admin')panel.hidden=false;
 if(sessionStorage.getItem('lesson_admin_token'))refresh();
})();
