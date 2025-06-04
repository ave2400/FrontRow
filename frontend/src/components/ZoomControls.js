import React from "react";
import "../styles/buttons.css";

const ZoomControls = ({ zoomIn, zoomOut }) => {
  return (
    <>
      <button
        onClick={zoomOut}
        className="btn btn-icon"
        title="Zoom Out"
      >
        -
      </button>
      <button
        onClick={zoomIn}
        className="btn btn-icon"
        title="Zoom In"
      >
        +
      </button>
    </>
  );
};

export default ZoomControls;
