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
  const viewerConnectionsRef = useRef(new Map());
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
    
    // Send stream-started event to notify viewer that stream is ready
    socketService.startStream(streamId);
  };

  const handleViewerOffer = (data) => {
    console.log('Received offer from viewer:', data.viewerId, 'offer:', data.offer);
    const peerConnection = viewerConnectionsRef.current.get(data.viewerId);
    if (peerConnection) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => {
          console.log('Admin set remote description for viewer:', data.viewerId);
          return peerConnection.createAnswer();
        })
        .then((answer) => {
          console.log('Admin created answer for viewer:', data.viewerId, 'answer:', answer);
          peerConnection.setLocalDescription(answer);
          socketService.sendAnswer(answer, data.viewerId);
          console.log('Admin peer connection state after setting local description:', peerConnection.connectionState);
          console.log('Admin ICE connection state after setting local description:', peerConnection.iceConnectionState);
        })
        .catch(err => console.error('Error handling viewer offer:', err));
    } else {
      console.error('No peer connection found for viewer:', data.viewerId);
    }
  };

  const handleViewerIceCandidate = (data) => {
    console.log('Admin received ICE candidate from viewer:', data.viewerId, data.candidate);
    const peerConnection = viewerConnectionsRef.current.get(data.viewerId);
    if (peerConnection && data.candidate) {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        .then(() => console.log('Admin added ICE candidate from viewer:', data.viewerId))
        .catch(err => console.error('Error adding ICE candidate:', err));
    }
  };

  const handleStreamStarted = (data) => {
    console.log('Stream started event received:', data.streamId);
    connectToStream();
  };

  const handleStreamStopped = (data) => {
    console.log('Stream stopped:', data.streamId);
    stopStream();
  };

  const handleAdminAnswer = (data) => {
    console.log('Received answer from admin:', data.answer);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        .then(() => {
          console.log('Viewer set remote description from admin');
          console.log('Viewer peer connection state after setting remote description:', peerConnectionRef.current.connectionState);
          console.log('Viewer ICE connection state after setting remote description:', peerConnectionRef.current.iceConnectionState);
        })
        .catch(err => console.error('Error setting remote description:', err));
    } else {
      console.error('No peer connection found for viewer');
    }
  };

  const handleAdminIceCandidate = (data) => {
    console.log('Viewer received ICE candidate from admin:', data.candidate);
    if (peerConnectionRef.current && data.candidate) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
        .then(() => console.log('Viewer added ICE candidate from admin'))
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

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('Admin peer connection state changed:', peerConnection.connectionState);
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('Admin ICE connection state changed:', peerConnection.iceConnectionState);
      };

      // Add local stream tracks
      console.log('Adding tracks to peer connection, stream:', stream);
      let streamToUse = stream;
      
      // If stream state is not available, try to get it from the video element
      if (!streamToUse && finalVideoRef.current && finalVideoRef.current.srcObject) {
        streamToUse = finalVideoRef.current.srcObject;
        console.log('Using stream from video element:', streamToUse);
      }
      
      if (streamToUse) {
        const tracks = streamToUse.getTracks();
        console.log('Stream tracks:', tracks);
        tracks.forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          peerConnection.addTrack(track, streamToUse);
        });
      } else {
        console.warn('No stream available when creating peer connection for viewer');
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Admin sending ICE candidate to viewer:', viewerId, event.candidate);
          socketService.sendIceCandidate(event.candidate, viewerId, true);
        }
      };

      // Store the connection in both ref and state
      viewerConnectionsRef.current.set(viewerId, peerConnection);
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
    console.log('connectToStream called - creating peer connection for viewer');
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

      // Monitor connection state
      peerConnectionRef.current.onconnectionstatechange = () => {
        console.log('Viewer peer connection state changed:', peerConnectionRef.current.connectionState);
      };

      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log('Viewer ICE connection state changed:', peerConnectionRef.current.iceConnectionState);
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Viewer sending ICE candidate to admin:', event.candidate);
          socketService.sendIceCandidate(event.candidate, null, false);
        }
      };

      // Handle incoming stream
      peerConnectionRef.current.ontrack = (event) => {
        console.log('Viewer received track from admin:', event.streams[0]);
        if (finalVideoRef.current) {
          finalVideoRef.current.srcObject = event.streams[0];
          console.log('Viewer set video srcObject');
        }
      };

      // Create and send offer with media constraints
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnectionRef.current.setLocalDescription(offer);

      console.log('Viewer sending offer to admin:', offer);
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
    viewerConnectionsRef.current.clear();
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
            {zoom > 1 && <div className="stream-overlay" />}
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
            {zoom > 1 && <div className="stream-overlay"  onWheel={onWheel}  />}
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

export default React.memo(StreamingOnlyWebcamFeed);