import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription?.unsubscribe?.();
  }, []);

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

      setStreams(prevStreams => {
        if (JSON.stringify(prevStreams) === JSON.stringify(streamsData)) {
          return prevStreams;
        }
        return streamsData;
      });

      if (!selectedStreamId && streamsData.length > 0) {
        setSelectedStreamId(streamsData[0].id);
      }
      setStreamLoading(false);
    } catch (error) {
      console.error("Error fetching streams:", error);
      setStreamLoading(false);
    }
  }, [selectedStreamId]);

  // Fetch active streams for regular users
  useEffect(() => {
    let isActive = true;
    
    fetchStreams();

    const pollInterval = setInterval(() => {
      if (isActive) {
        fetchStreams();
      }
    }, 30000);

    return () => {
      isActive = false;
      clearInterval(pollInterval);
    };
  }, [fetchStreams]);

  const handleStreamSelect = useCallback((streamId) => {
    setSelectedStreamId(streamId);
  }, []);

  const handleScreenshot = useCallback((blob) => {
    if (blob instanceof Blob) {
      setCurrentNote(prev => ({
        ...prev,
        images: [...(prev.images || []), blob]
      }));
    } else if (typeof blob === 'function') {
      return;
    } else {
      console.error('Invalid screenshot data received:', blob);
    }
  }, []);

  const selectedStream = useMemo(() => 
    streams.find(s => s.id === selectedStreamId) || null,
    [streams, selectedStreamId]
  );

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