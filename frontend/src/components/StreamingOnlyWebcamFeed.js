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

  // track camera state and sender for flip
  const [usingFront, setUsingFront] = useState(true);
  const videoSenderRef = useRef(null);

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
    socketService.joinAsAdmin(streamId);
    socketService.on('viewer-joined', handleViewerJoined);
    socketService.on('offer', handleViewerOffer);
    socketService.on('ice-candidate', handleViewerIceCandidate);
    socketService.startStream(streamId);
  }, [streamId]);

  const setupViewerSignaling = useCallback(() => {
    if (!streamId) return;
    socketService.joinAsViewer(streamId);
    socketService.on('stream-started', handleStreamStarted);
    socketService.on('stream-stopped', handleStreamStopped);
    socketService.on('answer', handleAdminAnswer);
    socketService.on('ice-candidate', handleAdminIceCandidate);
  }, [streamId]);

  const cleanupSignaling = useCallback(() => {
    if (streamId) {
      socketService.stopStream(streamId);
    }
    socketService.off('viewer-joined', handleViewerJoined);
    socketService.off('offer', handleViewerOffer);
    socketService.off('ice-candidate', handleViewerIceCandidate);
    socketService.off('stream-started', handleStreamStarted);
    socketService.off('stream-stopped', handleStreamStopped);
    socketService.off('answer', handleAdminAnswer);
    socketService.off('ice-candidate', handleAdminIceCandidate);
  }, [streamId]);

  useEffect(() => {
    if (isAdmin && streamType === 'local' && streamId) {
      startLocalStream(true); // default to front cam
      setupAdminSignaling();
    } else if (streamId && streamType !== 'local') {
      setIsStreaming(true);
    } else if (streamId && streamType === 'local' && !isAdmin) {
      setupViewerSignaling();
    } else {
      stopStream();
      cleanupSignaling();
    }
  }, [isAdmin, streamId, streamType, setupAdminSignaling, setupViewerSignaling, cleanupSignaling]);

  useEffect(() => {
    return () => {
      stopStream();
      cleanupSignaling();
    };
  }, [cleanupSignaling]);

  const handleViewerJoined = (data) => {
    createPeerConnectionForViewer(data.viewerId);
    socketService.startStream(streamId);
  };

  const handleViewerOffer = (data) => {
    const peerConnection = viewerConnectionsRef.current.get(data.viewerId);
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
    const peerConnection = viewerConnectionsRef.current.get(data.viewerId);
    if (peerConnection && data.candidate) {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch(err => console.error('Error adding ICE candidate:', err));
    }
  };

  const handleStreamStarted = () => {
    connectToStream();
  };

  const handleStreamStopped = () => {
    stopStream();
  };

  const handleAdminAnswer = (data) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        .catch(err => console.error('Error setting remote description:', err));
    }
  };

  const handleAdminIceCandidate = (data) => {
    if (peerConnectionRef.current && data.candidate) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch(err => console.error('Error adding ICE candidate:', err));
    }
  };

  const createPeerConnectionForViewer = async (viewerId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const iceResponse = await fetch(`${API_BASE_URL}/api/streams/ice-servers`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const { iceServers } = await iceResponse.json();

      const peerConnection = new RTCPeerConnection({ iceServers });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendIceCandidate(event.candidate, viewerId, true);
        }
      };

      let streamToUse = stream;
      if (!streamToUse && finalVideoRef.current && finalVideoRef.current.srcObject) {
        streamToUse = finalVideoRef.current.srcObject;
      }

      if (streamToUse) {
        const tracks = streamToUse.getTracks();
        tracks.forEach(track => {
          const sender = peerConnection.addTrack(track, streamToUse);
          if (track.kind === 'video') {
            videoSenderRef.current = sender;
          }
        });
      }

      viewerConnectionsRef.current.set(viewerId, peerConnection);
      setViewerConnections(prev => new Map(prev.set(viewerId, peerConnection)));
    } catch (err) {
      console.error('Error creating peer connection for viewer:', err);
    }
  };

  const startLocalStream = async (front = true) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: front ? 'user' : 'environment' },
        audio: true,
      });

      if (finalVideoRef.current) {
        finalVideoRef.current.srcObject = mediaStream;
      }

      if (isStreaming && videoSenderRef.current) {
        const newTrack = mediaStream.getVideoTracks()[0];
        await videoSenderRef.current.replaceTrack(newTrack);
      } else {
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('User not authenticated');

      const iceResponse = await fetch(`${API_BASE_URL}/api/streams/ice-servers`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const { iceServers } = await iceResponse.json();

      peerConnectionRef.current = new RTCPeerConnection({ iceServers });

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendIceCandidate(event.candidate, null, false);
        }
      };

      peerConnectionRef.current.ontrack = (event) => {
        if (finalVideoRef.current) {
          finalVideoRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnectionRef.current.setLocalDescription(offer);
      socketService.sendOffer(offer, socketService.socket.id);

      setIsStreaming(true);
      setError(null);
    } catch (err) {
      console.error('Error connecting to stream:', err);
      setError('Failed to connect to stream. Please try again later.');
    }
  };

  const stopStream = () => {
    if (finalVideoRef.current && finalVideoRef.current.srcObject) {
      finalVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      finalVideoRef.current.srcObject = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    viewerConnections.forEach(connection => connection.close());
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
    <div className="webcam-feed" style={{ transformOrigin: 'center', width: '100%', height: '100%' }}>
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
            {zoom > 1 && <div className="stream-overlay" onWheel={onWheel} />}
          </div>
        ) : streamType === "local" ? (
          <div className="stream-wrapper">
            <video
              ref={finalVideoRef}
              autoPlay
              playsInline
              muted={isAdmin}
              style={{ width: '100%', height: '100%', filter: filterStyle }}
            />
            {isAdmin && (
              <button
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  zIndex: 10,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const next = !usingFront;
                  setUsingFront(next);
                  startLocalStream(next);
                }}
              >
                Flip Camera
              </button>
            )}
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
