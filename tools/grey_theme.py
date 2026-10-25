"""Convert all original interface colors to neutral greys, retaining alpha."""
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def grey(match):
    value=match.group()[1:]
    if len(value) in (3,4): value=''.join(c*2 for c in value)
    rgb=[int(value[i:i+2],16) for i in (0,2,4)]
    level=round(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])
    return '#'+f'{level:02x}'*3+value[6:]
for name in ['style.css','app.js','index.html','../docs.html']:
    path=root/name
    source=path.read_text(encoding='utf-8-sig')
    pattern=r'#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?(?![a-zA-Z0-9_-])'
    source=re.sub(pattern,grey,source)
    if name=='style.css':
        source=re.sub(r'#[0-9a-fA-F]{3,4}(?![a-zA-Z0-9_-])',grey,source)
        source=source.replace('--green','--accent')
    path.write_text(source,encoding='utf-8')
