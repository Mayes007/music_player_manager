import { useEffect, useRef, useState } from "react";
import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

export default function MusicPlayer() {
  const [songs, setSongs] = useState([]);
  const [file, setFile] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const songsRef = collection(db, "songs");

  // 🔄 Load all songs
  useEffect(() => {
    const fetchSongs = async () => {
      const q = query(songsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setSongs(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    };
    fetchSongs();
  }, []);

  // ⬆ Upload song
  const uploadSong = async (e) => {
    e.preventDefault();
    if (!file) return;

    const title = e.target.title.value;
    const artist = e.target.artist.value;

    const fileRef = ref(storage, `songs/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const audioUrl = await getDownloadURL(fileRef);

    const docRef = await addDoc(songsRef, {
      title,
      artist,
      audioUrl,
      createdAt: new Date()
    });

    setSongs([
      { id: docRef.id, title, artist, audioUrl },
      ...songs
    ]);

    e.target.reset();
    setFile(null);
  };

  // ▶ Play / Pause
  const togglePlay = (song) => {
    if (currentSong?.id === song.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  // Auto play when song changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.audioUrl;
      audioRef.current.play();
    }
  }, [currentSong]);

  return (
    <div style={{ maxWidth: "600px", margin: "auto" }}>
     

      {/* Upload */}
      <form onSubmit={uploadSong}>
        <input name="title" placeholder="Song Title" required />
        <input name="artist" placeholder="Artist" required />
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <button>Add Song</button>
      </form>

      <hr />

      {/* Song List */}
      <ul>
        {songs.map(song => (
          <li key={song.id} style={{ marginBottom: "10px" }}>
            <strong>{song.title}</strong> – {song.artist}
            <button onClick={() => togglePlay(song)}>
              {currentSong?.id === song.id && isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
          </li>
        ))}
      </ul>

      {/* Hidden global player */}
      <audio ref={audioRef} />
    </div>
  );
}
