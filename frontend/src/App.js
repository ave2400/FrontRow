import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import WebcamContainer from "./components/WebcamContainer";
import StickyNotes from "./components/StickyNotes";
import AIAssistant from "./components/AIAssistant";
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import AdminPage from './components/AdminPage';
import StreamingOnlyWebcamFeed from './components/StreamingOnlyWebcamFeed';
// import AdminOnly from './components/AdminOnly';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentStream, setCurrentStream] = useState(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState({ title: "", content: "", images: [] });
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState("");

  // Fetch auth session
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setStreamLoading(false);
      } catch (error) {
        console.error("Error getting session:", error);
        setStreamLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription?.unsubscribe?.();
  }, []);

  // Check admin status when session changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/users/admin-status`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    };

    checkAdminStatus();
  }, [session]);

  // Memoize the fetch streams function
  const fetchStreams = useCallback(async () => {
    try {
      const { data: { session: currentAuthSession } } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
        ...(currentAuthSession?.access_token && {
          'Authorization': `Bearer ${currentAuthSession.access_token}`
        })
      };

      const response = await fetch(`${API_BASE_URL}/api/streams`, {
        method: 'GET', 
        headers,
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`Failed to fetch streams, status: ${response.status}`);
      const streamsData = await response.json();
      setStreams(streamsData);
      
      // If no stream is selected and we have streams, select the first one
      if (!selectedStreamId && streamsData.length > 0) {
        setSelectedStreamId(streamsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching streams:", error);
    }
  }, [selectedStreamId]);

  // Fetch streams on mount and set up polling
  useEffect(() => {
    fetchStreams();
    const pollInterval = setInterval(fetchStreams, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchStreams]);

  // Memoize stream handlers
  const handleStartStream = useCallback(async () => {
    if (!session?.user) return;

    try {
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
  }, [session]);

  const handleStopStream = useCallback(async () => {
    if (!session?.user) return;

    try {
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
  }, [session]);

  // Memoize the stream selection handler
  const handleStreamSelect = useCallback((streamId) => {
    setSelectedStreamId(streamId);
  }, []);

  // Memoize the screenshot handler
  const handleScreenshot = useCallback((screenshotData) => {
    setCurrentNote(prev => ({
      ...prev,
      images: [...prev.images, screenshotData]
    }));
  }, []);

  if (streamLoading) {
    return <div className="loading">Loading stream settings...</div>;
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <div className="main-content">
                  <WebcamContainer
                    onScreenshot={handleScreenshot}
                    streams={streams}
                    selectedStreamId={selectedStreamId}
                    onStreamSelect={handleStreamSelect}
                    isLoading={streamLoading}
                  />
                  <div className="sidebar">
                    <StickyNotes
                      currentNote={currentNote}
                      setCurrentNote={setCurrentNote}
                    />
                    <AIAssistant />
                  </div>
                </div>
              ) : (
                <Navigate to="/signin" replace />
              )
            }
          />
          <Route
            path="/signin"
            element={
              !session ? (
                <SignIn />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/signup"
            element={
              !session ? (
                <SignUp />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              session ? (
                isAdmin ? (
                  <AdminPage />
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/signin" replace />
              )
            }
          />
        </Routes>
      </Router>
      
      {session && (
        <div className="stream-container">
          <StreamingOnlyWebcamFeed
            isAdmin={isAdmin}
            isLoading={streamLoading}
            streamId={currentStream?.id}
            streamType={currentStream?.stream_type || 'local'}
          />
          
          {isAdmin && (
            <div className="stream-controls">
              {currentStream ? (
                <button onClick={handleStopStream} className="btn btn-danger">
                  Stop Stream
                </button>
              ) : (
                <button onClick={handleStartStream} className="btn btn-primary">
                  Start Stream
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;