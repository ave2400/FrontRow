import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { streamService } from './services/streamService';
import WebcamContainer from "./components/WebcamContainer";
import StickyNotes from "./components/StickyNotes";
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import AdminPage from './components/AdminPage';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState({ title: "", content: "", images: [] });
  const [streamId, setStreamId] = useState("");
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

  // Fetch stream ID from Supabase and subscribe to changes
  useEffect(() => {
    console.log("Setting up stream ID fetching and subscription...");
    let isActive = true; // Flag to prevent state updates after unmount
    
    const fetchStreamId = async () => {
      if (!isActive) return;
      
      setStreamLoading(true);
      try {
        console.log("Fetching stream ID from database...");
        const id = await streamService.getStreamId();
        console.log("Stream ID fetched:", id);
        
        if (isActive) {
          setStreamId(id);
          setStreamLoading(false);
        }
      } catch (error) {
        console.error("Error fetching stream ID:", error);
        if (isActive) {
          setStreamLoading(false);
        }
      }
    };

    // Call fetch immediately
    fetchStreamId();

    // Set up subscription for real-time updates
    console.log("Setting up real-time subscription...");
    let subscription;
    try {
      subscription = streamService.subscribeToStreamChanges((newStreamId) => {
        console.log("Stream ID updated in real-time:", newStreamId);
        if (isActive) {
          setStreamId(newStreamId);
        }
      });
    } catch (error) {
      console.error("Error setting up subscription:", error);
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up stream ID subscription");
      isActive = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

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
    streamId, 
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
                        streamId={streamId} 
                        isLoading={false}
                      />
                    )}
                    <StickyNotes 
                      currentNote={currentNote} 
                      setCurrentNote={setCurrentNote} 
                      onScreenshot={handleScreenshot}
                    />
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
              <AdminPage 
                currentStreamId={streamId} 
                isLoading={streamLoading}
              />
            } 
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;