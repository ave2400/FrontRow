import React from "react";

const ZoomControls = ({ zoomIn, zoomOut }) => {
  return (
    <div className="flex space-x-4 bg-gray-900 bg-opacity-80 p-3 rounded-lg">
      <button
        onClick={zoomOut}
        className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
      >
        - Zoom Out
      </button>
      <button
        onClick={zoomIn}
        className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
      >
        + Zoom In
      </button>
    </div>
  );
};

export default ZoomControls;
