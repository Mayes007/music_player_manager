import { useEffect, useRef, useState, useCallback } from "react";
import { db, storage } from "./firebase"; 
import {
  collection, addDoc, getDocs, orderBy, query,
  deleteDoc, doc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import * as mm from 'music-metadata-browser';
// Add this at the very top of your imports
import styles from './MusicPlayer.module.css';

const songsRef = collection(db, "songs");

export default function MusicPlayer() {
  const [songs, setSongs] = useState([]);
  const [file, setFile] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // New loading state
  const [searchTerm, setSearchTerm] = useState("");

  const audioRef = useRef(null);

  // 1. Fetch songs on mount
  useEffect(() => {
    const fetchSongs = async () => {
      const q = query(songsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setSongs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSongs();
  }, []);

  // 2. Handle Audio Source Changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Playback failed", err));
      }
    }
  }, [currentSong]);

  // --- AUTOMATED UPLOAD ---
  const uploadSong = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file first!");

    setIsUploading(true);

    try {
      // Extract Metadata automatically
      const metadata = await mm.parseBlob(file);
      const title = metadata.common.title || file.name.replace(/\.[^/.]+$/, "");
      const artist = metadata.common.artist || "Unknown Artist";

      // Upload file to Firebase Storage
      const fileRef = ref(storage, `public_songs/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file);
      const audioUrl = await getDownloadURL(fileRef);

      // Save to Firestore
      const docData = {
        title,
        artist,
        audioUrl,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(songsRef, docData);

      // Update local UI
      setSongs([{ id: docRef.id, ...docData }, ...songs]);
      setFile(null);
      e.target.reset();
      alert(`Success! Added "${title}" by ${artist}`);
    } catch (error) {
      console.error(error);
      alert("Error processing file or uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlay = useCallback((song) => {
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  }, [currentSong, isPlaying]);

  const deleteSong = async (songId, audioUrl) => {
    if (!window.confirm("Delete this song?")) return;
    try {
      await deleteObject(ref(storage, audioUrl));
      await deleteDoc(doc(db, "songs", songId));
      setSongs(songs.filter(s => s.id !== songId));
      if (currentSong?.id === songId) {
        audioRef.current.pause();
        setCurrentSong(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glassCard}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>🎶 My Library</h2>
        
        <form onSubmit={uploadSong} style={styles.uploadForm}>
          <label style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
            Metadata (Artist/Title) is detected automatically
          </label>
          <input 
            type="file" 
            accept="audio/*" 
            onChange={(e) => setFile(e.target.files[0])} 
            style={styles.input} 
            disabled={isUploading}
            required 
          />
          <button 
            type="submit" 
            style={{...styles.addButton, opacity: isUploading ? 0.5 : 1}} 
            disabled={isUploading}
          >
            {isUploading ? "Processing..." : "Upload Song"}
          </button>
        </form>

        <div style={{ marginBottom: '15px' }}>
            <input 
                placeholder="Search your library..." 
                style={styles.input} 
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <ul style={styles.list}>
          {songs
            .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.artist.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(song => (
            <li key={song.id} style={styles.listItem}>
              <div onClick={() => togglePlay(song)} style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ fontWeight: 'bold' }}>
                    {currentSong?.id === song.id && isPlaying ? "⏸ " : "▶ "} {song.title}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{song.artist}</div>
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