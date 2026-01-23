import { useEffect, useRef, useState } from "react";
import { db, storage, auth } from "./firebase";
import {
  collection, addDoc, getDocs, orderBy, query,
  deleteDoc, doc, updateDoc, where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";

// Define outside to prevent re-render cycles
const songsRef = collection(db, "songs");

export default function MusicPlayer() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [songs, setSongs] = useState([]);
  const [file, setFile] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const audioRef = useRef(null);

  // --- AUTH LOGIC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user) {
      setSongs([]);
      return;
    }
    const fetchSongs = async () => {
      const q = query(songsRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setSongs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSongs();
  }, [user]);

  // --- MUSIC CONTROLS ---
  const togglePlay = (song) => {
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const playNextSong = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong?.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.audioUrl;
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  }, [currentSong, isPlaying]);

  // --- ACTIONS ---
  const uploadSong = async (e) => {
    e.preventDefault();
    if (!file || !user) return;
    const title = e.target.title.value;
    const artist = e.target.artist.value;
    const fileRef = ref(storage, `songs/${user.uid}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const audioUrl = await getDownloadURL(fileRef);

    const docRef = await addDoc(songsRef, {
      title, artist, audioUrl, userId: user.uid, isFavorite: false, createdAt: new Date()
    });

    setSongs([{ id: docRef.id, title, artist, audioUrl, isFavorite: false }, ...songs]);
    e.target.reset();
    setFile(null);
  };

  const deleteSong = async (songId, audioUrl) => {
    if (!window.confirm("Delete this song?")) return;
    await deleteObject(ref(storage, audioUrl));
    await deleteDoc(doc(db, "songs", songId));
    setSongs(songs.filter(s => s.id !== songId));
    if (currentSong?.id === songId) setIsPlaying(false);
  };

  const toggleFavorite = async (song) => {
    const newStatus = !song.isFavorite;
    await updateDoc(doc(db, "songs", song.id), { isFavorite: newStatus });
    setSongs(songs.map(s => s.id === song.id ? { ...s, isFavorite: newStatus } : s));
  };

  // --- UTILS ---
  const formatTime = (t) => {
    if (!t) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const filteredSongs = songs.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.artist.toLowerCase().includes(searchTerm.toLowerCase());
    return showFavoritesOnly ? (matchesSearch && s.isFavorite) : matchesSearch;
  });

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(currentSong || songs[0]); }
      if (e.code === "KeyN") playNextSong();
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [currentSong, songs, isPlaying]);

  // --- UI ---
  if (!user) return (
    <div style={styles.container}>
      <div style={styles.glassCard}>
        <h2 style={styles.title}>Music Cloud</h2>
        <button onClick={login} style={styles.addButton}>Sign in with Google</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.glassCard}>
        <div style={styles.header}>
          <span>Hi, {user.displayName}</span>
          <button onClick={logout} style={styles.logoutBtn}>Sign Out</button>
        </div>

        <form onSubmit={uploadSong} style={styles.uploadForm}>
          <input name="title" placeholder="Song Title" style={styles.input} required />
          <input name="artist" placeholder="Artist" style={styles.input} required />
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0])} style={styles.input} required />
          <button style={styles.addButton}>Upload Song</button>
        </form>

        {currentSong && (
          <div style={styles.nowPlaying}>
            <h4>{currentSong.title}</h4>
            <input type="range" value={progress} onChange={(e) => {
              const time = (e.target.value / 100) * duration;
              audioRef.current.currentTime = time;
            }} style={styles.progressBar} />
            <div style={styles.timeInfo}>
              <span>{formatTime(audioRef.current?.currentTime)}</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => {
                setVolume(e.target.value);
                audioRef.current.volume = e.target.value;
              }} style={{width: '60px'}} />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        <div style={styles.controls}>
          <input placeholder="Search library..." style={styles.input} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} style={styles.favToggle}>
            {showFavoritesOnly ? "❤️ Favorites" : "🤍 All"}
          </button>
        </div>

        <ul style={styles.list}>
          {filteredSongs.map(song => (
            <li key={song.id} style={styles.listItem}>
              <div onClick={() => togglePlay(song)} style={{flex: 1, cursor: 'pointer'}}>
                {currentSong?.id === song.id && isPlaying ? "⏸ " : "▶ "} 
                <strong>{song.title}</strong>
              </div>
              <span onClick={() => toggleFavorite(song)} style={{cursor: 'pointer', marginRight: '10px'}}>
                {song.isFavorite ? "❤️" : "🤍"}
              </span>
              <button onClick={() => deleteSong(song.id, song.audioUrl)} style={styles.deleteBtn}>✕</button>
            </li>
          ))}
        </ul>
      </div>
      <audio ref={audioRef} onEnded={playNextSong} onTimeUpdate={() => setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)} onLoadedMetadata={(e) => setDuration(e.target.duration)} />
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", color: "white", fontFamily: "sans-serif" },
  glassCard: { width: "100%", maxWidth: "400px", background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "20px", backdropFilter: "blur(10px)" },
  header: { display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "12px" },
  uploadForm: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" },
  input: { padding: "10px", borderRadius: "8px", border: "none", background: "rgba(255,255,255,0.1)", color: "white" },
  addButton: { padding: "10px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  nowPlaying: { textAlign: "center", background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "10px" },
  progressBar: { width: "100%", accentColor: "#3b82f6" },
  timeInfo: { display: "flex", justifyContent: "space-between", fontSize: "10px" },
  controls: { display: "flex", gap: "10px", margin: "15px 0" },
  favToggle: { background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "8px", cursor: "pointer" },
  list: { listStyle: "none", padding: 0 },
  listItem: { display: "flex", alignItems: "center", padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  deleteBtn: { background: "none", border: "none", color: "red", cursor: "pointer" },
  logoutBtn: { background: "none", border: "none", color: "#3b82f6", cursor: "pointer" }
};