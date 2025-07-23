require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const streamService = require('./streamService'); // Update path if needed

async function PanTiltZoomCV() {
  try {
    const { id: streamId, type: streamType } = await streamService.getStreamConfig();

    if (!streamId || !streamType) {
      console.error("[ERROR] Missing stream ID or type from streamService.");
      return;
    }

    console.log(`Grabbing frame from stream [${streamType}] with ID: ${streamId}`);

    // Resolve the Python script path
    const scriptPath = path.join(__dirname, 'ptz_textTracker', 'main.py');
    const pythonProcess = spawn('python', [scriptPath, streamType, streamId]);

    pythonProcess.stdout.on('data', (data) => {
      process.stdout.write(`[PYTHON]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      process.stderr.write(`[PYTHON ERROR]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });

  } catch (err) {
    console.error("[ERROR] Failed to start PTZ script:", err);
  }
}

PanTiltZoomCV();
