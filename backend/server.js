require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const assistantService = require('./assistantService');
const streamService = require('./streamService');
const authMiddleware = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = ['http://localhost:3000', 'https://frontrow-frontend.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
// app.use(bodyParser.json()); // TODO: idk if we need this (depends on if we use bodyParser.json explicitly in our routes)

let assistantServiceInstance;

// Main function to initialize services and start the server
async function main() {
  try {
    assistantServiceInstance = await assistantService();
    console.log("Assistant service initialized successfully.");

    // Define routes that depend on assistantServiceInstance inside here
    // or ensure they are only called after initialization

    // AI Assistant Routes
    app.post('/api/ai/assistant', async (req, res) => {
      if (!assistantServiceInstance) {
        console.error("AI Assistant service not ready.");
        return res.status(503).json({ error: "Service not available, please try again shortly." });
      }
      try {
        const { action, content, concept, lastContent, imageUrl } = req.body; // Added imageUrl

        switch (action) {
          case 'checkConcepts':
            // Pass lastContent if available, assistantService.checkConcepts has a default
            const checkConceptsOptions = lastContent ? { lastContent } : {};
            const result = await assistantServiceInstance.checkConcepts(content, checkConceptsOptions);
            // When a concept is detected and will be shown, mark it.
            // The client should ideally call a specific endpoint like /mark-shown after displaying the prompt.
            // For simplicity now, if a concept is detected, we can assume it might be shown.
            // However, this is better handled by a specific client action.
            // if (result.detectedConcept) {
            //   assistantServiceInstance.markConceptAsShown(result.detectedConcept.name);
            // }
            return res.json(result);

          case 'getExplanation':
            const explanation = await assistantServiceInstance.getExplanation(concept);
            return res.json(explanation);

          case 'getPracticeQuestion':
            const question = await assistantServiceInstance.getPracticeQuestion(concept);
            return res.json(question);

          case 'getImageSummary':
            if (!imageUrl) {
              return res.status(400).json({ error: 'Image URL is required' });
            }
            const summary = await assistantServiceInstance.getImageSummary(imageUrl);
            return res.json(summary);

          // Add a new case for explicitly marking a concept as shown (for cooldown)
          case 'markConceptAsShown':
            if (concept && concept.name) {
                assistantServiceInstance.markConceptAsShown(concept.name);
                return res.json({ message: `Concept '${concept.name}' marked as shown.` });
            }
            return res.status(400).json({ error: 'Invalid concept name for marking as shown.' });

          default:
            return res.status(400).json({ error: 'Invalid action' });
        }
      } catch (error) {
        console.error('Error in AI assistant API (/api/ai/assistant):', error);
        return res.status(500).json({ error: 'Internal server error in AI assistant' });
      }
    });

    // Stream API Routes (These seem independent of assistantService, so they are fine)
    app.get('/api/stream/config', authMiddleware, async (req, res) => {
      try {
        const config = await streamService.getStreamConfig();
        res.json(config);
      } catch (error) {
        console.error('Error fetching stream config:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/stream/config', authMiddleware, async (req, res) => {
      try {
        const { streamId, streamType } = req.body;
        const success = await streamService.updateStreamConfig(streamId, streamType);
        
        if (success) {
          res.json({ message: 'Stream configuration updated successfully' });
        } else {
          res.status(500).json({ error: 'Failed to update stream configuration' });
        }
      } catch (error) {
        console.error('Error updating stream config:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/stream/id', authMiddleware, async (req, res) => {
      try {
        const streamId = await streamService.getStreamId();
        res.json({ streamId });
      } catch (error) {
        console.error('Error fetching stream ID:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/stream/id', authMiddleware, async (req, res) => {
      try {
        const { streamId } = req.body;
        const success = await streamService.updateStreamId(streamId);
        
        if (success) {
          res.json({ message: 'Stream ID updated successfully' });
        } else {
          res.status(500).json({ error: 'Failed to update stream ID' });
        }
      } catch (error) {
        console.error('Error updating stream ID:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/stream/type', authMiddleware, async (req, res) => {
      try {
        const streamType = await streamService.getStreamType();
        res.json({ streamType });
      } catch (error) {
        console.error('Error fetching stream type:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/stream/type', authMiddleware, async (req, res) => {
      try {
        const { streamType } = req.body;
        const success = await streamService.updateStreamType(streamType);
        
        if (success) {
          res.json({ message: 'Stream type updated successfully' });
        } else {
          res.status(500).json({ error: 'Failed to update stream type' });
        }
      } catch (error) {
        console.error('Error updating stream type:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Start the server after everything is initialized
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (error) {
    console.error("Failed to start the server or initialize services:", error);
    process.exit(1); // Exit if critical initialization fails
  }
}

// Call the main function to start the application
main();