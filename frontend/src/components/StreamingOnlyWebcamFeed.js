import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import "./WebcamFeed.css";
import { supabase } from '../supabaseClient.js';
import socketService from '../services/socketService.js';

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
  const [viewerConnections, setViewerConnections] = useState(new Map());

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

  const setupAdminSignaling = useCallback(() => {
    if (!streamId) return;

    // Join as admin
    socketService.joinAsAdmin(streamId);

    // Listen for viewer connections
    socketService.on('viewer-joined', handleViewerJoined);
    socketService.on('offer', handleViewerOffer);
    socketService.on('ice-candidate', handleViewerIceCandidate);

    // Notify that stream has started
    socketService.startStream(streamId);
  }, [streamId]);

  const setupViewerSignaling = useCallback(() => {
    if (!streamId) return;

    // Join as viewer
    socketService.joinAsViewer(streamId);

    // Listen for stream events
    socketService.on('stream-started', handleStreamStarted);
    socketService.on('stream-stopped', handleStreamStopped);
    socketService.on('answer', handleAdminAnswer);
    socketService.on('ice-candidate', handleAdminIceCandidate);
  }, [streamId]);

  const cleanupSignaling = useCallback(() => {
    if (streamId) {
      socketService.stopStream(streamId);
    }
    
    // Remove all listeners
    socketService.off('viewer-joined', handleViewerJoined);
    socketService.off('offer', handleViewerOffer);
    socketService.off('ice-candidate', handleViewerIceCandidate);
    socketService.off('stream-started', handleStreamStarted);
    socketService.off('stream-stopped', handleStreamStopped);
    socketService.off('answer', handleAdminAnswer);
    socketService.off('ice-candidate', handleAdminIceCandidate);
  }, [streamId]);

  useEffect(() => {
    console.log('StreamingOnlyWebcamFeed useEffect:', { isAdmin, streamId, streamType, isStreaming });
    
    if (isAdmin && streamType === 'local' && streamId) {
      // Only start local stream if we have a streamId (meaning stream is active)
      console.log('Starting local stream for admin...');
      startLocalStream();
      setupAdminSignaling();
    } else if (streamId && streamType !== 'local') {
      // Handle external platforms (YouTube, Zoom)
      console.log('Setting external stream as active...');
      setIsStreaming(true);
    } else if (streamId && streamType === 'local' && !isAdmin) {
      console.log('Connecting to local stream as viewer...');
      setupViewerSignaling();
    } else {
      // No streamId or stream stopped - stop any active streams
      console.log('No stream active - stopping any existing streams...');
      stopStream();
      cleanupSignaling();
    }
  }, [isAdmin, streamId, streamType, setupAdminSignaling, setupViewerSignaling, cleanupSignaling]);

  // Cleanup effect to ensure camera is stopped when component unmounts
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up streams...');
      stopStream();
      cleanupSignaling();
    };
  }, [cleanupSignaling]);

  const handleViewerJoined = (data) => {
    console.log('Viewer joined:', data.viewerId);
    createPeerConnectionForViewer(data.viewerId);
  };

  const handleViewerOffer = (data) => {
    console.log('Received offer from viewer:', data.viewerId);
    const peerConnection = viewerConnections.get(data.viewerId);
    if (peerConnection) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => peerConnection.createAnswer())
        .then((answer) => {
          peerConnection.setLocalDescription(answer);
          socketService.sendAnswer(answer, data.viewerId);
        })
        .catch(err => console.error('Error handling viewer offer:', err));
    }
  };

  const handleViewerIceCandidate = (data) => {
    console.log('Received ICE candidate from viewer:', data.viewerId);
    const peerConnection = viewerConnections.get(data.viewerId);
    if (peerConnection && data.candidate) {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch(err => console.error('Error adding ICE candidate:', err));
    }
  };

  const handleStreamStarted = (data) => {
    console.log('Stream started:', data.streamId);
    connectToStream();
  };

  const handleStreamStopped = (data) => {
    console.log('Stream stopped:', data.streamId);
    stopStream();
  };

  const handleAdminAnswer = (data) => {
    console.log('Received answer from admin');
    if (peerConnectionRef.current) {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        .catch(err => console.error('Error setting remote description:', err));
    }
  };

  const handleAdminIceCandidate = (data) => {
    console.log('Received ICE candidate from admin');
    if (peerConnectionRef.current && data.candidate) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch(err => console.error('Error adding ICE candidate:', err));
    }
  };

  const createPeerConnectionForViewer = async (viewerId) => {
    try {
      // Get ICE servers
      const { data: { session } } = await supabase.auth.getSession();
      const iceResponse = await fetch(`${API_BASE_URL}/api/streams/ice-servers`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const { iceServers } = await iceResponse.json();

      // Create peer connection
      const peerConnection = new RTCPeerConnection({ iceServers });

      // Add local stream tracks
      if (stream) {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendIceCandidate(event.candidate, viewerId, true);
        }
      };

      // Store the connection
      setViewerConnections(prev => new Map(prev.set(viewerId, peerConnection)));

      console.log('Created peer connection for viewer:', viewerId);
    } catch (err) {
      console.error('Error creating peer connection for viewer:', err);
    }
  };

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
          socketService.sendIceCandidate(event.candidate, null, false);
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

      // Send offer through WebSocket
      socketService.sendOffer(offer, socketService.socket.id);

      setIsStreaming(true);
      setError(null);
    } catch (err) {
      console.error('Error connecting to stream:', err);
      setError('Failed to connect to stream. Please try again later.');
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

    // Close peer connections
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close viewer connections
    viewerConnections.forEach(connection => {
      connection.close();
    });
    setViewerConnections(new Map());

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
              title="YouTube Stream"
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
              title="Zoom Meeting"
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