import React, { useState, useRef, useCallback } from "react";
// import WebcamFeed from "./WebcamFeed";
// TODO: UNCOMMENT THIS LATER
import StreamingOnlyWebcamFeed from "./StreamingOnlyWebcamFeed"
import ZoomControls from "./ZoomControls";
import ContrastControls from "./Contrast";
import "./WebcamContainer.css";
import "../styles/buttons.css";

const WebcamContainer = ({ onScreenshot, streamId }) => {
  console.log("WebcamContainer streamId:", streamId);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [filters, setFilters] = useState({
    contrast: 100,
    brightness: 100,
    grayscale: 0,
    invert: 0
  });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Calculate the maximum allowed movement based on zoom level
  const getBoundaries = useCallback(() => {
    if (!containerRef.current) return { maxX: 0, maxY: 0 };

    const container = containerRef.current.getBoundingClientRect();
    // How much the content grows when zoomed
    const extraWidth = (container.width * zoom - container.width) / 2;
    const extraHeight = (container.height * zoom - container.height) / 2;

    return {
      maxX: extraWidth,
      maxY: extraHeight
    };
  }, [zoom]);

  // Clamp position within boundaries
  const clampPosition = useCallback((newX, newY) => {
    const { maxX, maxY } = getBoundaries();
    return {
      x: Math.min(Math.max(newX, -maxX), maxX),
      y: Math.min(Math.max(newY, -maxY), maxY)
    };
  }, [getBoundaries]);

  const zoomIn = () => setZoom((prevZoom) => Math.min(prevZoom + 0.2, 3));
  const zoomOut = () => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(prevZoom - 0.2, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      } else {
        setPosition(prev => clampPosition(prev.x, prev.y));
      }
      return newZoom;
    });
  };

  const handleDragStart = (e) => {
    if (zoom === 1) return;

    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    positionRef.current = position;
  };

  const handleDrag = (e) => {
    if (!isDragging || zoom === 1) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const newPosition = clampPosition(
      positionRef.current.x + deltaX,
      positionRef.current.y + deltaY
    );

    setPosition(newPosition);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    positionRef.current = position;
  };

  const handleWheel = (e) => {
    if (zoom === 1) return;

    e.preventDefault();

    const deltaX = e.deltaMode === 1 ? e.deltaX * 20 : e.deltaX;
    const deltaY = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;

    setPosition(prevPosition => {
      const newPosition = clampPosition(
        prevPosition.x - deltaX,
        prevPosition.y - deltaY
      );
      return newPosition;
    });
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const takeScreenshot = () => {
    if (!videoRef.current || !containerRef.current) return;

    // Show flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Get the container dimensions
    const container = containerRef.current.getBoundingClientRect();
    canvas.width = container.width;
    canvas.height = container.height;

    // Get the video element
    const video = videoRef.current;

    // Calculate the visible portion based on zoom and position
    const scale = 1 / zoom;
    const visibleWidth = container.width * scale;
    const visibleHeight = container.height * scale;

    // Calculate the source rectangle for the current view
    const sourceX = (video.videoWidth - visibleWidth) / 2 - (position.x / zoom);
    const sourceY = (video.videoHeight - visibleHeight) / 2 - (position.y / zoom);

    // Draw the visible portion of the video
    context.filter = `
      contrast(${filters.contrast}%)
      brightness(${filters.brightness}%)
      grayscale(${filters.grayscale}%)
      invert(${filters.invert}%)
    `;
    context.drawImage(
      video,
      sourceX, sourceY, visibleWidth, visibleHeight,
      0, 0, canvas.width, canvas.height
    );

    // Convert to blob and pass to callback
    canvas.toBlob((blob) => {
      if (blob && onScreenshot) {
        onScreenshot(blob);
        // Show notification
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
      }
    }, 'image/png', 1.0);
  };

  return (
    <div
      ref={containerRef}
      className="webcam-container"
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchMove={handleDrag}
      onTouchEnd={handleDragEnd}
      onWheel={handleWheel}
    >
      <div
        className="webcam-box"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {/*  TODO UNCOMMENT THIS LATER */}
        {/* <WebcamFeed 
          zoom={zoom} 
          position={position} 
          filters={filters} 
          videoRef={videoRef}
        /> */}

        <StreamingOnlyWebcamFeed
          zoom={zoom}
          position={position}
          filters={filters}
          streamId={streamId}
        />

        {showFlash && <div className="screenshot-flash" />}
        {showNotification && (
          <div className="screenshot-notification">
            Screenshot added to note!
          </div>
        )}

        <div className="controls-container">
          <ZoomControls zoomIn={zoomIn} zoomOut={zoomOut} />
          <ContrastControls onFilterChange={handleFilterChange} />
          <button
            onClick={takeScreenshot}
            className="btn btn-icon"
            title="Take Screenshot"
          >
            📸
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebcamContainer;