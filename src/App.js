import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import WebcamContainer from "./components/WebcamContainer";
import StickyNotes from "./components/StickyNotes";
import Auth from './components/Auth';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState({ title: "", content: "", images: [] });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      {!session ? (
        <Auth />
      ) : (
        <div className="app-container">
          <div className="header">
            <h1>FrontRow Notes</h1>
            <button
              className="btn btn-danger"
              onClick={() => supabase.auth.signOut()}
            >
              Sign Out
            </button>
          </div>
          <div className="main-content">
            <WebcamContainer onScreenshot={handleScreenshot} />
            <StickyNotes 
              currentNote={currentNote} 
              setCurrentNote={setCurrentNote} 
              onScreenshot={handleScreenshot}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
