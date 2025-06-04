import React, { useState, useRef, useCallback } from "react";
import StreamingOnlyWebcamFeed from "./StreamingOnlyWebcamFeed"
import ZoomControls from "./ZoomControls";
import ContrastControls from "./Contrast";
import "./WebcamContainer.css";
import "../styles/buttons.css";

const WebcamContainer = ({ onScreenshot, streams = [], selectedStreamId, onStreamSelect, isLoading }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [filters, setFilters] = useState({
    contrast: 100,
    brightness: 100,
    grayscale: 0,
    invert: 0
  });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Get the selected stream
  const selectedStream = streams.find(s => s.id === selectedStreamId) || null;

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

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Only allow scrolling when zoomed in
    if (zoom <= 1) return;

    // Calculate the movement based on wheel delta
    // Multiply by a factor to make scrolling more responsive
    const scrollFactor = 0.5;
    const deltaX = e.deltaX * scrollFactor;
    const deltaY = e.deltaY * scrollFactor;

    // Update position with smooth scrolling
    setPosition(prevPosition => {
      const newPosition = clampPosition(
        prevPosition.x - deltaX,
        prevPosition.y - deltaY
      );
      return newPosition;
    });
  };

  const handleDragStart = (e) => {
    if (zoom <= 1) return;

    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    positionRef.current = position;
  };

  const handleDrag = (e) => {
    if (!isDragging || zoom <= 1) return;

    e.preventDefault();
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Use browser API to capture current tab
  const takeScreenshot = async () => {
    try {
      setIsCapturing(true);

      // Show flash effect
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);

      // Request screen capture with specific displaySurface preference
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "never",
          displaySurface: "browser" // Prioritize capturing the browser tab
        },
        audio: false,
        preferCurrentTab: true, // Chrome 103+ and Edge support this
        selfBrowserSurface: "include" // Firefox supports this
      });

      // Create video element to capture a frame
      const video = document.createElement('video');
      video.srcObject = stream;

      // Wait for video to load
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Wait a moment for the video to start playing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture a frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Apply filters to match the current view
      const filteredCanvas = document.createElement('canvas');
      filteredCanvas.width = canvas.width;
      filteredCanvas.height = canvas.height;
      const filteredCtx = filteredCanvas.getContext('2d');

      // Apply CSS filters
      filteredCtx.filter = `
        contrast(${filters.contrast}%)
        brightness(${filters.brightness}%)
        grayscale(${filters.grayscale}%)
        invert(${filters.invert}%)
      `;

      filteredCtx.drawImage(canvas, 0, 0);

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());

      // Convert to blob
      const blob = await new Promise(resolve => {
        filteredCanvas.toBlob(resolve, 'image/png', 1.0);
      });

      // Pass to callback
      if (blob && onScreenshot) {
        onScreenshot(blob);
        // Show notification
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
      }
    } catch (err) {
      console.error("Error capturing screen:", err);
      // User may have canceled the screen selection
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="webcam-container-wrapper">
      <div
        ref={containerRef}
        className="webcam-container"
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDrag}
        onTouchEnd={handleDragEnd}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
      >
        <div
          className="webcam-box"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {streams.length > 0 && (
            <div className="stream-selector">
              <select
                value={selectedStreamId || ''}
                onChange={(e) => onStreamSelect(e.target.value)}
                className="stream-select"
              >
                <option value="">Select a stream</option>
                {streams.map(stream => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="controls-container">
            <ZoomControls zoomIn={zoomIn} zoomOut={zoomOut} />
            <ContrastControls onFilterChange={handleFilterChange} />
            <button
              onClick={takeScreenshot}
              className="btn btn-icon"
              title="Take Screenshot"
              disabled={isCapturing}
            >
              {isCapturing ? '⏳' : '📸'}
            </button>
          </div>

          <StreamingOnlyWebcamFeed
            zoom={zoom}
            position={position}
            filters={filters}
            streamId={selectedStream?.stream_id}
            streamType={selectedStream?.stream_type}
            isLoading={isLoading}
            onWheel={handleWheel}
          />

          {showFlash && <div className="screenshot-flash" />}
          {showNotification && (
            <div className="screenshot-notification">
              Screenshot added to note!
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default WebcamContainer;