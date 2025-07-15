require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { supabase } = require('./utils/supabaseServerClient');
const { createClient } = require('@supabase/supabase-js');
const streamService = require('./streamService');
const assistantService = require('./assistantService');
const authMiddleware = require('./middleware/auth');
const signalingService = require('./signalingService');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket signaling service
signalingService.initialize(server);

const port = parseInt(process.env.PORT, 10) || 5000;
const host = '0.0.0.0';   // Ensures it listens on all interfaces

server.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});

// Configure Multer
// TODO: Currently storing in memory for simplicity. For production, may want to consider diskStorage or cloud storage.
const storage = multer.memoryStorage(); // Stores file in memory as a Buffer
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
  },
});

// Middleware
const allowedOrigins = ['http://localhost:3000', 'https://frontrow-frontend.vercel.app', 'https://frontrow-frontend-b2o0.onrender.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Increase JSON payload size limit to handle routes using JSON
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

let assistantServiceInstance;

// Main function to initialize services and start the server
async function main() {
  try {
    assistantServiceInstance = await assistantService();
    console.log("Assistant service initialized successfully.");

    // Define routes that depend on assistantServiceInstance inside here
    // or ensure they are only called after initialization

    // AI Assistant Routes
    app.post('/api/ai/assistant', upload.single('image'), async (req, res) => {
      if (!assistantServiceInstance) {
        console.error("AI Assistant service not ready.");
        return res.status(503).json({ error: "Service not available, please try again shortly." });
      }
      try {
        const { action, content, concept, lastContent } = req.body;
        const imageUrl = req.body.imageUrl;
        const imageFile = req.file;

        console.log(`Parsed action from req.body: "${action}"`);

        switch (action) {
          case 'checkConcepts':
            const checkConceptsOptions = lastContent ? { lastContent } : {};
            const result = await assistantServiceInstance.checkConcepts(content, checkConceptsOptions);
            return res.json(result);

          case 'getExplanation':
            const explanation = await assistantServiceInstance.getExplanation(concept);
            return res.json(explanation);

          case 'getPracticeQuestion':
            const question = await assistantServiceInstance.getPracticeQuestion(concept);
            return res.json(question);

          case 'getImageSummary':
            console.log('Case: getImageSummary');
            if (imageFile) {
              const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
              const summary = await assistantServiceInstance.getImageSummary(imageBase64);
              return res.json(summary);
            } else if (imageUrl) {
              const summaryFromUrl = await assistantServiceInstance.getImageSummary(imageUrl);
              return res.json(summaryFromUrl);
            } else {
              return res.status(400).json({ error: 'Image file or Image URL is required for getImageSummary' });
            }

          case 'markConceptAsShown':
            if (concept && concept.name) {
              assistantServiceInstance.markConceptAsShown(concept.name);
              return res.json({ message: `Concept '${concept.name}' marked as shown.` });
            }
            return res.status(400).json({ error: 'Invalid concept name for marking as shown.' });

          default:
            return res.status(400).json({ error: 'Invalid action or missing action' });
        }
      } catch (error) {
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'Image file is too large.' });
          }
          return res.status(400).json({ error: `File upload error: ${error.message}`});
        }
        return res.status(500).json({ error: 'Internal server error in AI assistant' });
      }
    });

    // Stream management endpoints
    app.get('/api/streams/current', authMiddleware, async (req, res) => {
      try {
        const stream = await streamService.getCurrentStream();
        res.json(stream || { is_active: false });
      } catch (error) {
        console.error('Error getting current stream:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/streams/start', authMiddleware, async (req, res) => {
      try {
        console.log('Stream start endpoint called with user ID:', req.user.id);
        const stream = await streamService.startStream(req.user.id);
        if (!stream) {
          console.log('Stream start failed - returning 403');
          return res.status(403).json({ error: 'Only admin users can start streams' });
        }
        console.log('Stream start successful:', stream);
        res.json(stream);
      } catch (error) {
        console.error('Error starting stream:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/streams/stop', authMiddleware, async (req, res) => {
      try {
        const success = await streamService.stopStream(req.user.id);
        if (!success) {
          return res.status(403).json({ error: 'Only admin users can stop streams' });
        }
        res.json({ message: 'Stream stopped successfully' });
      } catch (error) {
        console.error('Error stopping stream:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Admin status check endpoint
    app.get('/api/users/admin-status', authMiddleware, async (req, res) => {
      try {
        const isAdmin = await streamService.isUserAdmin(req.user.id);
        res.json({ isAdmin });
      } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // WebRTC signaling endpoints - MUST come before /:id routes
    app.get('/api/streams/ice-servers', authMiddleware, async (req, res) => {
      try {
        const iceServers = await streamService.getIceServers();
        res.json(iceServers);
      } catch (err) {
        console.error('Error getting ICE servers:', err);
        res.status(500).json({ error: 'Failed to get ICE servers' });
      }
    });

    app.post('/api/streams/:streamId/signal', authMiddleware, async (req, res) => {
      try {
        const { streamId } = req.params;
        const { signal } = req.body;
        const response = await streamService.handleSignaling(streamId, req.user.id, signal);
        res.json({ signal: response });
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
        res.status(500).json({ error: 'Failed to handle WebRTC signal' });
      }
    });

    app.post('/api/streams/:streamId/ice-candidate', authMiddleware, async (req, res) => {
      try {
        const { streamId } = req.params;
        const { candidate } = req.body;
        // Store the ICE candidate for the stream
        // In a real implementation, you would use a signaling server or WebSocket
        res.json({ success: true });
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
        res.status(500).json({ error: 'Failed to handle ICE candidate' });
      }
    });

    // Stream API Routes
    app.get('/api/streams', authMiddleware, async (req, res) => {
      try {
        const streams = await streamService.getActiveStreams();
        res.json(streams);
      } catch (error) {
        console.error('Error fetching streams:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/streams/all', authMiddleware, async (req, res) => {
      try {
        const streams = await streamService.getAllStreams();
        res.json(streams);
      } catch (error) {
        console.error('Error fetching all streams:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/streams/:id', authMiddleware, async (req, res) => {
      try {
        const stream = await streamService.getStreamById(req.params.id);
        if (!stream) {
          return res.status(404).json({ error: 'Stream not found' });
        }
        res.json(stream);
      } catch (error) {
        console.error('Error fetching stream:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/streams', authMiddleware, async (req, res) => {
      try {
        const stream = await streamService.createStream(req.body);
        if (!stream) {
          return res.status(500).json({ error: 'Failed to create stream' });
        }
        res.json(stream);
      } catch (error) {
        console.error('Error creating stream:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.put('/api/streams/:id', authMiddleware, async (req, res) => {
      try {
        const success = await streamService.updateStream(req.params.id, req.body);
        if (!success) {
          return res.status(500).json({ error: 'Failed to update stream' });
        }
        res.json({ message: 'Stream updated successfully' });
      } catch (error) {
        console.error('Error updating stream:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.delete('/api/streams/:id', authMiddleware, async (req, res) => {
      try {
        const success = await streamService.deleteStream(req.params.id);
        if (!success) {
          return res.status(500).json({ error: 'Failed to delete stream' });
        }
        res.json({ message: 'Stream deleted successfully' });
      } catch (error) {
        console.error('Error deleting stream:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/streams/:id/toggle', authMiddleware, async (req, res) => {
      try {
        const { isActive } = req.body;
        const success = await streamService.toggleStreamActive(req.params.id, isActive);
        if (!success) {
          return res.status(500).json({ error: 'Failed to toggle stream status' });
        }
        res.json({ message: 'Stream status updated successfully' });
      } catch (error) {
        console.error('Error toggling stream status:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Debug endpoint to test admin status
    app.get('/api/debug/admin-status', authMiddleware, async (req, res) => {
      try {
        console.log('Debug: User ID from request:', req.user.id);
        console.log('Debug: User object:', req.user);
        
        const { data, error } = await supabase.auth.admin.getUserById(req.user.id);
        
        if (error) {
          console.error('Debug: Error getting user:', error);
          return res.status(500).json({ error: error.message });
        }
        
        console.log('Debug: Full user data:', data);
        
        res.json({
          userId: req.user.id,
          userData: data,
          appMetadata: data.user?.app_metadata,
          role: data.user?.app_metadata?.role,
          isAdmin: data.user?.app_metadata?.role === 'admin'
        });
      } catch (err) {
        console.error('Debug: Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Start the server after everything is initialized
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (error) {
    console.error("Failed to start the server or initialize services:", error);
    process.exit(1);
  }
}

main();
