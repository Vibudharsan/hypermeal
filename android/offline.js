/* Device-local API contract for the Android draft. No provider credentials or network calls. */
(function(){
 'use strict';
 window.HYPERMEAL_OFFLINE=true;
 const KEY='hipermeal-android-v1',N=['kcal','protein','carbs','fat'];
 const catalog=__FOOD_CATALOG__;
 const routines=[
 {name:'A little fresh air',type:'walk',minutes:20,description:'An easy walk at a comfortable pace. Adapt the time to how you feel.'},
 {name:'Simple strength',type:'strength',minutes:15,description:'Choose familiar comfortable movements: chair sit-to-stands, wall push-ups and light rows. Rest between sets.'},
 {name:'Mobility & recovery',type:'yoga',minutes:10,description:'Gentle shoulder circles, ankle movements and comfortable stretches. Skip painful movements.'}];
 const blank=()=>({profile:null,foods:[],meals:[],workouts:[],weights:[],forecasts:[],habits:{},fitness:{},posts:[]});
 const fail=(message,status=422)=>{const e=new Error(message);e.status=status;throw e};
 function load(){try{const raw=localStorage.getItem(KEY);return raw?{...blank(),...JSON.parse(raw)}:blank()}catch(e){fail('Could not read device storage. Your existing data has not been overwritten.',500)}}
 function save(d){try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){fail('Device storage is full or unavailable. This change was not saved.',507)}}
 function num(v,min,max,name){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('Invalid '+name);return v}
 function str(v,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)fail('Enter nonempty text up to '+max+' characters.');return v.trim()}
 function day(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Date must be YYYY-MM-DD.');return v}
 const shift=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
 function readingDay(v){day(v);if(v>shift(new Date().toISOString().slice(0,10),1))fail('Future readings are not accepted.');return v}
 const round=(v,n=2)=>Math.round((v+Number.EPSILON)*10**n)/10**n;
 const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const foodRecord=f=>({category:'Other',aliases:[],source:'Typical reference values; varieties differ',...f,basis:'100g edible portion',estimated:true});
 const allFoods=d=>[...[...d.foods].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())),...catalog];
 const findFood=(d,ident)=>allFoods(d).find(f=>f.id===ident);
 const tokens=v=>new Set((v.toLowerCase().match(/[a-z0-9]+/g)||[]).map(w=>w.endsWith('es')&&w.length>4?w.slice(0,-2):w.endsWith('s')&&w.length>3?w.slice(0,-1):w));
 const esc=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function searchFoods(d,query,limit){const q=String(query||'').trim().toLowerCase(),foods=allFoods(d);if(!q)return limit?foods.slice(0,limit):foods;const wanted=tokens(q),scored=[];
  for(const f of foods){let best=0;for(let name of [f.name,...(f.aliases||[])]){name=name.toLowerCase();if(name===q)best=Math.max(best,3);else if(new RegExp('\\b'+esc(q)).test(name))best=Math.max(best,2-name.length/1000);else if(name.length>3&&new RegExp('\\b'+esc(name)+'\\b').test(q))best=Math.max(best,2+name.length/100);const have=tokens(name),shared=[...wanted].filter(w=>have.has(w)).length;if(shared)best=Math.max(best,shared/have.size+shared/wanted.size)}if(best)scored.push([best,!!f.user,f])}
  scored.sort((a,b)=>b[0]-a[0]||(b[1]-a[1]));const found=scored.map(s=>s[2]);return limit?found.slice(0,limit):found}
 const notice='Estimates only. Confirm portions, ingredients and label values. No medical or dietary diagnosis.';
 function estimate(p,d){if(!Array.isArray(p.items)||!p.items.length||p.items.length>50)fail('Provide 1 to 50 foods.');const totals=Object.fromEntries(N.map(k=>[k,0]));const items=p.items.map(i=>{const grams=num(i.grams,0.1,5000,'grams'),f=i.food_id?findFood(d,i.food_id):null;if(i.food_id&&!f)fail('Unknown food.');const name=f?f.name:str(i.name),source=f?(f.source||'Typical reference values; varieties differ'):str(i.source||'User-entered nutrition',500),values=f||i.per_100g;if(!values||typeof values!=='object')fail('Provide all nutrition values per 100g.');const per_100g={},nutrition={};for(const k of N){per_100g[k]=num(values[k],0,k==='kcal'?1000:100,k);const v=per_100g[k]*grams/100;totals[k]+=v;nutrition[k]=round(v)}return {name,grams,source,per_100g,nutrition}});for(const k of N)totals[k]=round(totals[k]);return {items,totals,notice}}
 function meal(p,ident,d){if(p.confirmed!==true)fail('Review foods and portions, then confirm.');const notes=p.notes||'';if(typeof notes!=='string'||notes.length>2000)fail('Notes must be under 2000 characters.');return {...estimate(p,d),id:ident||id(),date:day(p.date),title:str(p.title),notes,confirmed:true,updated_at:new Date().toISOString()}}
 function dashboard(d,date){day(date);const p=d.profile,meals=d.meals.filter(m=>m.date===date),workouts=d.workouts.filter(w=>w.date===date),h=d.habits[date]||{water_ml:0,complete:false},fit=d.fitness[date],totals=Object.fromEntries(N.map(k=>[k,round(meals.reduce((a,m)=>a+m.totals[k],0))])),active=fit?fit.active_kcal:workouts.reduce((a,w)=>a+w.active_kcal,0),minutes=workouts.reduce((a,w)=>a+w.minutes,0);return {date,profile:p,meals,workouts,totals,active_kcal:round(active,1),activity_minutes:minutes,burn_source:fit?'Imported daily activity CSV':'Logged activities',steps:fit?fit.steps:null,total_burn:p?round(p.baseline_kcal+active,1):null,remaining:p?Math.round(p.calorie_goal-totals.kcal):null,water_ml:h.water_ml,complete:h.complete,score:p?Math.round((h.complete?40:0)+30*Math.min(1,h.water_ml/p.water_goal)+30*Math.min(1,minutes/p.activity_goal)):null,score_description:'40 points for a complete food log, 30 for hydration, 30 for movement. A habit score, not a health assessment.',routine:routines}}
 function progress(d,date){day(date);const weights=d.weights.filter(w=>w.date<=date).sort((a,b)=>a.date.localeCompare(b.date)),forecasts=d.forecasts.map(f=>{const actual=weights.find(w=>w.date>=f.target_date&&w.date<=shift(f.target_date,7));return actual?{...f,actual_kg:actual.weight_kg,actual_date:actual.date,error_kg:round(actual.weight_kg-f.predicted_kg,3),absolute_percentage_error:round(Math.abs(actual.weight_kg-f.predicted_kg)/actual.weight_kg*100,3)}:{...f}}),actual=weights.at(-1),evaluated=forecasts.filter(f=>f.actual_kg!==undefined);return {weights,forecasts,current_weight:actual?actual.weight_kg:null,bmi:actual&&d.profile?round(actual.weight_kg/(d.profile.height_cm/100)**2,1):null,mean_absolute_percentage_error:evaluated.length?round(evaluated.reduce((a,f)=>a+f.absolute_percentage_error,0)/evaluated.length,3):null,next_checkin:actual?shift(actual.date,30):null}}
 function forecast(d,date){readingDay(date);const info=progress(d,date),anchor=info.weights.at(-1);if(!d.profile||!anchor)fail('Save a profile and weight reading first.');if(anchor.date!==date)fail('Record a weight reading for the selected day first.');if(d.forecasts.some(f=>f.date===date))fail('A forecast for this check-in is already preserved.',409);const days=Object.entries(d.habits).filter(([k,h])=>k>=shift(date,-30)&&k<date&&h.complete).map(([k])=>k);if(days.length<7)fail('At least 7 completed food-log days in the previous 30 days are needed.');const balance=days.reduce((a,k)=>{const x=dashboard(d,k);return a+x.totals.kcal-x.total_burn},0)/days.length,past=info.forecasts.filter(f=>f.actual_kg!==undefined&&f.actual_date<=date),correction=past.length?Math.max(-.03,Math.min(.03,.25*past.reduce((a,f)=>a+f.error_kg/30,0)/past.length)):0,rate=Math.max(-.1,Math.min(.1,balance/7700+correction));const f={id:id(),date,target_date:shift(date,30),start_kg:anchor.weight_kg,predicted_kg:round(anchor.weight_kg+rate*30),complete_days:days.length,mean_energy_balance:round(balance,1),correction_kg_per_day:round(correction,4),calibration_count:past.length,method:'Experimental energy-balance scenario with bounded historical signed-error correction.',notice:'Not a validated weight model. Your goals are never changed automatically.'};d.forecasts.push(f);return f}
 function csvRows(raw){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field=''}else field+=c}if(quoted)fail('Unclosed quote in CSV.');if(field||row.length){row.push(field);rows.push(row)}return rows}
 function dispatch(d,path,method,p,q){
  if(path==='/api/health')return {status:'ok',image_recognition_configured:false,scope:'offline Android draft'};
  if(path==='/api/profile'){
   if(method==='GET')return {profile:d.profile};
   if(method!=='PUT')fail('Method not allowed.',405);
   const v={id:'me',name:str(p.name,80),goal:str(p.goal,30),preferences:String(p.preferences||'').slice(0,500)};
   for(const [k,min,max] of [['age',20,100],['height_cm',100,230],['weight_kg',20,400],['calorie_goal',1200,5000],['baseline_kcal',1000,5000],['activity_goal',1,600],['water_goal',250,6000],['protein_goal',20,250]])v[k]=num(p[k],min,max,k);
   if(!['maintain','build habits','gain','lose'].includes(v.goal))fail('Invalid goal.');const date=readingDay(p.date);d.profile=v;if(!d.weights.length)d.weights.push({id:date,date,weight_kg:v.weight_kg});return {profile:v};
  }
  if(path==='/api/foods'){
   if(method==='GET')return {foods:searchFoods(d,q.get('q')).map(foodRecord)};
   if(method!=='POST')fail('Method not allowed.',405);if(d.foods.length>=2000)fail('Food database limit reached.');
   const f={id:'my-'+id().replace(/-/g,'').slice(0,12),name:str(p.name,120),category:'My foods',aliases:[],user:true,source:str(p.source||'User-entered nutrition',500)};for(const k of N)f[k]=num(p[k],0,k==='kcal'?1000:100,k);d.foods.push(f);return foodRecord(f);
  }
  if(path.startsWith('/api/foods/')&&method==='DELETE'){const ident=decodeURIComponent(path.split('/').at(-1)),idx=d.foods.findIndex(f=>f.id===ident);if(idx<0)fail('Only your own saved foods can be deleted.',404);d.foods.splice(idx,1);return {deleted:ident}}
  if(path==='/api/estimate'&&method==='POST')return estimate(p,d);
  if(path==='/api/dashboard')return dashboard(d,q.get('date'));
  if(path==='/api/meals'){
   if(method==='GET')return {meals:d.meals.filter(m=>!q.get('date')||m.date===day(q.get('date'))),count:d.meals.length};
   if(method==='POST'){const m=meal(p,null,d);d.meals.push(m);return m}
  }
  if(path.startsWith('/api/meals/')){const ident=path.split('/').at(-1),idx=d.meals.findIndex(m=>m.id===ident);if(idx<0)fail('Meal not found.',404);if(method==='GET')return d.meals[idx];if(method==='PUT'){d.meals[idx]=meal(p,ident,d);return d.meals[idx]}if(method==='DELETE'){d.meals.splice(idx,1);return {deleted:ident}}}
  if(path==='/api/summary'){const x=dashboard(d,q.get('date'));return {date:x.date,totals:x.totals,meal_count:x.meals.length,notice}}
  if(path==='/api/export')return {meals:d.meals,foods:d.foods,count:d.meals.length};
  if(path==='/api/habits'&&method==='PUT'){const date=readingDay(p.date);if(typeof p.complete!=='boolean')fail('Complete must be boolean.');return d.habits[date]={id:date,date,water_ml:num(p.water_ml,0,10000,'water'),complete:p.complete}}
  if(path==='/api/workouts'&&method==='POST'){const w={id:id(),date:readingDay(p.date),name:str(p.name,120),minutes:num(p.minutes,0,600,'minutes'),active_kcal:num(p.active_kcal,0,5000,'calories'),type:str(p.type||'other',40),source:'Manual'};d.workouts.push(w);return w}
  if(path.startsWith('/api/workouts/')&&method==='DELETE'){const ident=path.split('/').at(-1),idx=d.workouts.findIndex(w=>w.id===ident);if(idx<0)fail('Workout not found.',404);d.workouts.splice(idx,1);return {deleted:ident}}
  if(path==='/api/weights'&&method==='POST'){const date=readingDay(p.date),w={id:date,date,weight_kg:num(p.weight_kg,20,400,'weight')};d.weights=d.weights.filter(x=>x.date!==date);d.weights.push(w);return w}
  if(path==='/api/progress')return progress(d,q.get('date'));
  if(path==='/api/forecasts'&&method==='POST')return forecast(d,p.date);
  if(path==='/api/fitness/import'&&method==='POST'){const rows=csvRows(str(p.csv,500000).replace(/^\uFEFF/,'')),head=rows.shift().map(h=>h.trim()),a=head.indexOf('date'),b=head.indexOf('active_kcal'),c=head.indexOf('steps');if(a<0||b<0||c<0||!rows.length||rows.length>366)fail('Use date,active_kcal,steps with 1â€“366 rows.');const prepared=[],seen=new Set();for(const r of rows){const date=readingDay(r[a]);if(seen.has(date))fail('Duplicate daily dates.');seen.add(date);if(!r[b]?.trim()||!r[c]?.trim())fail('Missing activity value.');prepared.push({id:date,date,active_kcal:num(Number(r[b]),0,10000,'active calories'),steps:num(Number(r[c]),0,100000,'steps'),source:'Imported daily activity CSV'})}for(const row of prepared)d.fitness[row.date]=row;return {imported:prepared.length}}
  if(path.startsWith('/api/fitness/days/')&&method==='DELETE'){const date=day(path.split('/').at(-1));if(!d.fitness[date])fail('Import not found.',404);delete d.fitness[date];return {deleted:date}}
  if(path==='/api/connections')return {gemini_configured:false,strava_connected:false,offline:true};
  if(path==='/api/community'){
   if(method==='GET')return {posts:[...d.posts].reverse()};
   if(method==='POST'){const post={id:id(),date:new Date().toISOString(),author:str(p.author,50),topic:str(p.topic,40),body:str(p.body,2000),replies:[]};d.posts.push(post);return post}
  }
  if(path.startsWith('/api/community/')){const ident=path.split('/').at(-1),idx=d.posts.findIndex(x=>x.id===ident);if(idx<0)fail('Post not found.',404);if(method==='DELETE'){d.posts.splice(idx,1);return {deleted:ident}}if(method==='POST'){const post=d.posts[idx];if(post.replies.length>=100)fail('Reply limit reached.');post.replies.push({author:str(p.author,50),body:str(p.body,1000)});return post}}
  if(['/api/analyze','/api/coach'].includes(path)||path.startsWith('/api/connections/')||path.startsWith('/api/fitness/strava')||path.startsWith('/api/products/'))fail('This Android draft is offline. AI, barcode lookup and live fitness sync need the backend connection in the next phase. Manual tracking and CSV imports work now.',503);
  fail('Endpoint not available in the Android draft.',404);
 }
 const originalFetch=window.fetch.bind(window);
 window.fetch=async function(resource,options={}){
  const url=new URL(typeof resource==='string'?resource:resource.url,location.href);
  if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return originalFetch(resource,options);
  try{const method=options.method||'GET',p=options.body?JSON.parse(options.body):{},d=load(),result=dispatch(d,url.pathname,method,p,url.searchParams);if(method!=='GET')save(d);return new Response(JSON.stringify(result),{status:method==='POST'?201:200,headers:{'Content-Type':'application/json'}})}
  catch(e){return new Response(JSON.stringify({error:e.message}),{status:e.status||400,headers:{'Content-Type':'application/json'}})}
 };
 window.HyperMealDeviceStore={matchFoods(name){return searchFoods(load(),name,5).map(foodRecord)},applyStrava(date,items){day(date);if(!Array.isArray(items)||items.length>12)fail('Invalid activities');const clean=items.map(w=>({id:str(w.id,80),date,name:str(w.name,120),minutes:num(w.minutes,0,600,'minutes'),active_kcal:num(w.active_kcal,0,5000,'calories'),type:str(w.type,40),source:'Strava'}));const d=load();d.workouts=d.workouts.filter(w=>!(w.date===date&&w.source==='Strava'));d.workouts.push(...clean);save(d)}};
 document.addEventListener('DOMContentLoaded',()=>{
  if(window.HYPERMEAL_STANDALONE)return;
  for(const id of ['save-gemini','connect-strava','sync-strava','disconnect-strava','gemini-key','strava-token','instance-token','unlock']){const el=document.getElementById(id);if(el){el.disabled=true;el.title='Available after backend connection'}}
  const cs=document.getElementById('connections-card');if(cs){const p=document.createElement('p');p.className='draft-disclosure';p.innerHTML='<strong>Offline Android draft.</strong> Provider setup is disabled. Your diary and profile stay on this device; no credentials are bundled. CSV imports work now.';cs.prepend(p)}
  const community=document.querySelector('#page-community .notice');if(community)community.textContent='Device-local idea board. Posts and replies stay on this phone; they are not shared with other users. Online community accounts will need the backend.';
  const btn=document.getElementById('download-template');if(btn)btn.textContent='View CSV template';
  document.addEventListener('click',e=>{if(!e.target.closest('#download-template'))return;e.preventDefault();e.stopImmediatePropagation();const dlg=document.createElement('dialog'),title=document.createElement('h3'),area=document.createElement('textarea'),close=document.createElement('button');title.textContent='Daily activity CSV template';area.readOnly=true;area.value='date,active_kcal,steps\n'+document.getElementById('day').value+',300,6500\n';area.setAttribute('aria-label','CSV template to copy');close.textContent='Close';close.onclick=()=>{dlg.close();dlg.remove()};dlg.append(title,area,close);document.body.append(dlg);dlg.showModal();area.select()},true);
 });
})();
