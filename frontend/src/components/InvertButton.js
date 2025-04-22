import React from 'react';
import "../styles/buttons.css";

const InvertButton = ({ isInverted, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="btn btn-icon"
      title={isInverted ? "Reset Colors" : "Invert Colors"}
    >
      {isInverted ? "Reset" : "Invert"}
    </button>
  );
};

export default InvertButton;