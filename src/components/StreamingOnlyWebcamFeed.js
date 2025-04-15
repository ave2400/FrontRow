import React from "react";
import "./WebcamFeed.css";

const StreamingOnlyWebcamFeed = ({ zoom, position, filters, streamId, isLoading }) => {
  console.log("StreamingOnlyWebcamFeed streamId:", streamId);
  const {
    contrast = 100,
    brightness = 100,
    grayscale = 0,
    invert = 0
  } = filters || {};

  if (isLoading) {
    return (
      <div className="webcam-feed loading-state">
        <div className="loading-indicator">
          <p>Loading stream settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="webcam-feed"
      style={{
        transform: `scale(${zoom}) translate(${position?.x / zoom || 0}px, ${position?.y / zoom || 0}px)`,
        transformOrigin: 'center',
        width: '100%',
        height: '100%'
      }}
    >
      {streamId ? (
        // YouTube stream embed with adjusted styling
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
          <p>No stream is currently available.</p>
        </div>
      )}
    </div>
  );
};

export default StreamingOnlyWebcamFeed;