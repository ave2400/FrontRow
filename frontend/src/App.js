import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { supabase } from './supabaseClient';
import WebcamContainer from "./components/WebcamContainer";
import StickyNotes from "./components/StickyNotes";
import AIAssistant from "./components/AIAssistant";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import AdminPage from "./components/AdminPage";
import AdminOnly from "./components/AdminOnly";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState({
    title: "",
    content: "",
    images: [],
  });
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [panelLayout, setPanelLayout] = useState(() => {
    const savedLayout = localStorage.getItem('frontrow-panel-layout');
    return savedLayout ? JSON.parse(savedLayout) : [50, 50]; 
  });

  // Fetch auth session
  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setStreamLoading(false);
      } catch (error) {
        console.error("Error getting session:", error);
        setStreamLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe?.();
  }, []);

  // Check admin status when session changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          // Only show loading on initial load
          if (!hasInitiallyLoaded) {
            setAdminLoading(true);
          }
          // console.log('Checking admin status for user:', session.user.id);
          const response = await fetch(
            `${API_BASE_URL}/api/users/admin-status`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          if (!response.ok) {
            // console.error('Admin status check failed:', response.status, response.statusText);
            setIsAdmin(false);
            setAdminLoading(false);
            setHasInitiallyLoaded(true);
            return;
          }

          const data = await response.json();
          // console.log('Admin status response:', data);
          setIsAdmin(data.isAdmin);
          setAdminLoading(false);
          setHasInitiallyLoaded(true);
        } catch (error) {
          // console.error('Error checking admin status:', error);
          setIsAdmin(false);
          setAdminLoading(false);
          setHasInitiallyLoaded(true);
        }
      } else {
        // Only reset admin status if there's no session
        setIsAdmin(false);
        setAdminLoading(false);
        setHasInitiallyLoaded(true);
      }
    };

    // Check admin status if we haven't loaded or if we need to verify admin status
    if (!hasInitiallyLoaded || (session?.user && isAdmin === false)) {
      // console.log('Admin status check triggered - hasInitiallyLoaded:', hasInitiallyLoaded, 'isAdmin:', isAdmin);
      checkAdminStatus();
    } else {
      // console.log('Admin status check skipped - hasInitiallyLoaded:', hasInitiallyLoaded, 'isAdmin:', isAdmin);
    }
  }, [session, hasInitiallyLoaded]);

  // Memoize the fetch streams function
  const fetchStreams = useCallback(async () => {
    try {
      const {
        data: { session: currentAuthSession },
      } = await supabase.auth.getSession();
      const headers = {
        "Content-Type": "application/json",
        ...(currentAuthSession?.access_token && {
          Authorization: `Bearer ${currentAuthSession.access_token}`,
        }),
      };

      const response = await fetch(`${API_BASE_URL}/api/streams`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok)
        throw new Error(`Failed to fetch streams, status: ${response.status}`);
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

  // Memoize the screenshot handler
  const handleScreenshot = useCallback((screenshotData) => {
    setCurrentNote((prev) => ({
      ...prev,
      images: [...prev.images, screenshotData],
    }));
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleLayoutChange = useCallback((layout) => {
    setPanelLayout(layout);
    localStorage.setItem('frontrow-panel-layout', JSON.stringify(layout));
  }, []);

  if ((streamLoading || adminLoading) && !hasInitiallyLoaded) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <>
                  <header className="app-header">
                    <h1>FrontRow Notes</h1>
                    <div className="header-actions">
                      <AdminOnly>
                        <Link
                          to="/admin"
                          className="admin-link"
                          style={{
                            backgroundColor: "#6c63ff",
                            color: "white",
                            textDecoration: "none",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            marginRight: "10px",
                            fontSize: "14px",
                          }}
                        >
                          Admin Panel
                        </Link>
                      </AdminOnly>
                      <button
                        onClick={handleSignOut}
                        className="sign-out-btn"
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </header>
                  <div className="main-content">
                    {streamLoading ? (
                      <div className="stream-loading">Loading stream settings...</div>
                    ) : (
                      <PanelGroup
                        direction="horizontal"
                        className="panel-group"
                        onLayout={handleLayoutChange}
                      >
                        <Panel defaultSize={panelLayout[0]} minSize={20} className="panel">
                          <WebcamContainer
                            onScreenshot={handleScreenshot}
                            streams={streams}
                            selectedStreamId={selectedStreamId}
                            onStreamSelect={setSelectedStreamId}
                            isLoading={streamLoading}
                            isAdmin={false}
                          />
                        </Panel>
                        <PanelResizeHandle className="resize-handle" />
                        <Panel defaultSize={panelLayout[1]} minSize={0} className="panel">
                          <div className="notes-section">
                            <StickyNotes
                              currentNote={currentNote}
                              setCurrentNote={setCurrentNote}
                              onScreenshot={handleScreenshot}
                            />
                          </div>
                        </Panel>
                      </PanelGroup>
                    )}
                    <AIAssistant currentNote={currentNote} />
                  </div>
                </>
              ) : (
                <Navigate to="/signin" replace />
              )
            }
          />
          <Route
            path="/signin"
            element={!session ? <SignIn /> : <Navigate to="/" replace />}
          />
          <Route
            path="/signup"
            element={!session ? <SignUp /> : <Navigate to="/" replace />}
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
