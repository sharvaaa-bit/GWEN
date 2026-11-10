
import React, { useEffect, useRef, useState } from "react";
import {
  AudioLines, Home, Compass, Search, Library, Heart,
  ListMusic, Upload, Play, Pause, SkipBack, SkipForward,
  Volume2, Download, Plus, Disc3, Music2, X, Sparkles
} from "lucide-react";
import "./style.css";

const API='https://gwen-qt1x.onrender.com';

const demo = [
  { id: "demo1", title: "Midnight Bloom", artist: "AERIS", album: "Afterglow" },
  { id: "demo2", title: "Velvet Skies", artist: "Mira Sol", album: "Soft Focus" },
  { id: "demo3", title: "City of Echoes", artist: "Northbound", album: "Neon Hours" }
];

const time = (n = 0) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

function Art({ track }) {
  return (
    <div className="art">
      {track?.cover ? (
        <img src={track.cover} alt="" />
      ) : (
        <AudioLines size={28} />
      )}
    </div>
  );
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [page, setPage] = useState("Home");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("jamendo");
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const audio = useRef(null);

  // Load uploaded music and Jamendo catalogue
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const [uploadedResponse, jamendoResponse] = await Promise.all([
          fetch(`${API}/api/tracks`),
          fetch(`${API}/api/sources/jamendo`)
        ]);

        const uploadedTracks = uploadedResponse.ok
          ? await uploadedResponse.json()
          : [];

        const jamendoTracks = jamendoResponse.ok
          ? await jamendoResponse.json()
          : [];

        setTracks([...jamendoTracks, ...uploadedTracks]);
      } catch (error) {
        console.error("Failed to load music:", error);
        setTracks([]);
      }
    };

    loadTracks();
  }, []);

  useEffect(() => {
    if (!audio.current) return;
    audio.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (current?.audioUrl && audio.current) {
      audio.current.src = current.audioUrl.startsWith("http")
        ? current.audioUrl
        : API + current.audioUrl;

      audio.current.play()
        .then(() => setPlaying(true))
        .catch(error => {
          console.error("Playback failed:", error);
          setPlaying(false);
          setToast("This track could not be played.");
        });
    }
  }, [current]);

  const all = [...tracks, ...demo];

  const visible = all.filter(track =>
    `${track.title} ${track.artist} ${track.album || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  function play(track) {
    if (!track.audioUrl) {
      notify("This is demo artwork, not a playable recording.");
      return;
    }

    setCurrent(track);
  }

  function toggleLike(track) {
    setLiked(old =>
      old.includes(track.id)
        ? old.filter(id => id !== track.id)
        : [...old, track.id]
    );
  }

  async function searchMusic() {
    if (!query.trim()) {
      notify("Enter a song or artist name.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `${API}/api/sources/${source}?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) throw new Error("Catalogue search failed.");

      setResults(await response.json());
      setPage("Discover");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadMusic(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch(
        `${API}/api/upload?title=${encodeURIComponent(file.name)}`,
        { method: "POST", body: form }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Upload failed.");

      setTracks(old => [data, ...old]);
      notify("Music added successfully.");
      setShowUpload(false);
    } catch (error) {
      notify(error.message);
    }

    event.target.value = "";
  }

  function TrackRows({ items }) {
    return (
      <div className="rows">
        {items.map((track, index) => (
          <div className="row" key={track.id}>
            <span>{index + 1}</span>
            <Art track={track} />
            <div className="song">
              <b>{track.title}</b>
              <small>{track.artist}</small>
            </div>
            <button onClick={() => toggleLike(track)}>
              <Heart size={17} fill={liked.includes(track.id) ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setPlaylist(old =>
              old.includes(track.id) ? old : [...old, track.id]
            )}>
              <Plus size={17} />
            </button>
            <button onClick={() => play(track)}>
              <Play size={17} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  function TrackCards({ items }) {
    return (
      <div className="cards">
        {items.map(track => (
          <div className="card" key={track.id}>
            <button onClick={() => play(track)}>
              <Art track={track} />
              <Play size={20} />
            </button>
            <b>{track.title}</b>
            <small>{track.artist}</small>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <AudioLines size={30} />
          <span>GWEN<small>YOUR SOUND. YOUR WORLD.</small></span>
        </div>

        <label>DISCOVER</label>

        {[
          [Home, "Home"],
          [Compass, "Discover"],
          [Search, "Search"]
        ].map(([Icon, name]) => (
          <button key={name} onClick={() => setPage(name)}>
            <Icon size={18} /> {name}
          </button>
        ))}

        <label>YOUR SPACE</label>

        {[
          [Library, "Your Library"],
          [Heart, "Liked Songs"],
          [ListMusic, "Playlists"]
        ].map(([Icon, name]) => (
          <button key={name} onClick={() => setPage(name)}>
            <Icon size={18} /> {name}
          </button>
        ))}

        <button onClick={() => setShowUpload(true)}>
          <Upload size={18} /> Add music
        </button>
      </aside>

      <main>
        <header>
          <div className="search">
            <Search size={18} />
            <input
              placeholder="What do you want to listen to?"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => event.key === "Enter" && searchMusic()}
            />
          </div>

          <button onClick={() => setShowUpload(true)}>
            <Upload size={17} /> Add music
          </button>
        </header>

        <div className="content">
          {page === "Home" && (
            <>
              <section className="hero">
                <label><Sparkles size={16} /> CURATED FOR YOUR MOMENT</label>
                <h1>Feel every <em>frequency.</em></h1>
                <p>A universe of sound, made personal.</p>
                <button onClick={() => setPage("Discover")}>
                  Explore music <Compass size={17} />
                </button>
              </section>

              <section>
                <h2>Made for the moment.</h2>
                <TrackCards items={all.slice(0, 6)} />
              </section>

              <section>
                <h2>Recently added.</h2>
                <TrackRows items={tracks} />
              </section>
            </>
          )}

          {page === "Discover" && (
            <>
              <h1>Discover <em>music.</em></h1>
              <div className="source">
                <select value={source} onChange={event => setSource(event.target.value)}>
                  <option value="jamendo">Jamendo</option>
                  <option value="archive">Internet Archive</option>
                </select>
                <button onClick={searchMusic} disabled={busy}>
                  {busy ? "Searching..." : "Search catalogue"}
                </button>
              </div>
              {results.length > 0 && (
                <>
                  <h2>Catalogue results</h2>
                  <TrackRows items={results} />
                </>
              )}
              <TrackCards items={visible} />
            </>
          )}

          {page === "Search" && <TrackRows items={visible} />}

          {page === "Your Library" && <TrackRows items={tracks} />}

          {page === "Liked Songs" && (
            <TrackRows items={all.filter(track => liked.includes(track.id))} />
          )}

          {page === "Playlists" && (
            <>
              <h1>Your playlist.</h1>
              <TrackRows items={all.filter(track => playlist.includes(track.id))} />
            </>
          )}
        </div>
      </main>

      <footer className="player">
        <div className="now">
          {current ? (
            <>
              <Art track={current} />
              <div>
                <b>{current.title}</b>
                <small>{current.artist}</small>
              </div>
            </>
          ) : (
            <div><Music2 /> Choose your soundtrack</div>
          )}
        </div>

        <div className="controls">
          <div>
            <button onClick={() => {
              if (audio.current) audio.current.currentTime = 0;
            }}>
              <SkipBack />
            </button>

            <button onClick={() => {
              if (!current) {
                setPage("Discover");
                return;
              }

              if (playing) {
                audio.current.pause();
                setPlaying(false);
              } else {
                audio.current.play()
                  .then(() => setPlaying(true))
                  .catch(() => notify("Playback unavailable."));
              }
            }}>
              {playing ? <Pause /> : <Play />}
            </button>

            <button onClick={() => notify("Choose another track to play next.")}>
              <SkipForward />
            </button>
          </div>

          <div className="timeline">
            <span>{time(progress)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={event => {
                const value = Number(event.target.value);
                setProgress(value);
                if (audio.current) audio.current.currentTime = value;
              }}
            />
            <span>{time(duration)}</span>
          </div>
        </div>

        <div className="right">
          <Volume2 size={18} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={event => setVolume(Number(event.target.value))}
          />
        </div>
      </footer>

      <audio
        ref={audio}
        onTimeUpdate={event => setProgress(event.target.currentTime)}
        onLoadedMetadata={event => setDuration(event.target.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      {showUpload && (
        <div className="overlay">
          <div className="modal">
            <button onClick={() => setShowUpload(false)}><X /></button>
            <h2>Add music to GWEN.</h2>
            <p>Upload an audio recording you own or have permission to use.</p>
            <input type="file" accept="audio/*" onChange={uploadMusic} />
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
