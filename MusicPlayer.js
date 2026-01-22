import { useEffect, useState } from "react";
import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  deleteDoc,
  doc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

export default function MusicPlayer() {
  const [songs, setSongs] = useState([]);
  const [file, setFile] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [loading, setLoading] = useState(false);

  const songsRef = collection(db, "songs");

  // Load songs from Firestore
  useEffect(() => {
    const fetchSongs = async () => {
      const q = query(songsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setSongs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSongs();
  }, []);

  // Upload song
  const uploadSong = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);

    const title = e.target.title.value;
    const artist = e.target.artist.value;

    // Upload MP3 to Storage
    const fileRef = ref(storage, `songs/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const audioUrl = await getDownloadURL(fileRef);

    // Save metadata to Firestore
    const docRef = await addDoc(songsRef, {
      title,
      artist,
      audioUrl,
      createdAt: new Date()
    });

    // Update UI immediately
    setSongs([
      { id: docRef.id, title, artist, audioUrl, createdAt: new Date() },
      ...songs
    ]);

    e.target.reset();
    setFile(null);
    setLoading(false);
  };

  // ✅ DELETE SONG (Firestore + Storage)
  const deleteSong = async (song) => {
    const confirmDelete = window.confirm(
      `Delete "${song.title}" by ${song.artist}?`
    );
    if (!confirmDelete) return;

    // Delete from Firestore
    await deleteDoc(doc(db, "songs", song.id));

    // Delete MP3 from Storage
    const fileRef = ref(storage, song.audioUrl);
    await deleteObject(fileRef);

    // Update UI
    setSongs(songs.filter((s) => s.id !== song.id));

    // Stop playback if deleted
    if (currentSong?.id === song.id) {
      setCurrentSong(null);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "auto" }}>
      <h2>🎵 Music Player Manager</h2>

      {/* Upload Form */}
      <form onSubmit={uploadSong}>
        <input name="title" placeholder="Song title" required />
        <input name="artist" placeholder="Artist" required />
        <input
          type="file"
          accept="audio/mp3"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <button disabled={loading}>
          {loading ? "Uploading..." : "Add Song"}
        </button>
      </form>

      <hr />

      {/* Song List */}
      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            <strong>{song.title}</strong> – {song.artist}
            <button onClick={() => setCurrentSong(song)}>▶ Play</button>
            <button onClick={() => deleteSong(song)}>🗑 Delete</button>
          </li>
        ))}
      </ul>

      {/* Audio Player */}
      {currentSong && (
        <div>
          <h3>Now Playing</h3>
          <p>
            {currentSong.title} – {currentSong.artist}
          </p>
          <audio src={currentSong.audioUrl} controls autoPlay />
        </div>
      )}
    </div>
  );
}
