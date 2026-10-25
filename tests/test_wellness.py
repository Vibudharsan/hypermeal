import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server as s
import wellness as w

class WellnessTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.db=patch.object(s,'DB',Path(self.temp.name)/'db.sqlite3');self.db.start()
        self.secret=patch.object(w,'SECRETS',Path(self.temp.name)/'keys.json');self.secret.start()
        self.p={'name':'Test person','age':25,'height_cm':175,'weight_kg':70,'calorie_goal':2200,
                'baseline_kcal':2000,'activity_goal':30,'water_goal':2000,'protein_goal':80,'goal':'maintain','date':'2026-08-01'}
    def tearDown(self):
        self.db.stop();self.secret.stop();self.temp.cleanup()
    def test_profile_bmi_and_history(self):
        w.save_profile(self.p)
        self.assertAlmostEqual(w.progress('2026-08-01')['bmi'],22.9)
        w.dispatch('POST','/api/weights',{}, {'date':'2026-09-01','weight_kg':72})
        self.assertEqual(w.progress('2026-09-01')['current_weight'],72)
        self.assertEqual(len(w.records('weight')),2)
        with self.assertRaises(s.ApiError):w.save_profile({**self.p,'age':16})
    def test_habits_and_fitness_no_double_count(self):
        w.save_profile(self.p)
        w.put('workout',w.workout({'date':'2026-08-01','name':'Walk','minutes':30,'active_kcal':120}))
        w.put('habit',{'id':'2026-08-01','date':'2026-08-01','water_ml':2000,'complete':True})
        w.import_fitness({'csv':'date,active_kcal,steps\n2026-08-01,400,8000'})
        d=w.daily('2026-08-01')
        self.assertEqual(d['active_kcal'],400)
        self.assertEqual(d['total_burn'],2400)
        self.assertEqual(d['score'],100)
        w.remove('fitness','2026-08-01')
        self.assertEqual(w.daily('2026-08-01')['active_kcal'],120)
    def test_import_atomic_and_idempotent(self):
        raw='date,active_kcal,steps\n2026-08-01,300,5000'
        w.import_fitness({'csv':raw});w.import_fitness({'csv':raw})
        self.assertEqual(len(w.records('fitness')),1)
        for bad in [raw+'\n2026-08-02,-10,100',raw+'\n2026-08-01,500,1000','date,active_kcal,steps\n2026-08-01,nan,5']:
            with self.assertRaises(s.ApiError):w.import_fitness({'csv':bad})
        self.assertEqual(len(w.records('fitness')),1)
    def populate_days(self,month):
        for day in range(1,8):
            stamp=f'2026-{month:02}-{day:02}'
            s.route('POST','/api/meals',{}, {'date':stamp,'title':'Complete sample day','confirmed':True,
                'items':[{'name':'Sample','grams':1000,'per_100g':{'kcal':200,'protein':8,'carbs':30,'fat':5}}]})
            w.put('habit',{'id':stamp,'date':stamp,'water_ml':1000,'complete':True})
    def test_forecast_gate_frozen_error_and_learning(self):
        w.save_profile(self.p)
        with self.assertRaises(s.ApiError):w.forecast('2026-08-01')
        self.populate_days(8)
        w.put('weight',{'id':'2026-08-08','date':'2026-08-08','weight_kg':70})
        first=w.forecast('2026-08-08')
        self.assertEqual(first['predicted_kg'],70)
        self.assertEqual(first['complete_days'],7)
        with self.assertRaises(s.ApiError):w.forecast('2026-08-08')
        w.put('weight',{'id':first['target_date'],'date':first['target_date'],'weight_kg':71})
        feedback=w.progress('2026-09-08')['forecasts'][0]
        self.assertEqual(feedback['predicted_kg'],70)
        self.assertEqual(feedback['absolute_percentage_error'],round(1/71*100,3))
        self.populate_days(9)
        w.put('weight',{'id':'2026-09-08','date':'2026-09-08','weight_kg':71})
        second=w.forecast('2026-09-08')
        self.assertGreater(second['correction_kg_per_day'],0)
        self.assertEqual(second['calibration_count'],1)
        self.assertEqual(w.profile()['calorie_goal'],2200)
    def test_no_future_reading_leakage(self):
        w.save_profile(self.p)
        w.put('forecast',{'id':'f','date':'2026-08-01','target_date':'2026-08-31','predicted_kg':70})
        w.put('weight',{'id':'2026-09-01','date':'2026-09-01','weight_kg':71})
        self.assertNotIn('actual_kg',w.progress('2026-08-30')['forecasts'][0])
    def test_strava_repeat_sync_missing_calories(self):
        w.save_secret('strava','fake-token')
        activities=[{'id':1,'start_date_local':'2026-08-01T10:00:00'},{'id':2,'start_date_local':'2026-08-01T15:00:00'}]
        def upstream(path,token):
            if path.startswith('athlete/activities'):return activities
            if path=='activities/1':return {'name':'Ride','moving_time':1800,'calories':250,'sport_type':'Ride'}
            return {'name':'Walk','moving_time':1200}
        with patch.object(w,'strava_call',side_effect=upstream):
            a=w.sync_strava('2026-08-01');w.sync_strava('2026-08-01')
        self.assertEqual(a['synced'],1);self.assertEqual(a['missing_calories_skipped'],1)
        self.assertEqual(len(w.records('workout')),1)
        self.assertNotIn('fake-token',json.dumps(w.dispatch('GET','/api/connections',{},{})))
    def test_community_persistence_reply_and_removal(self):
        _,p=w.dispatch('POST','/api/community',{}, {'author':'Test','topic':'Meal ideas','body':'Lentils and vegetables'})
        w.dispatch('POST','/api/community/'+p['id'],{}, {'author':'Reader','body':'Nice idea'})
        self.assertEqual(len(w.dispatch('GET','/api/community',{}, {})[1]['posts'][0]['replies']),1)
        w.dispatch('DELETE','/api/community/'+p['id'],{}, {})
        self.assertEqual(w.records('post'),[])
    def test_coach_consent_and_context(self):
        with self.assertRaises(s.ApiError):w.coach({'allow_cloud':False})
        with patch.object(w,'settings',return_value={'gemini':'fake-key'}),patch.object(s,'remote_json',return_value={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':'Try adding vegetables.'}]}}]}) as call:
            result=w.coach({'allow_cloud':True,'date':'2026-08-01','message':'Lunch ideas?'})
            self.assertEqual(result['answer'],'Try adding vegetables.')
            context=json.loads(call.call_args.args[1]['contents'][0]['parts'][0]['text'])
            self.assertNotIn('profile',context)

if __name__=='__main__':unittest.main()
