import React, { useRef, useEffect } from "react";
import "./WebcamFeed.css";

const WebcamFeed = ({ zoom, position, isInverted  }) => {
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
          filter: isInverted ? 'invert(100%)' : 'none'
        }} 
      />
    </div>
  );
};

export default WebcamFeed;