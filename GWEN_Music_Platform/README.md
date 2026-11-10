# GWEN — Music Discovery & Streaming Platform

A runnable full-stack starter with a premium React music interface and FastAPI backend.

## Included
- Responsive React UI: home, discover, search, library, liked songs, playlists.
- Audio player with play/pause, seek, volume, track selection.
- Upload your own licensed MP3/WAV/OGG/M4A/FLAC/AAC/OPUS tracks (50 MB limit).
- Stream and download local tracks; create a ZIP of selected local tracks.
- Internet Archive audio metadata discovery (rights vary; the app links to the source and does not automatically redistribute external recordings).
- Optional Jamendo API integration when you supply a Jamendo client ID.
- SQLite local catalogue.

## Rights and catalogue limitations
This does not include Spotify or Amazon Music's commercial catalogue. Their music cannot simply be copied or downloaded. Publicly accessible audio is not automatically free to redistribute. External catalogue results are discovery links; check each recording's licence and provider terms. Local downloads are enabled only for user-uploaded files, and uploaders must own or have permission to distribute them.

## Run on Windows
Requirements: Python 3.10+, Node.js 20+.

Terminal 1:
```powershell
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app:app --reload --port 8000
```

Terminal 2:
```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```
Open http://localhost:5173

## Jamendo (optional)
Obtain your own API client ID from Jamendo's developer portal and put `JAMENDO_CLIENT_ID=...` in `backend/.env`, then restart the backend. Check Jamendo API and per-track licence terms. Jamendo external results are not offered as downloadable local files by this starter.

## Before public deployment
This is a local-development starter, not a production streaming service. Add user authentication, authorization, storage quotas, malware scanning, rate limiting, HTTPS, database migrations, object storage, moderation, copyright complaint/takedown handling, and provider-specific licence compliance. The default CORS origin is local development only. For public scale, migrate SQLite to PostgreSQL and local media storage to private object storage/CDN.
