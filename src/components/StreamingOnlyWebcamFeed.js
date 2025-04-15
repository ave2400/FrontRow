import React from "react";
import "./WebcamFeed.css";

const StreamingOnlyWebcamFeed = ({ zoom, position, filters, streamId }) => {
  console.log("StreamingOnlyWebcamFeed streamId:", streamId);
  const {
    contrast = 100,
    brightness = 100,
    grayscale = 0,
    invert = 0
  } = filters || {};

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
          <p>Please enter a stream ID in the admin page.</p>
          <p><a href="/admin" style={{color: '#6c63ff'}}>Go to Admin Settings</a></p>
        </div>
      )}
    </div>
  );
};

export default StreamingOnlyWebcamFeed;