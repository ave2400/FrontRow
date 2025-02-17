import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import WebcamComponent from "./components/Webcam";
import ClassSchedule from "./components/ClassSchedule";
import Recents from "./components/Recents";
import Navigation from "./components/Navigation";
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<WebcamComponent />} />
          <Route path="/class-schedule" element={<ClassSchedule />} />
          <Route path="/recents" element={<Recents />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
