import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import './Contrast.css';
import "../styles/buttons.css";

// Preset configurations for different visual needs
const PRESETS = {
  default: { contrast: 100, brightness: 100, grayscale: 0, invert: 0 },
  highContrast: { contrast: 175, brightness: 110, grayscale: 0, invert: 0 },
  lowLight: { contrast: 110, brightness: 85, grayscale: 0, invert: 0 },
  blackOnWhite: { contrast: 140, brightness: 120, grayscale: 0, invert: 100 },
  whiteOnBlack: { contrast: 140, brightness: 80, grayscale: 0, invert: 0 },
  grayscale: { contrast: 125, brightness: 110, grayscale: 100, invert: 0 },
};

const ContrastControls = ({ onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('default');
  const [filters, setFilters] = useState(PRESETS.default);
  const [panelPosition, setPanelPosition] = useState({ above: false, left: false });
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const calculatePosition = () => {
    if (!buttonRef.current || !panelRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const wouldGoBelow = buttonRect.bottom + panelRect.height + 8 > viewportHeight;
    const wouldGoRight = buttonRect.left + panelRect.width > viewportWidth;
    const wouldGoLeft = buttonRect.left - panelRect.width < 0;

    setPanelPosition({
      above: wouldGoBelow,
      left: wouldGoRight,
    });
  };

  useLayoutEffect(() => {
    calculatePosition();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {      
      const handleResize = () => calculatePosition();
      window.addEventListener('resize', handleResize);
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isOpen]);

  const handlePresetChange = (presetName) => {
    setActivePreset(presetName);
    setFilters(PRESETS[presetName]);
    onFilterChange(PRESETS[presetName]);
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    setActivePreset('custom'); // Switch to custom when manually adjusted
    onFilterChange(newFilters);
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="contrast-controls">
      <button 
        ref={buttonRef}
        className="btn btn-icon"
        onClick={togglePanel}
        title="Contrast Options"
        aria-expanded={isOpen}
        aria-controls="contrast-panel"
      >
        <span role="img" aria-label="Contrast">👁️</span>
      </button>
      
      {isOpen && (
        <div 
          ref={panelRef}
          id="contrast-panel"
          className={`contrast-panel ${panelPosition.above ? 'position-above' : ''} ${panelPosition.left ? 'position-left' : ''}`}
        >
          <h3>Contrast Settings</h3>
          
          <div className="presets">
            <p>Presets:</p>
            <div className="preset-buttons">
              {Object.keys(PRESETS).map(preset => (
                <button 
                  key={preset}
                  className={`btn btn-sm ${activePreset === preset ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handlePresetChange(preset)}
                >
                  {preset.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          
          <div className="filter-sliders">
            <div className="filter-control">
              <label htmlFor="contrast">Contrast: {filters.contrast}%</label>
              <input
                type="range"
                id="contrast"
                min="50"
                max="200"
                value={filters.contrast}
                onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
              />
            </div>
            
            <div className="filter-control">
              <label htmlFor="brightness">Brightness: {filters.brightness}%</label>
              <input
                type="range"
                id="brightness"
                min="50"
                max="150"
                value={filters.brightness}
                onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
              />
            </div>
            
            <div className="filter-control">
              <label htmlFor="grayscale">Grayscale: {filters.grayscale}%</label>
              <input
                type="range"
                id="grayscale"
                min="0"
                max="100"
                value={filters.grayscale}
                onChange={(e) => handleFilterChange('grayscale', parseInt(e.target.value))}
              />
            </div>
            
            <div className="filter-control">
              <label htmlFor="invert">Invert Colors: {filters.invert}%</label>
              <input
                type="range"
                id="invert"
                min="0"
                max="100"
                value={filters.invert}
                onChange={(e) => handleFilterChange('invert', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContrastControls;