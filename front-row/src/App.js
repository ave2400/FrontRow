import React from "react";
import WebcamContainer from "./components/WebcamContainer";
import StickyNotes from "./components/StickyNotes";
import "./App.css";

function App() {
  return (
    <div className="App">
      <div className="main-content">
        <WebcamContainer />
        <StickyNotes />
      </div>
    </div>
  );
}

export default App;
