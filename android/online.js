/* Standalone phone provider routes; credentials never return to JavaScript. */
(function(){
 'use strict';
 if(!window.HyperMealNative)return;
 window.HYPERMEAL_STANDALONE=true;window.HYPERMEAL_OFFLINE=false;
 const localFetch=window.fetch.bind(window),pending=new Map();let next=0;
 window.HyperMealNativeResult=(id,status,json)=>{const p=pending.get(id);if(!p)return;clearTimeout(p.timer);pending.delete(id);p.resolve(new Response(json,{status,headers:{'Content-Type':'application/json'}}))};
 function native(method,route,body){return new Promise((resolve,reject)=>{const id=String(++next),timer=setTimeout(()=>{pending.delete(id);reject(Error('Request timed out. Please retry.'))},180000);pending.set(id,{resolve,reject,timer});try{window.HyperMealNative.call(id,method,route,JSON.stringify(body))}catch(e){clearTimeout(timer);pending.delete(id);reject(e)}})}
 window.fetch=async function(resource,options={}){
  const url=new URL(typeof resource==='string'?resource:resource.url,location.href),route=url.pathname;
  if(url.origin!==location.origin||!(/^\/api\/(connections(?:\/gemini)?|analyze|coach|fitness\/strava(?:\/sync)?|products\/[0-9]+|share)$/.test(route)))return localFetch(resource,options);
  const body=options.body?JSON.parse(options.body):{},method=(options.method||'GET').toUpperCase();
  if(route==='/api/coach'&&body.allow_cloud){const response=await localFetch('/api/dashboard?date='+encodeURIComponent(body.date));const d=await response.json();if(!response.ok)return response;body.context={meal_totals:d.totals,logged_meals:d.meals.map(m=>m.title),complete_day:d.complete}}
  const response=await native(method,route,body);
  if(response.ok&&route==='/api/analyze'){const r=await response.json();r.foods=r.foods.map(f=>({...f,matches:window.HyperMealDeviceStore.matchFoods(f.name)}));return new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})}
  if(response.ok&&route==='/api/fitness/strava/sync'){const result=await response.clone().json();window.HyperMealDeviceStore.applyStrava(body.date,result.workouts)}
  return response;
 };
 document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
  const get=id=>document.getElementById(id),card=get('connections-card');
  get('instance-token')?.closest('label')?.remove();get('unlock')?.remove();
  if(card){for(const p of card.querySelectorAll('p'))if(p.textContent.includes('Provider keys are stored'))p.textContent='Credentials are encrypted on this phone using Android Keystore. Gemini receives only photos or questions and daily meal summaries when you allow it. No laptop is needed.';
   const note=document.createElement('p');note.className='draft-disclosure';note.textContent='Phone edition · tracking works offline. AI, barcode search and Strava require internet and your own provider credentials. Provider usage limits and charges may apply.';card.prepend(note);
   const remove=document.createElement('button');remove.className='text-button';remove.textContent='Remove Gemini key';remove.onclick=async()=>{try{const r=await window.fetch('/api/connections/gemini',{method:'DELETE'});if(!r.ok)throw Error((await r.json()).error);await loadConnections();toast('Gemini key removed from this phone.')}catch(e){toast(e.message,true)}};get('save-gemini')?.after(remove);
  }
  const community=document.querySelector('#page-community .notice');if(community)community.textContent='Your ideas and replies stay on this phone. Use Share to send a suggestion through another app. This is not a public community feed.';
  const posts=get('community-posts');if(posts){const add=()=>{for(const article of posts.querySelectorAll('article')){if(article.querySelector('[data-share]'))continue;const b=document.createElement('button');b.className='text-button';b.dataset.share='true';b.textContent='Share suggestion ↗';b.onclick=async()=>{try{const r=await window.fetch('/api/share',{method:'POST',body:JSON.stringify({text:'HyperMeal idea\n'+article.querySelector('.post-body').textContent})});if(!r.ok)throw Error((await r.json()).error)}catch(e){toast(e.message,true)}};article.append(b)}};new MutationObserver(add).observe(posts,{childList:true});add()}
  const template=get('download-template');if(template){template.textContent='View CSV template';template.addEventListener('click',e=>{e.stopImmediatePropagation();const dlg=document.createElement('dialog'),area=document.createElement('textarea'),close=document.createElement('button');area.readOnly=true;area.value='date,active_kcal,steps\n'+get('day').value+',300,6500\n';area.setAttribute('aria-label','CSV template to copy');close.textContent='Close';close.onclick=()=>{dlg.close();dlg.remove()};dlg.append(area,close);document.body.append(dlg);dlg.showModal();area.select()},true)}
 },0));
})();
