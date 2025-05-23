require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const assistantService = require('./assistantService');
const streamService = require('./streamService');
const authMiddleware = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 5000;

// Configure Multer
// TODO: Currently storing in memory for simplicity. For production, may want to consider diskStorage or cloud storage.
const storage = multer.memoryStorage(); // Stores file in memory as a Buffer
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

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
      // DETAILED LOGGING HERE:
      console.log('--- Request to /api/ai/assistant ---');
      console.log('req.body:', JSON.stringify(req.body, null, 2)); // Log text fields from FormData
      console.log('req.file:', req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : 'No file uploaded'); // Log file info (not the whole buffer)

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
              console.log('Image file received for summary.');
              const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
              const summary = await assistantServiceInstance.getImageSummary(imageBase64);
              return res.json(summary);
            } else if (imageUrl) { // Fallback if you still want to support imageUrl for this action
              console.log('Image URL received for summary.');
              const summaryFromUrl = await assistantServiceInstance.getImageSummary(imageUrl);
              return res.json(summaryFromUrl);
            } else {
              console.log('getImageSummary: No imageFile or imageUrl provided.');
              return res.status(400).json({ error: 'Image file or Image URL is required for getImageSummary' });
            }

          case 'markConceptAsShown':
            if (concept && concept.name) {
              assistantServiceInstance.markConceptAsShown(concept.name);
              return res.json({ message: `Concept '${concept.name}' marked as shown.` });
            }
            return res.status(400).json({ error: 'Invalid concept name for marking as shown.' });

          default:
            // if (!action && imageFile) {
            //   const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
            //   const summaryOnly = await assistantServiceInstance.getImageSummary(imageBase64);
            //   return res.json(summaryOnly);
            // }
            console.log(`Default case hit. Action received: "${action}". imageFile present: ${!!imageFile}`);
            return res.status(400).json({ error: 'Invalid action or missing action' });
        }
      } catch (error) {
        console.error('Error in AI assistant API (/api/ai/assistant):', error);
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'Image file is too large.' });
          }
          return res.status(400).json({ error: `File upload error: ${error.message}`});
        }
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
    process.exit(1);
  }
}

main();