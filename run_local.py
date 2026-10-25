"""Launch with an existing local Gemini key in memory, without copying credentials."""
import json
import os
import runpy
from pathlib import Path

ROOT=Path(__file__).resolve().parent
if not os.getenv('GEMINI_API_KEY') and not (ROOT/'data/settings.private.json').exists():
    existing=ROOT.parents[1]/'Primary PS/legal-studio/data/provider-secrets.json'
    try:
        key=json.loads(existing.read_text(encoding='utf-8-sig')).get('gemini','')
        if key: os.environ['GEMINI_API_KEY']=key
    except (OSError,ValueError):
        pass
runpy.run_path(str(ROOT/'server.py'),run_name='__main__')
