import React, { useState, useEffect } from "react";
import { streamService } from "../services/streamService";
import "./AdminPage.css";

const AdminPage = ({ currentStreamId, currentStreamType, isLoading }) => {
  const [streamId, setStreamId] = useState(currentStreamId || "");
  const [streamType, setStreamType] = useState(currentStreamType || "youtube");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [updating, setUpdating] = useState(false);

  // Update local state if props change
  useEffect(() => {
    if (currentStreamId !== undefined) {
      setStreamId(currentStreamId);
    }
    if (currentStreamType !== undefined) {
      setStreamType(currentStreamType);
    }
  }, [currentStreamId, currentStreamType]);

  // If streamType isn't provided by props, fetch it
  useEffect(() => {
    const fetchStreamType = async () => {
      if (currentStreamType === undefined) {
        try {
          const type = await streamService.getStreamType();
          setStreamType(type);
        } catch (error) {
          console.error("Error fetching stream type:", error);
        }
      }
    };

    fetchStreamType();
  }, [currentStreamType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSuccessMessage("");
      setErrorMessage("");
      setUpdating(true);
      
      // Call the streamService to update settings
      const success = await streamService.updateStreamConfig(streamId, streamType);
      
      if (success) {
        setSuccessMessage("Stream settings saved successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage("Failed to update stream settings. Please try again.");
      }
    } catch (error) {
      console.error("Error updating stream settings:", error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <h2>Stream Settings</h2>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  // Preview component based on stream type
  const renderPreview = () => {
    if (!streamId) return null;
    
    if (streamType === "youtube") {
      return (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${streamId}?autoplay=0`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    } else if (streamType === "zoom") {
      return (
        <iframe
          width="100%"
          height="100%"
          src={streamId}
          frameBorder="0"
          allow="microphone; camera; autoplay; fullscreen; display-capture"
          allowFullScreen
        ></iframe>
      );
    }
    
    return <div>Unknown stream type</div>;
  };

  // Help text based on stream type
  const getHelpText = () => {
    if (streamType === "youtube") {
      return (
        <p className="help-text">
          For example, if your YouTube URL is https://www.youtube.com/watch?v=dQw4w9WgXcQ, 
          the Stream ID is <code>dQw4w9WgXcQ</code>
        </p>
      );
    } else if (streamType === "zoom") {
      return (
        <p className="help-text">
          Enter the full Zoom meeting URL from the "Join from your browser" link. For example: 
          <code>https://zoom.us/wc/join/1234567890?pwd=abcdef</code>
        </p>
      );
    }
    
    return null;
  };

  // Input label based on stream type
  const getInputLabel = () => {
    if (streamType === "youtube") {
      return "YouTube Stream ID:";
    } else if (streamType === "zoom") {
      return "Zoom Meeting URL:";
    }
    
    return "Stream ID:";
  };

  // Input placeholder based on stream type
  const getInputPlaceholder = () => {
    if (streamType === "youtube") {
      return "Enter YouTube Stream ID (e.g., dQw4w9WgXcQ)";
    } else if (streamType === "zoom") {
      return "Enter Zoom Meeting URL (from 'Join from browser' link)";
    }
    
    return "Enter Stream ID";
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h2>Stream Settings</h2>
        
        {streamId && (
          <div className="stream-preview">
            <h3>Stream Preview</h3>
            <div className="preview-container">
              {renderPreview()}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="stream-form">
          <div className="form-group">
            <label htmlFor="streamType">Stream Type:</label>
            <select
              id="streamType"
              value={streamType}
              onChange={(e) => setStreamType(e.target.value)}
              disabled={updating}
              className="stream-type-select"
            >
              <option value="youtube">YouTube Stream</option>
              <option value="zoom">Zoom Meeting</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="streamId">{getInputLabel()}</label>
            <div className="input-group">
              <input
                id="streamId"
                type="text"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder={getInputPlaceholder()}
                required
                disabled={updating}
              />
              <button 
                type="submit" 
                className="submit-btn"
                disabled={updating}
              >
                {updating ? "Saving..." : "Save Stream Settings"}
              </button>
            </div>
            {getHelpText()}
          </div>
          
          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}
          
          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}
        </form>
        
        <div className="admin-actions">
          <a href="/" className="back-link">Back to Main Page</a>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;