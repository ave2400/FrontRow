import React, { useRef } from "react";
import Webcam from "react-webcam";
import "../styles/Webcam.css";

const WebcamComponent = () => {
  const webcamRef = useRef(null);
  
  const videoConstraints = {
    width: 400,
    height: 300,
    facingMode: "user"
  };

  return (
    <div className="notebook-container">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          height={300}
          width={400}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          mirrored={true}
        />
      </div>
      <div className="annotation-container">
        <textarea 
          className="annotation-input"
          placeholder="Add your notes here..."
          rows={4}
        />
      </div>
    </div>
  );
};

export default WebcamComponent;
