(() => {
 'use strict';
 const API='https://odbdyleemkvghmwcwxqi.supabase.co',KEY='sb_publishable_sAdvoyW0Y01RosCZnyFPPw_Uurp_Xq6';
 let active=false,busy=false,stats=new Map();
 const panel=document.createElement('section');panel.hidden=true;panel.className='inline-admin';
 panel.innerHTML=`<p id="admin-message" role="status" aria-live="polite"></p>
 <div id="admin-controls" hidden><label>Статистика за <select id="admin-days"><option value="7">7 дней</option><option value="30" selected>30 дней</option><option value="90">90 дней</option></select></label> <button id="admin-refresh">Обновить</button> <button id="admin-logout">Выйти</button>
 <p id="admin-summary"></p><small>Просмотры и приблизительное число посетителей показаны в карточках уроков ниже. Посетитель определяется по браузеру. Просмотр не подтверждает прочтение. Добавленные лайки — искусственные реакции.</small></div>`;
 document.querySelector('.toolbar').before(panel);
 const dialog=document.createElement('dialog');dialog.className='login-dialog';
 dialog.setAttribute('aria-labelledby','login-title');
 dialog.innerHTML=`<button type="button" id="close-login" aria-label="Закрыть">×</button><h2 id="login-title">Вход</h2>
 <form id="admin-login-form"><label>Email<input id="admin-email" type="email" autocomplete="username" required></label><label>Пароль<input id="admin-password" type="password" autocomplete="current-password" required></label><p id="login-error" role="alert"></p><button type="submit">Войти</button></form>`;
 document.body.append(dialog);
 const $=id=>document.getElementById(id),say=text=>{$('admin-message').textContent=text;$('login-error').textContent=text;};
 const style=document.createElement('style');style.textContent='.inline-admin{background:white;padding:18px;border-radius:12px;margin-bottom:16px}.inline-admin h2{font-size:18px}.inline-admin input,.inline-admin select,.inline-admin button,.lesson-admin-tools input,.lesson-admin-tools button{font:inherit;padding:7px;border:1px solid #cbd8e3;border-radius:7px;margin:4px 0;max-width:100%}.inline-admin input{width:240px}.lesson-admin-tools{border-top:1px solid #d9e2ec;margin-top:12px;padding-top:10px;cursor:default;font-size:13px;color:#51606f}.lesson-admin-tools input{width:80px}.lesson-admin-tools button{background:#eef6ff;cursor:pointer}.inline-admin [hidden]{display:none!important}';document.head.append(style);
 style.textContent+=' .inline-admin[hidden]{display:none!important}.login-dialog{border:0;border-radius:16px;padding:28px;max-width:380px;width:calc(100% - 32px);color:#243746;box-shadow:0 15px 60px #0003}.login-dialog::backdrop{background:#142d4655}.login-dialog label{display:block;margin:16px 0}.login-dialog input{display:block;width:100%;font:inherit;padding:10px;margin-top:6px;border:1px solid #cbd8e3;border-radius:8px}.login-dialog button{font:inherit;padding:9px 18px;border:1px solid #cbd8e3;border-radius:8px;cursor:pointer}.login-dialog button[type=submit]{width:100%;background:#2980b9;color:white}.login-dialog #close-login{position:absolute;right:10px;top:8px;background:none;border:0;font-size:24px;padding:3px 8px}#login-error{font-size:14px;color:#a82929}.container{position:relative}#open-admin{position:absolute;right:0;top:-4px;background:transparent;border:0;padding:4px;color:#7f8c8d;cursor:pointer;width:30px;height:30px}#open-admin svg{width:22px;height:22px}.version-line{padding:0 34px}';
 function saveSession(data){sessionStorage.setItem('lesson_admin_token',data.access_token);if(data.refresh_token)sessionStorage.setItem('lesson_admin_refresh',data.refresh_token);sessionStorage.setItem('lesson_admin_expires',String(Date.now()+(data.expires_in||3600)*1000));}
 function clearSession(){for(const key of ['lesson_admin_token','lesson_admin_refresh','lesson_admin_expires'])sessionStorage.removeItem(key);}
 async function api(path,body,auth=false){
  const headers={apikey:KEY,'Content-Type':'application/json'};
  if(auth){const refresh=sessionStorage.getItem('lesson_admin_refresh');if(refresh&&Number(sessionStorage.getItem('lesson_admin_expires'))<Date.now()+60000){saveSession(await api('/auth/v1/token?grant_type=refresh_token',{refresh_token:refresh}));}const token=sessionStorage.getItem('lesson_admin_token');if(!token)throw Error('Войдите заново');headers.Authorization='Bearer '+token;}
  const response=await fetch(API+path,{method:'POST',headers,body:JSON.stringify(body)}),data=await response.json().catch(()=>null);
  if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||'Ошибка запроса');return data;
 }
 const rpc=(name,body={})=>api('/rest/v1/rpc/'+name,body,true);
 function lock(value){busy=value;document.querySelectorAll('.inline-admin button,.lesson-admin-tools button,.login-dialog button[type=submit]').forEach(b=>b.disabled=value);}
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
  stats=new Map(visits.map(row=>[row.content_id,row]));active=true;panel.hidden=false;$('admin-controls').hidden=false;dialog.close();$('open-admin').setAttribute('aria-label','Управление');$('open-admin').title='Управление';
  $('admin-summary').textContent=`Просмотры уроков: ${visits.filter(r=>r.content_id!=='__catalog__').reduce((n,r)=>n+Number(r.views),0)} · Главная: ${stats.get('__catalog__')?.views||0}`;
  window.dispatchEvent(new CustomEvent('lesson-admin-counts',{detail:counts.map(r=>[r.content_id,Number(r.likes)])}));decorate();say('Управление включено. Статистика и поля лайков находятся в карточках уроков.');
 }
 $('admin-login-form').onsubmit=async e=>{e.preventDefault();lock(true);$('login-error').textContent='';try{
  saveSession(await api('/auth/v1/token?grant_type=password',{email:$('admin-email').value.trim(),password:$('admin-password').value}));$('admin-password').value='';await load();
 }catch(error){clearSession();active=false;panel.hidden=true;decorate();say(error.message==='Invalid login credentials'?'Неверный email или пароль.':error.message);}finally{lock(false);}};
 async function refresh(){lock(true);try{await load();}catch(error){say(error.message);}finally{lock(false);}}
 $('admin-refresh').onclick=refresh;$('admin-days').onchange=refresh;
 $('admin-logout').onclick=async()=>{lock(true);try{await api('/auth/v1/logout',{},true);}catch(_){}finally{clearSession();active=false;stats.clear();panel.hidden=true;$('admin-controls').hidden=true;decorate();say('');$('open-admin').setAttribute('aria-label','Войти');$('open-admin').title='Войти';lock(false);}};
 $('open-admin').onclick=()=>{if(active){panel.hidden=!panel.hidden;return;}$('login-error').textContent='';dialog.showModal();$('admin-email').focus();};
 $('close-login').onclick=()=>{dialog.close();$('admin-password').value='';};dialog.onclick=e=>{if(e.target===dialog)dialog.close();};dialog.addEventListener('close',()=>{$('admin-password').value='';});
 document.addEventListener('lesson-cards-rendered',decorate);
 if(sessionStorage.getItem('lesson_admin_token')){lock(true);load().catch(()=>{clearSession();active=false;panel.hidden=true;decorate();}).finally(()=>lock(false));}
})();
