import React, { useState, useEffect } from "react";
import { streamService } from "../services/streamService";
import "./AdminPage.css";

const AdminPage = ({ currentStreamId, isLoading }) => {
  const [streamId, setStreamId] = useState(currentStreamId || "");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [updating, setUpdating] = useState(false);

  // Update local state if prop changes
  useEffect(() => {
    if (currentStreamId !== undefined) {
      setStreamId(currentStreamId);
    }
  }, [currentStreamId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSuccessMessage("");
      setErrorMessage("");
      setUpdating(true);
      
      // Call the streamService directly
      const success = await streamService.updateStreamId(streamId);
      
      if (success) {
        setSuccessMessage("Stream ID saved successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage("Failed to update stream ID. Please try again.");
      }
    } catch (error) {
      console.error("Error updating stream ID:", error);
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

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h2>Stream Settings</h2>
        
        {streamId && (
          <div className="stream-preview">
            <h3>Stream Preview</h3>
            <div className="preview-container">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${streamId}?autoplay=0`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="stream-form">
          <div className="form-group">
            <label htmlFor="streamId">YouTube Stream ID:</label>
            <div className="input-group">
              <input
                id="streamId"
                type="text"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder="Enter YouTube Stream ID (e.g., dQw4w9WgXcQ)"
                required
                disabled={updating}
              />
              <button 
                type="submit" 
                className="submit-btn"
                disabled={updating}
              >
                {updating ? "Saving..." : "Save Stream ID"}
              </button>
            </div>
            <p className="help-text">
              For example, if your YouTube URL is https://www.youtube.com/watch?v=dQw4w9WgXcQ, 
              the Stream ID is <code>dQw4w9WgXcQ</code>
            </p>
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