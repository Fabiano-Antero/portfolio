"""Local studio preview. Online signaling requires the deployed Worker in config.js."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import threading, webbrowser
folder = Path(__file__).resolve().parent
# Match the production /ai_apre/ URL without touching another project's files.
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith('/ai_apre/'):
            self.send_error(404); return
        if any(x.startswith('.') or x in {'backend', 'tests'} for x in self.path.split('/')):
            self.send_error(404); return
        super().do_GET()
try:
    server = ThreadingHTTPServer(('127.0.0.1', 8788), partial(Handler, directory=str(folder.parent)))
except OSError:
    raise SystemExit('A porta 8788 está ocupada. Encerre a outra cópia antes de iniciar.')
url='http://localhost:8788/ai_apre/'
print('Estúdio:',url,'\nCtrl+C para encerrar.\nA transmissão remota exige backend configurado em config.js.')
threading.Timer(.7,lambda:webbrowser.open(url)).start()
try: server.serve_forever()
except KeyboardInterrupt: pass
finally: server.server_close()
