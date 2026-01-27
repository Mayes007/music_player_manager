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
      const q = query(songsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setSongs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadSongs();
  }, []);

  // Handle audio playback when currentSong changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.audioUrl;
      if (isPlaying) audioRef.current.play().catch(console.error);
    }
  }, [currentSong]);

  // Upload song to Firebase Storage and Firestore
  const uploadSong = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      // Extract metadata
      const metadata = await mm.parseBlob(file);
      const title = metadata.common.title || file.name.replace(/\.[^/.]+$/, "");
      const artist = metadata.common.artist || "Unknown Artist";

      // Upload to Firebase Storage
      const filePath = `songs/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, filePath);
      await uploadBytes(fileRef, file);
      const audioUrl = await getDownloadURL(fileRef);

      // Save to Firestore
      const docData = { title, artist, audioUrl, filePath, createdAt: new Date() };
      const docRef = await addDoc(songsRef, docData);

      // Update UI
      setSongs((prev) => [{ id: docRef.id, ...docData }, ...prev]);
      setFile(null);
      e.target.reset();
    } catch (error) {
      console.error(error);
      alert("Failed to upload song.");
    } finally {
      setIsUploading(false);
    }
  };

  // Play or pause a song
  const togglePlay = useCallback(
    (song) => {
      if (currentSong?.id === song.id) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
      } else {
        setCurrentSong(song);
        setIsPlaying(true);
      }
    },
    [currentSong, isPlaying]
  );

  // Delete song
  const deleteSong = async (song) => {
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
      <h1>🎶 Music Player Manager</h1>

      <form onSubmit={uploadSong} className={styles.uploadForm}>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files[0])}
          disabled={isUploading}
          required
        />
        <button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <input
        type="text"
        placeholder="Search your library..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />

      <ul className={styles.list}>
        {songs
          .filter(
            (s) =>
              s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              s.artist.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((song) => (
            <li key={song.id} className={styles.listItem}>
              <div onClick={() => togglePlay(song)} className={styles.songInfo}>
                <strong>
                  {currentSong?.id === song.id && isPlaying ? "⏸ " : "▶ "} {song.title}
                </strong>
                <span className={styles.artist}>{song.artist}</span>
              </div>
              <button onClick={() => deleteSong(song)} className={styles.deleteBtn}>
                ✕
              </button>
            </li>
          ))}
      </ul>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
