import React, { useRef } from "react";
import "./WebcamFeed.css";

const StreamingOnlyWebcamFeed = ({ 
  zoom, 
  position, 
  filters, 
  streamId, 
  streamType = "youtube", 
  isLoading,
  videoRef,
  iframeRef,
  onWheel
}) => {
  console.log("StreamingOnlyWebcamFeed streamId:", streamId, "type:", streamType);
  const iframeRefInternal = useRef(null);
  const finalIframeRef = iframeRef || iframeRefInternal;
  const {
    contrast = 100,
    brightness = 100,
    grayscale = 0,
    invert = 0
  } = filters || {};

  // Prepare filter style string
  const filterStyle = `
    contrast(${contrast}%)
    brightness(${brightness}%)
    grayscale(${grayscale}%)
    invert(${invert}%)
  `;

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
      onWheel={onWheel}
      style={{
        transformOrigin: 'center',
        width: '100%',
        height: '100%'
      }}
    >
      {streamId ? (
        streamType === "youtube" ? (
          <div className="stream-wrapper">
            <iframe
              ref={finalIframeRef}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${streamId}?autoplay=1&mute=0&enablejsapi=1&origin=${window.location.origin}&rel=0&modestbranding=1&playsinline=1`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ filter: filterStyle }}
            />
            {zoom > 1 && <div className="stream-overlay" onWheel={onWheel} />}
          </div>
        ) : streamType === "zoom" ? (
          <div className="stream-wrapper">
            <iframe
              ref={finalIframeRef}
              width="100%"
              height="100%"
              src={streamId}
              frameBorder="0"
              allow="microphone; camera; autoplay; fullscreen; display-capture"
              allowFullScreen
              style={{ filter: filterStyle }}
            />
            {zoom > 1 && <div className="stream-overlay" onWheel={onWheel} />}
          </div>
        ) : (
          <div className="stream-setup">
            <p>Unknown stream type. Please check your settings.</p>
          </div>
        )
      ) : (
        <div className="stream-setup">
          <p>No stream is currently available.</p>
        </div>
      )}
    </div>
  );
};

export default StreamingOnlyWebcamFeed;