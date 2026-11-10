import os, uuid, sqlite3, zipfile, io, mimetypes
from pathlib import Path
from urllib.parse import quote
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
ROOT=Path(__file__).resolve().parent; MEDIA=ROOT/'media'; MEDIA.mkdir(exist_ok=True); DB=ROOT/'gwen.db'; load_dotenv(ROOT/'.env')
app=FastAPI(title='GWEN Music API'); app.add_middleware(CORSMiddleware,allow_origins=[os.getenv('FRONTEND_ORIGIN','http://localhost:5173')],allow_methods=['*'],allow_headers=['*'])
def conn():
 c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c
with conn() as c: c.execute('''CREATE TABLE IF NOT EXISTS tracks(id TEXT PRIMARY KEY,title TEXT,artist TEXT,album TEXT,genre TEXT,filename TEXT,cover TEXT DEFAULT '',source TEXT DEFAULT 'local',license TEXT,downloadable INTEGER DEFAULT 1)''')
def pack(r):
 d=dict(r); d['audioUrl']='/api/stream/'+d['id']; d['downloadUrl']='/api/download/'+d['id'] if d['downloadable'] else None; return d
@app.get('/api/health')
def health(): return {'status':'ok','name':'GWEN Music API'}
@app.get('/api/tracks')
def tracks(q:str='',limit:int=100):
 with conn() as c: rows=c.execute('SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? ORDER BY rowid DESC LIMIT ?',('%'+q+'%','%'+q+'%','%'+q+'%',min(limit,300))).fetchall()
 return [pack(r) for r in rows]
@app.post('/api/upload')
async def upload(file:UploadFile=File(...),title:str='',artist:str='You',album:str='Your uploads',genre:str='Independent'):
 ext=Path(file.filename or '').suffix.lower()
 if ext not in {'.mp3','.wav','.ogg','.m4a','.flac','.aac','.opus'}: raise HTTPException(400,'Unsupported audio format')
 data=await file.read()
 if len(data)>50*1024*1024: raise HTTPException(413,'Maximum upload is 50 MB')
 tid=str(uuid.uuid4()); name=tid+ext; (MEDIA/name).write_bytes(data)
 with conn() as c: c.execute('INSERT INTO tracks(id,title,artist,album,genre,filename,license) VALUES(?,?,?,?,?,?,?)',(tid,title.strip() or Path(file.filename).stem,artist,album,genre,name,'Uploader confirms rights to distribute'))
 with conn() as c: return pack(c.execute('SELECT * FROM tracks WHERE id=?',(tid,)).fetchone())
@app.get('/api/stream/{tid}')
def stream(tid:str):
 with conn() as c: r=c.execute('SELECT * FROM tracks WHERE id=?',(tid,)).fetchone()
 if not r or not (MEDIA/r['filename']).exists(): raise HTTPException(404,'Track not found')
 return FileResponse(MEDIA/r['filename'],media_type=mimetypes.guess_type(r['filename'])[0] or 'audio/mpeg')
@app.get('/api/download/{tid}')
def download(tid:str):
 with conn() as c: r=c.execute('SELECT * FROM tracks WHERE id=?',(tid,)).fetchone()
 if not r or not r['downloadable']: raise HTTPException(404,'Download unavailable')
 return FileResponse(MEDIA/r['filename'],filename=r['title']+Path(r['filename']).suffix)
class ZipReq(BaseModel): ids:list[str]
@app.post('/api/playlist-zip')
def playlist_zip(body:ZipReq):
 if not body.ids or len(body.ids)>100: raise HTTPException(400,'Choose 1–100 local tracks')
 mem=io.BytesIO()
 with conn() as c,zipfile.ZipFile(mem,'w',zipfile.ZIP_DEFLATED) as z:
  for tid in body.ids:
   r=c.execute('SELECT * FROM tracks WHERE id=? AND downloadable=1',(tid,)).fetchone()
   if r and (MEDIA/r['filename']).exists(): z.write(MEDIA/r['filename'],r['artist']+' - '+r['title']+Path(r['filename']).suffix)
 mem.seek(0); return StreamingResponse(mem,media_type='application/zip',headers={'Content-Disposition':'attachment; filename=gwen-playlist.zip'})
@app.get('/api/sources/archive')
async def archive(q:str=Query(...,min_length=2),rows:int=12):
 params={'q':f'({q}) AND mediatype:audio','fl[]':['identifier','title','creator','year','licenseurl'],'rows':min(rows,30),'output':'json'}
 async with httpx.AsyncClient(timeout=20) as h: r=await h.get('https://archive.org/advancedsearch.php',params=params); r.raise_for_status(); docs=r.json().get('response',{}).get('docs',[])
 return [{'id':'ia:'+d.get('identifier',''),'title':d.get('title','Untitled'),'artist':d.get('creator','Unknown creator'),'year':d.get('year',''),'license':d.get('licenseurl') or 'Rights unspecified — verify','detailsUrl':'https://archive.org/details/'+quote(d.get('identifier','')),'source':'Internet Archive','downloadable':False,'notice':'Check item rights and file formats before reuse.'} for d in docs if d.get('identifier')]
@app.get('/api/sources/jamendo')
async def jamendo(q:str='',limit:int=20):
 cid=os.getenv('JAMENDO_CLIENT_ID','').strip()
 if not cid: raise HTTPException(503,'Add JAMENDO_CLIENT_ID to backend/.env')
 params={'client_id':cid,'format':'json','limit':min(limit,50),'audioformat':'mp32','include':'licenses'}
 if q: params['search']=q
 async with httpx.AsyncClient(timeout=20) as h: r=await h.get('https://api.jamendo.com/v3.0/tracks/',params=params); r.raise_for_status(); data=r.json()
 return [{'id':'jamendo:'+str(t['id']),'title':t.get('name'),'artist':t.get('artist_name'),'album':t.get('album_name'),'cover':t.get('album_image'),'audioUrl':t.get('audio'),'detailsUrl':t.get('shareurl'),'license':t.get('license_ccurl'),'source':'Jamendo','downloadable':False,'notice':'Playback subject to Jamendo API and track licence terms.'} for t in data.get('results',[])]
