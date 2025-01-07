import React, { useRef, useEffect, useState } from 'react';

const WebcamFeed = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    startWebcam();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },  // Request HD quality
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      setError("Failed to access webcam. Please ensure you've granted camera permissions.");
      console.error("Error accessing webcam:", err);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-100 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default WebcamFeed;