import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import WebcamContainer from "./components/WebcamContainer";
import StickyNotes from "./components/StickyNotes";
import AIAssistant from "./components/AIAssistant";
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import AdminPage from './components/AdminPage';
import AdminOnly from './components/AdminOnly';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState({ title: "", content: "", images: [] });
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [streamLoading, setStreamLoading] = useState(true);

  // Fetch auth session
  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
      } catch (error) {
        console.error("Error getting session:", error);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth state changed:", session ? "User authenticated" : "User signed out");
        setSession(session);
      }
    );

    return () => subscription?.unsubscribe?.();
  }, []);

  // Fetch active streams for regular users
  useEffect(() => {
    console.log("Setting up streams fetching...");
    let isActive = true; // Flag to prevent state updates after unmount
    
    const fetchStreams = async () => {
      if (!isActive) return;
      
      setStreamLoading(true);
      try {
        const { data: { session: currentAuthSession }, error: sessionError } = await supabase.auth.getSession();
        let headers = { 'Content-Type': 'application/json' };
        if (currentAuthSession?.access_token) {
          headers['Authorization'] = `Bearer ${currentAuthSession.access_token}`;
        } else {
          console.warn("No active session token for fetching streams. Endpoint might fail if protected.");
        }

        const response = await fetch(`${API_BASE_URL}/api/streams`, {
          method: 'GET', 
          headers: headers,
          credentials: 'include'
        });

        if (!response.ok) throw new Error(`Failed to fetch streams, status: ${response.status}`);
        const streamsData = await response.json();
        console.log("Streams fetched from backend:", streamsData);

        if (isActive) {
          setStreams(streamsData);
          // If no stream is selected and we have streams, select the first one
          if (!selectedStreamId && streamsData.length > 0) {
            setSelectedStreamId(streamsData[0].id);
          }
          setStreamLoading(false);
        }
      } catch (error) {
        console.error("Error fetching streams:", error);
        if (isActive) {
          setStreamLoading(false);
        }
      }
    };

    // Call fetch immediately
    fetchStreams();

    // Set up polling for updates every 30 seconds
    const pollInterval = setInterval(fetchStreams, 30000);

    return () => {
      isActive = false;
      clearInterval(pollInterval);
    };
  }, [selectedStreamId]);

  const handleStreamSelect = (streamId) => {
    setSelectedStreamId(streamId);
  };

  const handleScreenshot = (blob) => {
    if (blob instanceof Blob) {
      setCurrentNote(prev => ({
        ...prev,
        images: [...(prev.images || []), blob]
      }));
    } else if (typeof blob === 'function') {
      // If it's a function, it's the callback from StickyNotes
      // We don't need to do anything with it
      return;
    } else {
      console.error('Invalid screenshot data received:', blob);
    }
  };

  // Debug render
  console.log("Rendering App with:", {
    isLoading: loading,
    hasSession: !!session,
    streams,
    selectedStreamId,
    isStreamLoading: streamLoading
  });

  if (loading) {
    return <div className="loading">Loading authentication...</div>;
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <div className="app-container">
                  <div className="header">
                    <h1>FrontRow Notes</h1>
                    <div className="header-buttons">
                      <button
                        className="btn btn-danger"
                        onClick={() => supabase.auth.signOut()}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                  <div className="main-content">
                    {streamLoading ? (
                      <div className="stream-loading">Loading stream settings...</div>
                    ) : (
                      <WebcamContainer
                        onScreenshot={handleScreenshot}
                        streams={streams}
                        selectedStreamId={selectedStreamId}
                        onStreamSelect={handleStreamSelect}
                        isLoading={false}
                      />
                    )}
                    <StickyNotes
                      currentNote={currentNote}
                      setCurrentNote={setCurrentNote}
                      onScreenshot={handleScreenshot}
                    />
                    <AIAssistant currentNote={currentNote} />
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
              <AdminOnly>
                <AdminPage />
              </AdminOnly>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;