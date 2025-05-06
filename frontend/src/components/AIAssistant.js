import React, { useState, useEffect, useRef } from 'react';
import './AIAssistant.css';

const AI_ASSISTANT_API_URL = `${process.env.REACT_APP_BACKEND}/api/ai/assistant`;
// console.log(`HELLO LOOK AT ME, this is BACKEND: ${process.env.REACT_APP_BACKEND}`);

const AIAssistant = ({ currentNote }) => {
  const [showAssistant, setShowAssistant] = useState(false);
  const [detectedConcept, setDetectedConcept] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null); 
  const [lastCheckedContent, setLastCheckedContent] = useState("");

  const debounceTimeoutRef = useRef(null);

  // Debug log to check if component is receiving currentNote
  // useEffect(() => {
  //   console.log('AIAssistant received currentNote:', currentNote);
  // }, [currentNote]);

  // Function to call backend to mark concept as shown (for cooldown)
  const markConceptAsShownOnBackend = async (conceptToMark) => {
    if (!conceptToMark || !conceptToMark.name) return;
    try {
      await fetch(AI_ASSISTANT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markConceptAsShown', concept: conceptToMark }),
      });
      console.log(`Marked concept ${conceptToMark.name} as shown on backend.`);
    } catch (error) {
      console.error('Error marking concept as shown on backend:', error);
    }
  };

  // Monitor note content for concepts with Debouncing
  useEffect(() => {
    const noteContent = currentNote?.content;

    if (typeof noteContent !== 'string') { // Ensure noteContent is a string
        // console.log('No valid note content to check or content has not changed.');
        // If the assistant is showing for a previous concept but content is cleared, hide it.
        if (showAssistant && (!noteContent || noteContent.trim() === "")) {
            setShowAssistant(false);
            setDetectedConcept(null);
            setResponse(null);
        }
        return;
    }
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (noteContent === lastCheckedContent && showAssistant) {
        // Content hasn't changed and assistant is already showing a relevant concept, do nothing.
        // Or if content is same and no concept was detected before, also do nothing.
        return;
      }
      // console.log('Debounced: Checking concepts for note content:', noteContent);
      // console.log('Previous content was:', lastCheckedContent);

      // Hide assistant if content is empty, before making API call
      if (noteContent.trim() === "") {
        setShowAssistant(false);
        setDetectedConcept(null);
        setResponse(null);
        setLastCheckedContent(noteContent); // Update last checked content
        return;
      }


      setIsLoading(true);
      try {
        const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'checkConcepts',
            content: noteContent,
            lastContent: lastCheckedContent // Send the previous content
          }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.text();
          throw new Error(`Failed to check concepts: ${apiResponse.status} ${errorData}`);
        }

        const data = await apiResponse.json();
        // console.log('API response for concept check:', data);

        if (data.detectedConcept) {
          // Only update if it's a new concept or if the assistant was hidden
          if (!detectedConcept || detectedConcept.name !== data.detectedConcept.name || !showAssistant) {
            setDetectedConcept(data.detectedConcept);
            setShowAssistant(true);
            setResponse(null); // Clear previous explanation/question
            markConceptAsShownOnBackend(data.detectedConcept); // Tell backend for cooldown
          }
        } else {
          // No concept detected. If one was showing, hide it.
          if (showAssistant) { // only hide if it was previously showing
            setShowAssistant(false);
            setDetectedConcept(null);
            setResponse(null);
          }
        }
      } catch (error) {
        console.error('Error checking concepts:', error);
        // Optionally hide assistant on error or show error message
         setShowAssistant(false);
         setDetectedConcept(null);
      } finally {
        setIsLoading(false);
        setLastCheckedContent(noteContent); // Update last checked content AFTER processing
      }
    }, 750); // 750ms debounce delay

    // Cleanup timeout on component unmount or if currentNote.content changes again before timeout
    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };

  }, [currentNote?.content]); // Re-run effect when note content changes


  const handleYes = async () => {
    if (!detectedConcept) return;
    setIsLoading(true);
    setResponse(null); // Clear previous response
    try {
      const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getExplanation', concept: detectedConcept }),
      });
      if (!apiResponse.ok) throw new Error('Failed to get explanation');
      const data = await apiResponse.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error getting explanation:', error);
      setResponse("Sorry, I couldn't fetch the explanation right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeQuestion = async () => {
    if (!detectedConcept) return;
    setIsLoading(true);
    setResponse(null); // Clear previous response
    try {
      const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getPracticeQuestion', concept: detectedConcept }),
      });
      if (!apiResponse.ok) throw new Error('Failed to get practice question');
      const data = await apiResponse.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error getting practice question:', error);
      setResponse("Sorry, I couldn't fetch a practice question right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAndReset = () => {
    setShowAssistant(false);
    setDetectedConcept(null); // Important to allow re-detection of same concept if context changes
    setResponse(null);
  }

  if (!showAssistant || !detectedConcept) return null;

  return (
    <div className="ai-assistant">
      <div className="ai-assistant-content">
        {!response ? (
          <>
            <p>{detectedConcept.prompt} (Similarity: {detectedConcept.similarity?.toFixed(2)})</p>
            <div className="ai-assistant-buttons">
              <button onClick={handleYes} disabled={isLoading}>
                Explain
              </button>
              <button onClick={handlePracticeQuestion} disabled={isLoading}>
                Practice Question
              </button>
               <button onClick={handleCloseAndReset} disabled={isLoading}> {/* Changed this button */}
                No Thanks
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ai-response" dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br />') }}>
              {/* Using dangerouslySetInnerHTML if your response might contain HTML/newlines for formatting. Be careful if content isn't trusted. */}
              {/* Fallback: {response} */}
            </div>
            <button className="close-response" onClick={handleCloseAndReset}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;