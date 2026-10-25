"""Build a signed draft APK with the installed SDK/JDK; no dependency installation."""
from pathlib import Path
import os,subprocess,zipfile,json,hashlib
ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parent
SDK=Path(os.getenv('ANDROID_HOME') or Path(os.getenv('LOCALAPPDATA',''))/'Android/Sdk')
JAVA=Path(os.getenv('JAVA_HOME',r'C:\Program Files\Android\Android Studio\jbr'))
TOOLS=SDK/'build-tools/36.0.0'
PLATFORM=SDK/'platforms/android-36/android.jar'
BUILD=ROOT/'build'
ASSETS=BUILD/'assets'
CLASSES=BUILD/'classes'
DEX=BUILD/'dex'
OUT=PROJECT/'releases'
for directory in [BUILD,ASSETS,CLASSES,DEX,OUT]:directory.mkdir(parents=True,exist_ok=True)
environment={**os.environ,'JAVA_HOME':str(JAVA),'PATH':str(JAVA/'bin')+os.pathsep+os.environ.get('PATH','')}
def run(*args):subprocess.run([str(a) for a in args],check=True,env=environment,cwd=ROOT)
for name in ['index.html','app.js','style.css','theme.css','theme.js']:
 text=(PROJECT/'web'/name).read_text(encoding='utf-8-sig')
 if name=='index.html':text=text.replace('<script src="/theme.js">','<script src="/offline.js"></script><script src="/online.js"></script><script src="/theme.js">')
 if name=='app.js':text=text.replace('<a href="/docs">API explorer ↗</a>','<span>HyperMeal · phone edition</span>')
 (ASSETS/name).write_text(text,encoding='utf-8')
(ASSETS/'online.js').write_text((ROOT/'online.js').read_text(encoding='utf-8'),encoding='utf-8')
catalog=json.loads((PROJECT/'data/foods.json').read_text())
(ASSETS/'offline.js').write_text((ROOT/'offline.js').read_text(encoding='utf-8').replace('__FOOD_CATALOG__',json.dumps(catalog)),encoding='utf-8')
run(TOOLS/'aapt2.exe','compile','--dir',ROOT/'app/src/main/res','-o',BUILD/'resources.zip')
run(TOOLS/'aapt2.exe','link','-o',BUILD/'resources.apk','-I',PLATFORM,'--manifest',ROOT/'app/src/main/AndroidManifest.xml','-A',ASSETS,BUILD/'resources.zip','--auto-add-overlay')
run(JAVA/'bin/javac.exe','-encoding','UTF-8','-source','8','-target','8','-classpath',PLATFORM,'-d',CLASSES,*list((ROOT/'app/src/main/java').rglob('*.java')))
run(JAVA/'bin/jar.exe','cf',BUILD/'classes.jar','-C',CLASSES,'.')
run(TOOLS/'d8.bat','--lib',PLATFORM,'--min-api','26','--output',DEX,BUILD/'classes.jar')
with zipfile.ZipFile(BUILD/'resources.apk') as src,zipfile.ZipFile(BUILD/'unsigned.apk','w',zipfile.ZIP_DEFLATED) as dst:
 for entry in src.infolist():dst.writestr(entry,src.read(entry.filename))
 dst.write(DEX/'classes.dex','classes.dex')
run(TOOLS/'zipalign.exe','-f','-p','4',BUILD/'unsigned.apk',BUILD/'aligned.apk')
key=ROOT/'draft-signing.jks'
if not key.exists():
 run(JAVA/'bin/keytool.exe','-genkeypair','-keystore',key,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=HyperMeal Local Draft,O=HyperMeal,C=IN')
apk=OUT/'HyperMeal.apk'
run(TOOLS/'apksigner.bat','sign','--ks',key,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',apk,BUILD/'aligned.apk')
run(TOOLS/'apksigner.bat','verify','--verbose',apk)
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(OUT/'SHA256.txt').write_text(digest+'  '+apk.name+'\n')
print('Built:',apk,'bytes:',apk.stat().st_size,'SHA256:',digest)
