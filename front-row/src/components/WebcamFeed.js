import React, { useRef, useEffect } from "react";
import "./WebcamFeed.css";

const WebcamFeed = ({ zoom, position, filters  }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }
    startWebcam();
  }, []);

  // Apply all filters with default values if not provided
  const {
    contrast = 100,
    brightness = 100,
    grayscale = 0,
    invert = 0
  } = filters;

  return (
    <div 
      className="webcam-feed"
      style={{
        transform: `translate(${position?.x || 0}px, ${position?.y || 0}px)`
      }}
    >
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{ 
          transform: `scale(${zoom})`,
          transformOrigin: 'center',
          filter: `
            contrast(${contrast}%)
            brightness(${brightness}%)
            grayscale(${grayscale}%)
            invert(${invert}%)
          `
        }} 
      />
    </div>
  );
};

export default WebcamFeed;