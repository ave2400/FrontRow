import React from 'react';

const InvertButton = ({ isInverted, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="invert-button"
      title={isInverted ? "Reset Colors" : "Invert Colors"}
    >
      {isInverted ? "Reset" : "Invert"}
    </button>
  );
};

export default InvertButton;