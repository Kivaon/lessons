(() => {
  if (location.hostname !== 'kivaon.github.io') return;
  if (window.__lessonViewStarted) return;
  window.__lessonViewStarted = true;
  async function record() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', record);
    try {
      // Администратор не увеличивает статистику своими проверками.
      if (sessionStorage.getItem('lesson_admin_token')) return;
      const root = new URL(document.currentScript?.src || window.__lessonAnalyticsScript);
      const catalog = await fetch(new URL('library.json', root)).then(r => {
        if (!r.ok) throw Error('catalog unavailable');
        return r.json();
      });
      const base = new URL('.', root);
      const path = decodeURIComponent(location.pathname);
      const item = catalog.find(i => decodeURIComponent(new URL(i.file_path, base).pathname) === path);
      const isCatalog = path === base.pathname || path === base.pathname + 'index.html';
      if (!item && !isCatalog) return;
      let visitor = localStorage.getItem('lesson_analytics_visitor');
      if (!/^[0-9a-f-]{36}$/i.test(visitor || '')) {
        visitor = crypto.randomUUID();
        localStorage.setItem('lesson_analytics_visitor', visitor);
      }
      await fetch('https://odbdyleemkvghmwcwxqi.supabase.co/rest/v1/rpc/record_lesson_view', {
        method: 'POST', keepalive: true,
        headers: {'apikey':'sb_publishable_sAdvoyW0Y01RosCZnyFPPw_Uurp_Xq6','Content-Type':'application/json'},
        body: JSON.stringify({p_event_id:crypto.randomUUID(),p_content_id:item?.lesson_id || '__catalog__',p_visitor_id:visitor})
      });
    } catch (_) { /* Статистика не мешает чтению, включая отказ хранилища/сети. */ }
  }
  window.__lessonAnalyticsScript = document.currentScript.src;
  if (document.visibilityState === 'visible') record();
  else document.addEventListener('visibilitychange', record);
})();
