/* Load before the app to avoid a flash of the wrong theme. */
(function(){
 function read(){try{return localStorage.getItem('hipermeal-theme')}catch(e){return null}}
 function apply(theme){document.documentElement.dataset.theme=theme;const b=document.getElementById('theme-toggle');if(b){b.textContent=theme==='dark'?'☀ Light mode':'◐ Dark mode';b.setAttribute('aria-pressed',String(theme==='dark'))}let m=document.querySelector('meta[name=theme-color]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.append(m)}m.content=theme==='dark'?'#151515':'#f4f4f4'}
 apply(read()==='dark'?'dark':'light');
 document.addEventListener('DOMContentLoaded',()=>{
  const b=document.createElement('button');b.id='theme-toggle';b.type='button';b.className='theme-toggle';b.setAttribute('aria-label','Toggle dark theme');const host=document.querySelector('.header-right');if(host)host.append(b);else document.querySelector('main').prepend(b);
  b.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('hipermeal-theme',theme)}catch(e){}apply(theme)});
  apply(document.documentElement.dataset.theme);
  if(window.HYPERMEAL_OFFLINE){const note=document.createElement('div');note.className='mobile-draft-note';note.textContent='Android draft · Saved on this device. AI and live fitness connections will be enabled when the backend is connected.';document.querySelector('header').after(note)}
 });
})();
