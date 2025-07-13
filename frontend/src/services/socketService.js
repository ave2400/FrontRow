import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    this.socket = io(API_BASE_URL);

    this.socket.on('connect', () => {
      // console.log('Connected to signaling server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      // console.log('Disconnected from signaling server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      // console.error('Connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Admin methods
  joinAsAdmin(streamId) {
    if (!this.socket) this.connect();
    this.socket.emit('admin-join', streamId);
  }

  startStream(streamId) {
    if (!this.socket) this.connect();
    this.socket.emit('admin-stream-start', streamId);
  }

  stopStream(streamId) {
    if (!this.socket) this.connect();
    this.socket.emit('admin-stream-stop', streamId);
  }

  // Viewer methods
  joinAsViewer(streamId) {
    if (!this.socket) this.connect();
    this.socket.emit('viewer-join', streamId);
  }

  // WebRTC signaling methods
  sendOffer(offer, viewerId) {
    if (!this.socket) this.connect();
    this.socket.emit('offer', { offer, viewerId });
  }

  sendAnswer(answer, viewerId) {
    if (!this.socket) this.connect();
    this.socket.emit('answer', { answer, viewerId });
  }

  sendIceCandidate(candidate, viewerId, isAdmin = false) {
    if (!this.socket) this.connect();
    if (isAdmin) {
      this.socket.emit('admin-ice-candidate', { candidate, viewerId });
    } else {
      this.socket.emit('viewer-ice-candidate', { candidate, viewerId });
    }
  }

  // Event listeners
  on(event, callback) {
    if (!this.socket) this.connect();
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
    
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Cleanup all listeners
  cleanup() {
    this.eventListeners.forEach((listeners, eventName) => {
      listeners.forEach(callback => {
        this.socket.off(eventName, callback);
      });
    });
    this.eventListeners.clear();
  }
}

const socketService = new SocketService();

export default socketService; 