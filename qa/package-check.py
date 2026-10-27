from pathlib import Path
from html.parser import HTMLParser
import re,json,subprocess
root=Path(__file__).resolve().parents[1]/'dist'
class Parser(HTMLParser):
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  assert tag not in ['iframe','object','base'],tag
  assert not any(k.lower().startswith('on') for k in a),a
  if tag=='script':
   assert a.get('src') and a.get('type')!='module',a
  for key in ['src','href']:
   if key in a:
    value=a[key];assert not value.startswith(('http:','https:','//','/','data:','blob:')),value
    assert (root/value).is_file(),value
p=Parser();p.feed((root/'index.html').read_text())
assert len(list(root.rglob('*.html')))==1
allowed={'.html','.css','.js','.jpg','.png','.jpeg','.gif','.webp','.svg','.woff','.woff2','.json'}
for f in root.rglob('*'):
 if f.is_file():assert f.suffix in allowed and f.name!='.DS_Store',f
for f in root.rglob('*.js'):
 s=f.read_text()
 for pattern in [r'\bfetch\s*\(',r'XMLHttpRequest',r'\b(?:eval|import)\s*\(',r'new\s+(?:Function|Worker|SharedWorker|WebSocket|EventSource|RTCPeerConnection)',r'WebAssembly',r'navigator\.(?:clipboard|geolocation|serviceWorker|bluetooth|usb|hid|serial)',r'window\.(?:open|prompt)\s*\(',r'\?\.',r'\?\?',r'\.replaceAll\(',r'\.at\(']:
  assert not re.search(pattern,s),str(f)+': '+pattern
 subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
css=(root/'assets/style.css').read_text()
assert not re.search(r'(?<![\w-])(?:gap|row-gap|column-gap)\s*:',css)
assert not re.search(r'#[0-9a-fA-F]{4}(?![0-9a-fA-F])|#[0-9a-fA-F]{8}(?![0-9a-fA-F])',css)
for url in re.findall(r'url\([\'\"]?([^\)\'\"]+)',css):assert (root/'assets'/url).is_file(),url
print('PASS: root entry, allowed files, local assets, classic external scripts, prohibited API scan, JS syntax, CSS gap and alpha-color baseline.')
