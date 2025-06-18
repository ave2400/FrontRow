import React, { useState, useEffect } from "react";
import StreamingOnlyWebcamFeed from './StreamingOnlyWebcamFeed';
import "./AdminPage.css";
import { supabase } from '../supabaseClient.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminPage = () => {
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

  // Fetch all streams when component mounts
  useEffect(() => {
    const fetchAllStreams = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error(sessionError?.message || 'User not authenticated. Please sign in again.');
        }

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

      const response = await fetch(`${API_BASE_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify(newStream)
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

      const response = await fetch(`${API_BASE_URL}/api/streams/${editingStream.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify(editingStream)
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/streams/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (data.id) {
        setCurrentStream(data);
      }
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const handleStopStream = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE_URL}/api/streams/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setCurrentStream(null);
    } catch (error) {
      console.error('Error stopping stream:', error);
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
        
        {successMessage && <div className="success-message">{successMessage}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div className="streams-list">
          <h3>Existing Streams</h3>
          <table className="streams-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Stream ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {streamList.map(stream => (
                <tr key={stream.id}>
                  <td>{stream.name}</td>
                  <td>{stream.stream_id}</td>
                  <td>{stream.stream_type}</td>
                  <td>{stream.is_active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button
                      onClick={() => setEditingStream(stream)}
                      className="btn btn-secondary"
                      disabled={updating}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(stream.id, stream.is_active)}
                      className="btn btn-primary"
                      disabled={updating}
                    >
                      {stream.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(stream.id)}
                      className="btn btn-danger"
                      disabled={updating}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingStream ? (
          <div className="form-section">
            <h3>Edit Stream</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={editingStream.name}
                  onChange={handleEditInputChange}
                  disabled={updating}
                  required
                />
              </div>

              <div className="form-group">
                <label>Stream ID:</label>
                <input
                  type="text"
                  name="streamId"
                  value={editingStream.stream_id}
                  onChange={handleEditInputChange}
                  disabled={updating}
                  required
                />
              </div>

              <div className="form-group">
                <label>Stream Type:</label>
                <select
                  name="streamType"
                  value={editingStream.stream_type}
                  onChange={handleEditInputChange}
                  disabled={updating}
                >
                  <option value="youtube">YouTube</option>
                  <option value="zoom">Zoom</option>
                  <option value="local">Local</option>
                </select>
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
          <div className="form-section">
            <h3>Create New Stream</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newStream.name}
                  onChange={handleInputChange}
                  disabled={updating}
                  required
                />
              </div>

              <div className="form-group">
                <label>Stream ID:</label>
                <input
                  type="text"
                  name="streamId"
                  value={newStream.streamId}
                  onChange={handleInputChange}
                  disabled={updating}
                  required
                />
              </div>

              <div className="form-group">
                <label>Stream Type:</label>
                <select
                  name="streamType"
                  value={newStream.streamType}
                  onChange={handleInputChange}
                  disabled={updating}
                >
                  <option value="youtube">YouTube</option>
                  <option value="zoom">Zoom</option>
                  <option value="local">Local</option>
                </select>
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
          <h3>Local Stream Control</h3>
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

export default AdminPage;