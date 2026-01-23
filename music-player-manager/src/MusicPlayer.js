import { useEffect, useRef, useState, useCallback } from "react";
import { db, storage } from "./firebase"; // Removed 'auth'
import {
  collection, addDoc, getDocs, orderBy, query,
  deleteDoc, doc, updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const songsRef = collection(db, "songs");

export default function MusicPlayer() {
  const [songs, setSongs] = useState([]);
  const [file, setFile] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const audioRef = useRef(null);

  // --- FETCH ALL SONGS (No User Filter) ---
  useEffect(() => {
    const fetchSongs = async () => {
      const q = query(songsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setSongs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSongs();
  }, []);

  // --- SIMPLIFIED UPLOAD ---
  const uploadSong = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const title = e.target.title.value;
    const artist = e.target.artist.value;

    try {
      // Path no longer uses user.uid
      const fileRef = ref(storage, `public_songs/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file);
      const audioUrl = await getDownloadURL(fileRef);

      const docRef = await addDoc(songsRef, {
        title,
        artist,
        audioUrl,
        createdAt: new Date()
      });

      setSongs([{ id: docRef.id, title, artist, audioUrl }, ...songs]);
      e.target.reset();
      setFile(null);
      alert("Uploaded!");
    } catch (error) {
      console.error(error);
      alert("Upload failed. Check your Firebase Rules!");
    }
  };

  // --- CONTROLS ---
  const togglePlay = useCallback((song) => {
    if (currentSong?.id === song.id) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  }, [currentSong, isPlaying]);

  const deleteSong = async (songId, audioUrl) => {
    if (!window.confirm("Delete?")) return;
    await deleteObject(ref(storage, audioUrl));
    await deleteDoc(doc(db, "songs", songId));
    setSongs(songs.filter(s => s.id !== songId));
  };

  return (
    <div style={styles.container}>
      <div style={styles.glassCard}>
        <h2 style={{ textAlign: 'center' }}>Public Music Player</h2>

        <form onSubmit={uploadSong} style={styles.uploadForm}>
          <input name="title" placeholder="Song Title" style={styles.input} required />
          <input name="artist" placeholder="Artist" style={styles.input} required />
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0])} style={styles.input} required />
          <button style={styles.addButton}>Upload Song</button>
        </form>

        <ul style={styles.list}>
          {songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).map(song => (
            <li key={song.id} style={styles.listItem}>
              <div onClick={() => togglePlay(song)} style={{ flex: 1, cursor: 'pointer' }}>
                {currentSong?.id === song.id && isPlaying ? "⏸ " : "▶ "} {song.title}
              </div>
              <button onClick={() => deleteSong(song.id, song.audioUrl)} style={styles.deleteBtn}>✕</button>
            </li>
          ))}
        </ul>
      </div>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", color: "white", fontFamily: "sans-serif" },
  glassCard: { width: "100%", maxWidth: "400px", background: "rgba(255,255,255,0.05)", padding: "20px", borderRadius: "20px", backdropFilter: "blur(10px)" },
  uploadForm: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" },
  input: { padding: "10px", borderRadius: "8px", border: "none", background: "rgba(255,255,255,0.1)", color: "white" },
  addButton: { padding: "10px", backgroundColor: "#3b82f6", color: "white", borderRadius: "8px", border: "none", cursor: "pointer" },
  list: { listStyle: "none", padding: 0 },
  listItem: { display: "flex", padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  deleteBtn: { background: "none", border: "none", color: "red", cursor: "pointer" }
};