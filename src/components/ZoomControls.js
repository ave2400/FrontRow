import React from "react";
import "../styles/buttons.css";

const ZoomControls = ({ zoomIn, zoomOut }) => {
  return (
    <div className="flex gap-8 bg-gray-900 bg-opacity-80 p-3 rounded-lg">
      <button
        onClick={zoomOut}
        className="btn btn-secondary px-6 py-3"
      >
        - Zoom Out
      </button>
      <button
        onClick={zoomIn}
        className="btn btn-secondary px-6 py-3"
      >
        + Zoom In
      </button>
    </div>
  );
};

export default ZoomControls;
