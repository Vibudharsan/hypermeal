"""Temporary LAN download of the APK only; no source or credential access."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket
import threading
APK=Path(__file__).resolve().parents[1]/'releases/HyperMeal.apk'
PORT=4184
PAGE=b'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>HyperMeal</title><body style="font-family:sans-serif;padding:24px;max-width:480px;margin:auto"><h1>HyperMeal for Android</h1><p><a href="/hypermeal.apk" style="display:inline-block;padding:14px 22px;background:#333;color:#fff;border-radius:10px;text-decoration:none">Download HyperMeal.apk</a></p><p>After downloading, open the file and allow installation from this browser if Android asks. The app keeps all its data on your phone.</p></body>'
class Download(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path=='/':
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(PAGE)));self.end_headers();self.wfile.write(PAGE);return
  if self.path!='/hypermeal.apk':
   self.send_error(404);return
  data=APK.read_bytes()
  self.send_response(200)
  self.send_header('Content-Type','application/vnd.android.package-archive')
  self.send_header('Content-Disposition','attachment; filename="HyperMeal.apk"')
  self.send_header('Content-Length',str(len(data)))
  self.send_header('Cache-Control','no-store')
  self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
def lan_address():
 # Picks the network interface used for outgoing traffic; no packet is sent.
 with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as probe:
  try:probe.connect(('192.0.2.1',9));return probe.getsockname()[0]
  except OSError:return socket.gethostbyname(socket.gethostname())
if __name__=='__main__':
 if not APK.exists():raise SystemExit('Build the APK first: python android/build_apk.py')
 server=ThreadingHTTPServer(('0.0.0.0',PORT),Download)
 timer=threading.Timer(7200,server.shutdown);timer.daemon=True;timer.start()
 print(f'On your phone (same Wi-Fi), open:  http://{lan_address()}:{PORT}/',flush=True)
 print('The download link stays available for two hours. Close this window to stop it.',flush=True)
 try:server.serve_forever()
 finally:server.server_close()
