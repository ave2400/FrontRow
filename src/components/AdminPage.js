import React, { useState, useEffect } from "react";
import "./AdminPage.css"; // You'll need to create this CSS file

const AdminPage = ({ onStreamIdSubmit, currentStreamId }) => {
  // Initialize with currentStreamId if provided
  const [streamId, setStreamId] = useState(currentStreamId || "");
  const [successMessage, setSuccessMessage] = useState("");

  // Update local state if prop changes
  useEffect(() => {
    if (currentStreamId !== undefined) {
      setStreamId(currentStreamId);
    }
  }, [currentStreamId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onStreamIdSubmit) {
      onStreamIdSubmit(streamId);
      console.log("Admin: Stream ID set to:", streamId);
      
      // Show success message
      setSuccessMessage("Stream ID saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h2>Admin Stream Settings</h2>
        
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
              />
              <button type="submit" className="submit-btn">Save Stream ID</button>
            </div>
            <p className="help-text">
              For example, if your YouTube URL is https://www.youtube.com/watch?v=dQw4w9WgXcQ, 
              the Stream ID is <code>dQw4w9WgXcQ</code>
            </p>
          </div>
          
          {successMessage && (
            <div className="success-message">{successMessage}</div>
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