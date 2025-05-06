require('dotenv').config();
const express = require('express');
const cors = require('cors');
const assistantService = require('./assistant');
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

// AI Assistant Routes
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { action, content, concept } = req.body;

    switch (action) {
      case 'checkConcepts':
        const result = await assistantService.checkConcepts(content);
        return res.json(result);

      case 'getExplanation':
        const explanation = await assistantService.getExplanation(concept);
        return res.json(explanation);

      case 'getPracticeQuestion':
        const question = await assistantService.getPracticeQuestion(concept);
        return res.json(question);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in AI assistant API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Stream API Routes
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 