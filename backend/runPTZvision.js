//this file is required to run the computer vision model for pan tilt and zoom from python to javascript

require('dotenv').config(); // Load environment variables from .env file to be able to use streamService
const { spawn } = require('child_process');
const streamService = require('./streamService'); //uses streamService to get Id and type of stream

async function PanTiltZoomCV() {
  const { id: streamId, type: streamType } = await streamService.getStreamConfig();
  
  //hardcoded for testing
  //const streamId = 'test123';
  //const streamType = 'youtube';
  
  console.log(`Running CV worker on ${streamType} stream (${streamId})`);

  const pythonProcess = spawn('python', ['PTZvision.py', streamId, streamType]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python]: ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Error]: ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

PanTiltZoomCV();
