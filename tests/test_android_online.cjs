const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const store=new Map(),calls=[];
const app={URL,Response,crypto:webcrypto,setTimeout,clearTimeout,console,location:{href:'https://appassets.androidplatform.net/',origin:'https://appassets.androidplatform.net'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{addEventListener:()=>{}}};
app.window=app;app.fetch=()=>{throw Error('Unexpected network')};
let failSync=false;
app.HyperMealNative={call(id,method,route,raw){const body=JSON.parse(raw);calls.push({method,route,body});let data={gemini_configured:true,strava_connected:true},status=200;if(route==='/api/coach')data={answer:'Example education'};if(route.endsWith('/sync')){status=failSync?400:200;data=failSync?{error:'Expired token'}:{workouts:[{id:'strava-4',name:'Walk',minutes:25,active_kcal:110,type:'Walk'}],synced:1,missing_calories_skipped:0}}queueMicrotask(()=>app.HyperMealNativeResult(id,status,JSON.stringify(data)))}};
vm.createContext(app);
for(const f of ['offline','online'])vm.runInContext(readFileSync('android/build/assets/'+f+'.js','utf8'),app);
async function req(path,method='GET',body){const r=await app.fetch(path,{method,body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
(async()=>{
 assert.equal(app.HYPERMEAL_OFFLINE,false);assert.equal(app.HYPERMEAL_STANDALONE,true);
 assert.equal((await req('/api/connections')).data.gemini_configured,true);
 await req('/api/coach','POST',{message:'Breakfast ideas',date:'2026-10-25',allow_cloud:true});
 const sent=calls.at(-1).body;assert.deepEqual(Object.keys(sent.context).sort(),['complete_day','logged_meals','meal_totals']);assert.equal(sent.context.complete_day,false);
 await req('/api/fitness/strava/sync','POST',{date:'2026-10-25'});await req('/api/fitness/strava/sync','POST',{date:'2026-10-25'});
 let d=(await req('/api/dashboard?date=2026-10-25')).data;assert.equal(d.workouts.length,1);assert.equal(d.active_kcal,110);
 failSync=true;assert.equal((await req('/api/fitness/strava/sync','POST',{date:'2026-10-25'})).status,400);assert.equal((await req('/api/dashboard?date=2026-10-25')).data.active_kcal,110);
 assert.throws(()=>app.HyperMealDeviceStore.applyStrava('2026-10-25',[{id:'bad',name:'Walk',minutes:1,active_kcal:-1,type:'Walk'}]));assert.equal((await req('/api/dashboard?date=2026-10-25')).data.active_kcal,110);
 console.log('Standalone bridge tests passed: routing, minimal AI context, sync deduplication, provider errors and atomic validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
