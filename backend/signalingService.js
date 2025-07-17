const { Server } = require('socket.io');

class SignalingService {
  constructor() {
    this.io = null;
    this.adminSocket = null;
    this.viewerSockets = new Map(); // Map of streamId to viewer sockets
    this.streamRooms = new Map(); // Map of streamId to room name
  }

  initialize(server) {
    const allowedOrigins = ['http://localhost:3000', 'https://frontrow-frontend.vercel.app', 'https://frontrow-frontend-b2o0.onrender.com'];
    
    this.io = new Server(server, {
      cors: {
        origin: function (origin, callback) {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle admin joining
      socket.on('admin-join', (streamId) => {
        console.log('Admin joining stream:', streamId);
        this.adminSocket = socket;
        socket.join(`stream-${streamId}`);
        socket.emit('admin-joined', { streamId });
      });

      // Handle viewer joining
      socket.on('viewer-join', (streamId) => {
        console.log('Viewer joining stream:', streamId);
        socket.join(`stream-${streamId}`);
        
        // Store viewer socket
        if (!this.viewerSockets.has(streamId)) {
          this.viewerSockets.set(streamId, []);
        }
        this.viewerSockets.get(streamId).push(socket);

        // Notify admin that a viewer joined
        if (this.adminSocket) {
          this.adminSocket.emit('viewer-joined', { streamId, viewerId: socket.id });
        }

        socket.emit('viewer-joined-stream', { streamId });
      });

      // Handle WebRTC offer from viewer to admin
      socket.on('offer', (data) => {
        console.log('Offer received from viewer:', data.viewerId);
        if (this.adminSocket) {
          this.adminSocket.emit('offer', {
            offer: data.offer,
            viewerId: data.viewerId
          });
        }
      });

      // Handle WebRTC answer from admin to viewer
      socket.on('answer', (data) => {
        console.log('Answer received from admin for viewer:', data.viewerId);
        const viewerSocket = this.findViewerSocket(data.viewerId);
        if (viewerSocket) {
          viewerSocket.emit('answer', { answer: data.answer });
        }
      });

      // Handle ICE candidates from admin to viewer
      socket.on('admin-ice-candidate', (data) => {
        console.log('ICE candidate from admin for viewer:', data.viewerId);
        const viewerSocket = this.findViewerSocket(data.viewerId);
        if (viewerSocket) {
          viewerSocket.emit('ice-candidate', { candidate: data.candidate });
        }
      });

      // Handle ICE candidates from viewer to admin
      socket.on('viewer-ice-candidate', (data) => {
        console.log('ICE candidate from viewer:', data.viewerId);
        if (this.adminSocket) {
          this.adminSocket.emit('ice-candidate', {
            candidate: data.candidate,
            viewerId: data.viewerId
          });
        }
      });

      // Handle admin stream start
      socket.on('admin-stream-start', (streamId) => {
        console.log('Admin started streaming:', streamId);
        this.io.to(`stream-${streamId}`).emit('stream-started', { streamId });
      });

      // Handle admin stream stop
      socket.on('admin-stream-stop', (streamId) => {
        console.log('Admin stopped streaming:', streamId);
        this.io.to(`stream-${streamId}`).emit('stream-stopped', { streamId });
        
        // Clean up viewer sockets for this stream
        this.viewerSockets.delete(streamId);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove from admin if this was the admin
        if (this.adminSocket && this.adminSocket.id === socket.id) {
          this.adminSocket = null;
        }

        // Remove from viewer sockets
        for (const [streamId, viewers] of this.viewerSockets.entries()) {
          const index = viewers.findIndex(v => v.id === socket.id);
          if (index !== -1) {
            viewers.splice(index, 1);
            if (viewers.length === 0) {
              this.viewerSockets.delete(streamId);
            }
            break;
          }
        }
      });
    });

    console.log('Signaling service initialized');
  }

  findViewerSocket(viewerId) {
    for (const viewers of this.viewerSockets.values()) {
      const viewer = viewers.find(v => v.id === viewerId);
      if (viewer) return viewer;
    }
    return null;
  }

  getIO() {
    return this.io;
  }
}

module.exports = new SignalingService(); 
