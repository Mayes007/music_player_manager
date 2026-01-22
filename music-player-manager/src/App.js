import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

function App() {

  const addTestData = async () => {
    await addDoc(collection(db, "test"), {
      message: "Hello Firestore!",
      createdAt: new Date()
    });
    alert("Data added to Firestore!");
  };

  const readTestData = async () => {
    const querySnapshot = await getDocs(collection(db, "test"));
    querySnapshot.forEach((doc) => {
      console.log(doc.id, "=>", doc.data());
    });
    alert("Check the console for Firestore data");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔥 Firestore Test</h1>

      <button onClick={addTestData}>
        Add Test Data
      </button>

      <br /><br />

      <button onClick={readTestData}>
        Read Test Data
      </button>
    </div>
  );
}

export default App;
