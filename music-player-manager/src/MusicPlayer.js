import { useEffect, useRef, useState, useCallback } from "react";
import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import * as mm from "music-metadata-browser";
import styles from "./MusicPlayer.module.css";

const songsRef = collection(db, "songs");

export default function MusicPlayer() {
  const [songs, setSongs] = useState([]);
  const [file, setFile] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const audioRef = useRef(null);

  // Load songs from Firestore
  useEffect(() => {
    const loadSongs = async () => {
      try {
        const q = query(songsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setSongs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error loading songs:", error);
      }
    };
    loadSongs();
  }, []);

  // Handle audio playback when currentSong changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentSong]);

  const uploadSong = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      const metadata = await mm.parseBlob(file);
      const title = metadata.common.title || file.name.replace(/\.[^/.]+$/, "");
      const artist = metadata.common.artist || "Unknown Artist";

      const filePath = `songs/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, filePath);
      await uploadBytes(fileRef, file);
      const audioUrl = await getDownloadURL(fileRef);

      const docData = { title, artist, audioUrl, filePath, createdAt: new Date() };
      const docRef = await addDoc(songsRef, docData);

      setSongs((prev) => [{ id: docRef.id, ...docData }, ...prev]);
      setFile(null);
      e.target.reset();
    } catch (error) {
      console.error(error);
      alert("Failed to upload song. Check your Firebase Storage Rules!");
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlay = useCallback(
    (song) => {
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
    },
    [currentSong, isPlaying]
  );

  const deleteSong = async (song, e) => {
    e.stopPropagation(); // Prevents playing the song when clicking delete
    if (!window.confirm(`Delete "${song.title}"?`)) return;
    try {
      await deleteObject(ref(storage, song.filePath));
      await deleteDoc(doc(db, "songs", song.id));
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      if (currentSong?.id === song.id) {
        audioRef.current.pause();
        setCurrentSong(null);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🎶 Music Player Manager</h1>
      </header>

      <div className={styles.uploadSection}>
        <form onSubmit={uploadSong} className={styles.uploadForm}>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
            disabled={isUploading}
            required
            className={styles.fileInput}
          />
          <button type="submit" className={styles.button} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload Song"}
          </button>
        </form>
      </div>

      <input
        type="text"
        placeholder="Search your library..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchBar}
      />

      <div className={styles.songList}>
        {songs
          .filter(
            (s) =>
              s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              s.artist.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((song) => (
            <div 
              key={song.id} 
              className={`${styles.songItem} ${currentSong?.id === song.id ? styles.active : ""}`}
              onClick={() => togglePlay(song)}
            >
              <div className={styles.songInfo}>
                <span className={styles.playIcon}>
                  {currentSong?.id === song.id && isPlaying ? "⏸" : "▶"}
                </span>
                <div>
                  <h4 className={styles.songTitle}>{song.title}</h4>
                  <p className={styles.songArtist}>{song.artist}</p>
                </div>
              </div>
              <button onClick={(e) => deleteSong(song, e)} className={styles.deleteBtn}>
                ✕
              </button>
            </div>
          ))}
      </div>

      {/* Persistent Audio Player Bar */}
      {currentSong && (
        <div className={styles.audioControls}>
          <div className={styles.nowPlayingInfo}>
            <strong>{currentSong.title}</strong>
            <span>{currentSong.artist}</span>
          </div>
          <audio 
            ref={audioRef} 
            controls 
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}
    </div>
  );
}