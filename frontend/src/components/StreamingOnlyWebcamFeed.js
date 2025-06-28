import React, { useRef, useEffect, useState, useMemo } from "react";
import "./WebcamFeed.css";
import { supabase } from '../supabaseClient.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const StreamingOnlyWebcamFeed = ({ 
  zoom, 
  position, 
  filters, 
  streamId, 
  streamType = "youtube",
  isAdmin = false,
  isLoading,
  videoRef,
  onWheel
}) => {
  const videoRefInternal = useRef(null);
  const finalVideoRef = videoRef || videoRefInternal;
  const peerConnectionRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  // const iframeRefInternal = useRef(null);
  // const finalIframeRef = iframeRef || iframeRefInternal;

  const {
    contrast = 100,
    brightness = 100,
    grayscale = 0,
    invert = 0
  } = filters || {};

  const filterStyle = useMemo(() => `
    contrast(${contrast}%)
    brightness(${brightness}%)
    grayscale(${grayscale}%)
    invert(${invert}%)
  `, [contrast, brightness, grayscale, invert]);

  const youtubeUrl = useMemo(() => 
    `https://www.youtube.com/embed/${streamId}?autoplay=1&mute=0&enablejsapi=1&origin=${window.location.origin}&rel=0&modestbranding=1&playsinline=1`,
    [streamId]
  );

  useEffect(() => {
    console.log('StreamingOnlyWebcamFeed useEffect:', { isAdmin, streamId, streamType, isStreaming });
    
    if (isAdmin && streamType === 'local' && streamId) {
      // Only start local stream if we have a streamId (meaning stream is active)
      console.log('Starting local stream for admin...');
      startLocalStream();
    } else if (streamId && streamType !== 'local') {
      // Handle external platforms (YouTube, Zoom)
      console.log('Setting external stream as active...');
      setIsStreaming(true);
    } else if (streamId && streamType === 'local' && !isAdmin) {
      console.log('Connecting to local stream as viewer...');
      connectToStream();
    } else {
      // No streamId or stream stopped - stop any active streams
      console.log('No stream active - stopping any existing streams...');
      stopStream();
    }
  }, [isAdmin, streamId, streamType]);

  // Cleanup effect to ensure camera is stopped when component unmounts
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up streams...');
      stopStream();
    };
  }, []);

  const startLocalStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      if (finalVideoRef.current) {
        finalVideoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
      
      setIsStreaming(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera and microphone. Please ensure you have granted the necessary permissions.');
    }
  };

  const connectToStream = async () => {
    try {
      // Get user session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Get ICE servers configuration
      const iceResponse = await fetch(`${API_BASE_URL}/api/streams/ice-servers`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!iceResponse.ok) {
        throw new Error('Failed to get ICE servers');
      }
      
      const { iceServers } = await iceResponse.json();

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection({ iceServers });

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to signaling server
          fetch(`${API_BASE_URL}/api/streams/${streamId}/ice-candidate`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ candidate: event.candidate })
          });
        }
      };

      // Handle incoming stream
      peerConnectionRef.current.ontrack = (event) => {
        if (finalVideoRef.current) {
          finalVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Create and send offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      const signalResponse = await fetch(`${API_BASE_URL}/api/streams/${streamId}/signal`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ signal: offer })
      });

      if (!signalResponse.ok) {
        throw new Error(`Signaling failed: ${signalResponse.status}`);
      }

      const { signal: answer } = await signalResponse.json();
      
      if (!answer || !answer.type || !answer.sdp) {
        throw new Error('Invalid signaling response');
      }
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));

      setIsStreaming(true);
      setError(null);
    } catch (err) {
      console.error('Error connecting to stream:', err);
      setError('Failed to connect to stream. This feature requires a proper WebRTC signaling server. For now, only the admin can see their camera feed.');
    }
  };

  const stopStream = () => {
    console.log('Stopping stream and cleaning up...');
    
    // Stop all media tracks
    if (finalVideoRef.current && finalVideoRef.current.srcObject) {
      const tracks = finalVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      finalVideoRef.current.srcObject = null;
    }

    // Stop the stored stream
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => {
        console.log('Stopping stored track:', track.kind);
        track.stop();
      });
      setStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsStreaming(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="webcam-feed loading-state">
        <div className="loading-indicator">
          <p>Loading stream settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="webcam-feed error-state">
        <p>{error}</p>
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
              width="100%"
              height="100%"
              src={youtubeUrl}
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
        ) : streamType === "local" ? (
          <div className="stream-wrapper">
            <video
              ref={finalVideoRef}
              autoPlay
              playsInline
              muted={isAdmin}
              style={{ 
                width: '100%',
                height: '100%',
                filter: filterStyle
              }}
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