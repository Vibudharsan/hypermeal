"""Send only a general UI brief to Gemini, never source or health records."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parents[1] / 'Primary PS/legal-studio'))
from ai_service import config, provider_request
c = config()
body = {'contents': [{'parts': [{'text': (ROOT/'tools/ui-brief.txt').read_text()}]}], 'generationConfig': {'temperature': 0.5, 'maxOutputTokens': 12000}}
result = provider_request('https://generativelanguage.googleapis.com/v1beta/models/'+c['model']+':generateContent', {'x-goog-api-key':c['gemini'], 'Content-Type':'application/json'}, json.dumps(body).encode(), timeout=110)
candidate = result.get('candidates',[{}])[0]
if candidate.get('finishReason') != 'STOP': raise SystemExit('Generation incomplete; no file written.')
answer = '\n'.join(p.get('text','') for p in candidate.get('content',{}).get('parts',[]) if not p.get('thought')).strip()
if answer.startswith('```'): answer = answer.split('\n',1)[1].rsplit('```',1)[0].strip()
if '<html' not in answer.lower() or '</html>' not in answer.lower(): raise SystemExit('Not a complete HTML document.')
(ROOT/'web/index.html').write_text(answer,encoding='utf-8')
print('Gemini generated dashboard template:',len(answer),'characters; model:',c['model'])
