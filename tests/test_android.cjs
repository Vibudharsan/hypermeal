const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const path=require('node:path');
const code=readFileSync(path.join(__dirname,'../android/build/assets/offline.js'),'utf8');
const store=new Map();
function boot(){
 const context={URL,Response,crypto:webcrypto,location:{href:'https://appassets.androidplatform.net/',origin:'https://appassets.androidplatform.net'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{addEventListener:()=>{}},console};
 context.window=context;context.fetch=()=>{throw Error('Unexpected network request')};vm.createContext(context);vm.runInContext(code,context);return context;
}
let app=boot();
async function request(route,method='GET',data,expected=200){
 const response=await app.fetch(route,{method,...(data?{body:JSON.stringify(data)}:{})});
 const result=await response.json();assert.equal(response.status,expected,JSON.stringify(result));return result;
}
(async()=>{
 const p={name:'Offline test',date:'2026-08-01',age:25,height_cm:175,weight_kg:70,calorie_goal:2200,baseline_kcal:2000,activity_goal:30,water_goal:2000,protein_goal:80,goal:'maintain'};
 await request('/api/profile','PUT',p);
 assert.equal((await request('/api/progress?date=2026-08-01')).bmi,22.9);
 const meal=await request('/api/meals','POST',{date:'2026-08-01',title:'Lunch',confirmed:true,items:[{food_id:'rice',grams:150}]},201);
 assert.equal(meal.totals.kcal,195);
 app=boot();assert.equal((await request('/api/meals')).meals.length,1);
 await request('/api/estimate','POST',{items:[{food_id:'rice',grams:-5}]},422);
 await request('/api/workouts','POST',{date:'2026-08-01',name:'Walk',minutes:30,active_kcal:100},201);
 await request('/api/fitness/import','POST',{csv:'date,active_kcal,steps\n2026-08-01,400,8000'},201);
 assert.equal((await request('/api/dashboard?date=2026-08-01')).active_kcal,400);
 await request('/api/fitness/import','POST',{csv:'date,active_kcal,steps\n2026-08-01,999,1\n2026-08-02,-1,2'},422);
 assert.equal((await request('/api/dashboard?date=2026-08-01')).active_kcal,400);
 await request('/api/fitness/days/2026-08-01','DELETE');
 assert.equal((await request('/api/dashboard?date=2026-08-01')).active_kcal,100);
 await request('/api/forecasts','POST',{date:'2026-08-01'},422);
 for(let i=1;i<=7;i++){
  const date='2026-08-0'+i;
  await request('/api/habits','PUT',{date,water_ml:1000,complete:true});
  await request('/api/meals','POST',{date,title:'Day',confirmed:true,items:[{name:'Sample',grams:1000,per_100g:{kcal:200,protein:8,carbs:30,fat:5}}]},201);
 }
 await request('/api/weights','POST',{date:'2026-08-08',weight_kg:70},201);
 const f=await request('/api/forecasts','POST',{date:'2026-08-08'},201);
 await request('/api/forecasts','POST',{date:'2026-08-08'},409);
 await request('/api/weights','POST',{date:f.target_date,weight_kg:71},201);
 const progress=await request('/api/progress?date='+f.target_date);
 assert.equal(progress.forecasts[0].predicted_kg,f.predicted_kg);
 assert.ok(progress.forecasts[0].absolute_percentage_error>0);
 const post=await request('/api/community','POST',{author:'Test',topic:'Meal ideas',body:'Example'},201);
 await request('/api/community/'+post.id,'POST',{author:'Other',body:'Reply'},201);
 assert.equal((await request('/api/community')).posts[0].replies.length,1);
 await request('/api/coach','POST',{allow_cloud:true,date:'2026-08-01',message:'Hello'},503);
 assert.equal((await request('/api/connections')).offline,true);
 await request('/api/meals/'+meal.id,'DELETE');
 console.log('Android offline checks passed: profile/BMI, meal math, persisted reload, validation, fitness deduplication, atomic imports, forecast gate/error, community, and explicit offline provider behavior.');
})().catch(e=>{console.error(e);process.exit(1)});
