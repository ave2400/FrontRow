import React, { useRef, useEffect } from "react";
import "./WebcamFeed.css";

const WebcamFeed = ({ zoom }) => {
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
    <div className="webcam-feed">
      <video ref={videoRef} autoPlay playsInline style={{ transform: `scale(${zoom})` }} />
    </div>
  );
};

export default WebcamFeed;
