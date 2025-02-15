import React, { useState } from "react";
import WebcamFeed from "./WebcamFeed";
import ZoomControls from "./ZoomControls";
import "./WebcamContainer.css"; // Import CSS

const WebcamContainer = () => {
  const [zoom, setZoom] = useState(1);

  // Function to zoom in
  const zoomIn = () => setZoom((prevZoom) => Math.min(prevZoom + 0.2, 3));

  // Function to zoom out
  const zoomOut = () => setZoom((prevZoom) => Math.max(prevZoom - 0.2, 1));

  return (
    <div className="webcam-container">
      {/* Camera container */}
      <div className="webcam-box">
        {/* Webcam feed */}
        <WebcamFeed zoom={zoom} />

        {/* Zoom controls inside the container */}
        <div className="zoom-controls">
          <ZoomControls zoomIn={zoomIn} zoomOut={zoomOut} />
        </div>
      </div>
    </div>
  );
};

export default WebcamContainer;
