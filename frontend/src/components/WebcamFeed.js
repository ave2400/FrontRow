import React, { useRef, useEffect, useState, useCallback } from "react";
import "./WebcamFeed.css";

const WebcamFeed = ({ zoom, position, filters, videoRef }) => {
  const internalVideoRef = useRef(null);
  const finalVideoRef = videoRef || internalVideoRef;
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState("");

  // Define startWebcam outside useEffect so it can be called from elsewhere
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (finalVideoRef.current && !isStreaming) {
        finalVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  }, [finalVideoRef, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      startWebcam();
    }
    
    // Cleanup function to stop tracks when component unmounts
    return () => {
      if (finalVideoRef.current && finalVideoRef.current.srcObject) {
        const tracks = finalVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isStreaming, startWebcam]);

  const {
    contrast = 100,
    brightness = 100,
    grayscale = 0,
    invert = 0
  } = filters;

  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
    if (isStreaming && finalVideoRef.current) {
      // If turning off streaming, restart webcam
      startWebcam();
    }
  };

  const handleStreamIdChange = (e) => {
    setStreamId(e.target.value);
  };

  return (
    <div className="webcam-feed">
      {!isStreaming ? (
        // Regular webcam feed
        <video 
          ref={finalVideoRef} 
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
      ) : (
        // YouTube stream embed
        <>
          {streamId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${streamId}?autoplay=1&mute=0`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ 
                filter: `
                  contrast(${contrast}%)
                  brightness(${brightness}%)
                  grayscale(${grayscale}%)
                  invert(${invert}%)
                `
              }}
            ></iframe>
          ) : (
            <div className="stream-setup">
              <input
                type="text"
                value={streamId}
                onChange={handleStreamIdChange}
                placeholder="Enter YouTube Stream ID"
                className="stream-input"
              />
              <p className="stream-help">
                Enter the YouTube stream ID from your livestream URL 
                (e.g., for youtube.com/watch?v=ABC123, enter "ABC123")
              </p>
            </div>
          )}
        </>
      )}
      
      <div className="stream-controls">
        <button onClick={toggleStreaming} className="stream-toggle-btn">
          {isStreaming ? "Use Webcam" : "Use YouTube Stream"}
        </button>
        
        {isStreaming && streamId && (
          <button 
            onClick={() => setStreamId("")} 
            className="stream-change-btn"
          >
            Change Stream
          </button>
        )}
      </div>
    </div>
  );
};

export default WebcamFeed;