import React, { useState, useEffect, memo } from "react";
import StreamingOnlyWebcamFeed from './StreamingOnlyWebcamFeed';
import "./AdminPage.css";
import { supabase } from '../supabaseClient.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminPage = () => {
  console.log('AdminPage component is mounting...');
  
  const [streamList, setStreamList] = useState([]);
  const [newStream, setNewStream] = useState({
    name: '',
    streamId: '',
    streamType: 'youtube',
    isActive: false
  });
  const [editingStream, setEditingStream] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [updating, setUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStream, setCurrentStream] = useState(null);
  const [cameraAccessGranted, setCameraAccessGranted] = useState(false);
  const [adminStatus, setAdminStatus] = useState(null);

  // Fetch all streams when component mounts
  useEffect(() => {
    console.log('AdminPage useEffect running - fetching streams...');
    const fetchAllStreams = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error(sessionError?.message || 'User not authenticated. Please sign in again.');
        }

        // Set admin status since we know user is admin if they reached this page
        setAdminStatus({ isAdmin: true });

        const response = await fetch(`${API_BASE_URL}/api/streams/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch streams, status: ${response.status}`);
        }

        const streamsData = await response.json();
        setStreamList(streamsData);
      } catch (error) {
        console.error("Error fetching streams:", error);
        setErrorMessage(error.message || "Failed to fetch streams");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStreams();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStream(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingStream(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRequestCameraAccess = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Stop the stream immediately after testing access
      mediaStream.getTracks().forEach(track => track.stop());
      
      setCameraAccessGranted(true);
      setSuccessMessage("Camera and microphone access granted!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setErrorMessage('Failed to access camera and microphone. Please ensure you have granted the necessary permissions.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSuccessMessage("");
      setErrorMessage("");
      setUpdating(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'User not authenticated. Please sign in again.');
      }

      const accessToken = session.access_token;

      // For local streams, we don't need a streamId
      const streamData = {
        ...newStream,
        streamId: newStream.streamType === 'local' ? 'local-stream' : newStream.streamId
      };

      const response = await fetch(`${API_BASE_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify(streamData)
      });

      if (!response.ok) {
        let errorDetails = `Failed to create stream. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorDetails = errorData.message;
          }
        } catch (e) {
          console.warn("Could not parse error response as JSON", e);
        }
        throw new Error(errorDetails);
      }

      const createdStream = await response.json();
      setStreamList(prev => [...prev, createdStream]);
      setNewStream({
        name: '',
        streamId: '',
        streamType: 'youtube',
        isActive: false
      });
      setSuccessMessage("Stream created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error creating stream:", error);
      setErrorMessage(error.message || "An error occurred. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setSuccessMessage("");
      setErrorMessage("");
      setUpdating(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'User not authenticated. Please sign in again.');
      }

      const accessToken = session.access_token;

      // For local streams, we don't need a streamId
      const streamData = {
        ...editingStream,
        streamId: editingStream.stream_type === 'local' ? 'local-stream' : editingStream.stream_id
      };

      const response = await fetch(`${API_BASE_URL}/api/streams/${editingStream.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify(streamData)
      });

      if (!response.ok) {
        let errorDetails = `Failed to update stream. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorDetails = errorData.message;
          }
        } catch (e) {
          console.warn("Could not parse error response as JSON", e);
        }
        throw new Error(errorDetails);
      }

      setStreamList(prev => prev.map(s => s.id === editingStream.id ? editingStream : s));
      setEditingStream(null);
      setSuccessMessage("Stream updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating stream:", error);
      setErrorMessage(error.message || "An error occurred. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (streamId) => {
    if (!window.confirm('Are you sure you want to delete this stream?')) {
      return;
    }

    try {
      setSuccessMessage("");
      setErrorMessage("");
      setUpdating(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'User not authenticated. Please sign in again.');
      }

      const accessToken = session.access_token;

      const response = await fetch(`${API_BASE_URL}/api/streams/${streamId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        let errorDetails = `Failed to delete stream. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorDetails = errorData.message;
          }
        } catch (e) {
          console.warn("Could not parse error response as JSON", e);
        }
        throw new Error(errorDetails);
      }

      setStreamList(prev => prev.filter(s => s.id !== streamId));
      setSuccessMessage("Stream deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting stream:", error);
      setErrorMessage(error.message || "An error occurred. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (streamId, currentStatus) => {
    try {
      setSuccessMessage("");
      setErrorMessage("");
      setUpdating(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(sessionError?.message || 'User not authenticated. Please sign in again.');
      }

      const accessToken = session.access_token;

      const response = await fetch(`${API_BASE_URL}/api/streams/${streamId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        let errorDetails = `Failed to toggle stream status. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorDetails = errorData.message;
          }
        } catch (e) {
          console.warn("Could not parse error response as JSON", e);
        }
        throw new Error(errorDetails);
      }

      setStreamList(prev => prev.map(s => 
        s.id === streamId ? { ...s, is_active: !currentStatus } : s
      ));
      setSuccessMessage("Stream status updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error toggling stream status:", error);
      setErrorMessage(error.message || "An error occurred. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleStartStream = async () => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/streams/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to start stream: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.id) {
        setCurrentStream(data);
        setSuccessMessage("Stream started successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      setErrorMessage(error.message || "Failed to start stream");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleStopStream = async () => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/streams/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to stop stream: ${response.status}`);
      }
      
      setCurrentStream(null);
      setSuccessMessage("Stream stopped successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Error stopping stream:', error);
      setErrorMessage(error.message || "Failed to stop stream");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <h2>Stream Management</h2>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h2>Stream Management</h2>
        
        {/* Debug section */}
        <div className="debug-section" style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '10px', 
          marginBottom: '20px', 
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h4>Debug Info:</h4>
          <p><strong>Admin Status:</strong> {adminStatus ? JSON.stringify(adminStatus) : 'Loading...'}</p>
          <p><strong>Is Admin:</strong> {adminStatus?.isAdmin ? 'Yes' : 'No'}</p>
          {adminStatus?.error && <p><strong>Error:</strong> {adminStatus.error}</p>}
        </div>
        
        {successMessage && <div className="success-message">{successMessage}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div className="streams-list">
          <h3>Active Streams</h3>
          {streamList.length === 0 ? (
            <p>No streams configured yet.</p>
          ) : (
            <table className="streams-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {streamList.map(stream => (
                  <tr key={stream.id}>
                    <td>{stream.name}</td>
                    <td>{stream.stream_type}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${stream.is_active ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => handleToggleActive(stream.id, stream.is_active)}
                        disabled={updating}
                      >
                        {stream.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => setEditingStream(stream)}
                        className="btn btn-sm btn-primary"
                        disabled={updating}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(stream.id)}
                        className="btn btn-sm btn-danger"
                        disabled={updating}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editingStream ? (
          <div className="edit-stream-form">
            <h3>Edit Stream</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label htmlFor="name">Stream Name:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editingStream.name}
                  onChange={handleEditInputChange}
                  required
                  disabled={updating}
                />
              </div>

              <div className="form-group">
                <label htmlFor="streamType">Stream Type:</label>
                <select
                  id="streamType"
                  name="streamType"
                  value={editingStream.stream_type}
                  onChange={handleEditInputChange}
                  disabled={updating}
                >
                  <option value="youtube">YouTube Stream</option>
                  <option value="zoom">Zoom Meeting</option>
                  <option value="local">Local</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="streamId">Stream ID/URL:</label>
                {editingStream.stream_type === 'local' ? (
                  <div className="local-stream-input">
                    <p className="local-stream-note">Local streams don't require a URL. Click the button below to request camera access.</p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRequestCameraAccess}
                      disabled={updating}
                    >
                      Request Camera & Microphone Access
                    </button>
                    {cameraAccessGranted && (
                      <p className="access-granted">✓ Camera and microphone access granted</p>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    id="streamId"
                    name="streamId"
                    value={editingStream.stream_id}
                    onChange={handleEditInputChange}
                    placeholder={editingStream.stream_type === 'youtube' ? 
                      "Enter YouTube Stream ID (e.g., dQw4w9WgXcQ)" : 
                      "Enter Zoom Meeting URL (from 'Join from browser' link)"}
                    required={editingStream.stream_type !== 'local'}
                    disabled={updating}
                  />
                )}
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={editingStream.is_active}
                    onChange={handleEditInputChange}
                    disabled={updating}
                  />
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Updating...' : 'Update Stream'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingStream(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="new-stream-form">
            <h3>Add New Stream</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="newName">Stream Name:</label>
                <input
                  type="text"
                  id="newName"
                  name="name"
                  value={newStream.name}
                  onChange={handleInputChange}
                  required
                  disabled={updating}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newStreamType">Stream Type:</label>
                <select
                  id="newStreamType"
                  name="streamType"
                  value={newStream.streamType}
                  onChange={handleInputChange}
                  disabled={updating}
                >
                  <option value="youtube">YouTube Stream</option>
                  <option value="zoom">Zoom Meeting</option>
                  <option value="local">Local</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="newStreamId">Stream ID/URL:</label>
                {newStream.streamType === 'local' ? (
                  <div className="local-stream-input">
                    <p className="local-stream-note">Local streams don't require a URL. Click the button below to request camera access.</p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRequestCameraAccess}
                      disabled={updating}
                    >
                      Request Camera & Microphone Access
                    </button>
                    {cameraAccessGranted && (
                      <p className="access-granted">✓ Camera and microphone access granted</p>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    id="newStreamId"
                    name="streamId"
                    value={newStream.streamId}
                    onChange={handleInputChange}
                    placeholder={newStream.streamType === 'youtube' ? 
                      "Enter YouTube Stream ID (e.g., dQw4w9WgXcQ)" : 
                      "Enter Zoom Meeting URL (from 'Join from browser' link)"}
                    required={newStream.streamType !== 'local'}
                    disabled={updating}
                  />
                )}
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={newStream.isActive}
                    onChange={handleInputChange}
                    disabled={updating}
                  />
                  Active
                </label>
              </div>

              <button type="submit" className="btn btn-primary" disabled={updating}>
                {updating ? 'Creating...' : 'Create Stream'}
              </button>
            </form>
          </div>
        )}

        <div className="stream-container">
          <StreamingOnlyWebcamFeed
            isAdmin={true}
            isLoading={isLoading}
            streamId={currentStream?.id}
            streamType="local"
          />
          
          <div className="stream-controls">
            {currentStream ? (
              <button 
                onClick={handleStopStream} 
                className="btn btn-danger"
              >
                Stop Stream
              </button>
            ) : (
              <button 
                onClick={handleStartStream} 
                className="btn btn-primary"
              >
                Start Stream
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(AdminPage);