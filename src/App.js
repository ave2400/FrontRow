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
  const [streamType, setStreamType] = useState("youtube"); // Default to YouTube
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

  // Fetch stream ID and type from Supabase
  useEffect(() => {
    console.log("Setting up stream config fetching...");
    let isActive = true; // Flag to prevent state updates after unmount
    
    const fetchStreamConfig = async () => {
      if (!isActive) return;
      
      setStreamLoading(true);
      try {
        console.log("Fetching stream ID from database...");
        const streamId = await streamService.getStreamId();
        console.log("Stream ID fetched:", streamId);
        
        console.log("Fetching stream type from database...");
        const streamType = await streamService.getStreamType();
        console.log("Stream type fetched:", streamType);
        
        if (isActive) {
          setStreamId(streamId);
          setStreamType(streamType);
          setStreamLoading(false);
        }
      } catch (error) {
        console.error("Error fetching stream config:", error);
        if (isActive) {
          setStreamLoading(false);
        }
      }
    };

    // Call fetch immediately
    fetchStreamConfig();

    return () => {
      isActive = false;
    };
  }, []);

  // Set up subscriptions for real-time stream updates
  useEffect(() => {
    console.log("Setting up real-time subscriptions...");
    
    // Set up subscription for stream ID changes
    const idSubscription = streamService.subscribeToStreamChanges((newStreamId) => {
      console.log("Stream ID updated in real-time:", newStreamId);
      setStreamId(newStreamId);
    });
    
    // Set up subscription for stream type changes
    const typeSubscription = streamService.subscribeToStreamTypeChanges((newStreamType) => {
      console.log("Stream type updated in real-time:", newStreamType);
      setStreamType(newStreamType);
    });

    // Cleanup function to unsubscribe
    return () => {
      console.log("Cleaning up stream subscriptions");
      idSubscription.unsubscribe?.();
      typeSubscription.unsubscribe?.();
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
    streamType,
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
                        streamType={streamType}
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
                currentStreamType={streamType}
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