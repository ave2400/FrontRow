import React, { useState, useEffect } from 'react';
import './AIAssistant.css';

const API_URL = 'http://localhost:5000/api/ai/assistant';

const AIAssistant = ({ currentNote }) => {
  const [showAssistant, setShowAssistant] = useState(false);
  const [detectedConcept, setDetectedConcept] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);

  // Debug log to check if component is receiving currentNote
  useEffect(() => {
    console.log('AIAssistant received currentNote:', currentNote);
  }, [currentNote]);

  // Monitor note content for concepts
  useEffect(() => {
    const checkForConcepts = async () => {
      if (!currentNote?.content) {
        console.log('No note content to check');
        return;
      }

      console.log('Checking concepts for note content:', currentNote.content);
      setIsLoading(true);
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'checkConcepts',
            content: currentNote.content
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to check concepts');
        }

        const data = await response.json();
        console.log('API response for concept check:', data);
        if (data.detectedConcept) {
          setDetectedConcept(data.detectedConcept);
          setShowAssistant(true);
        }
      } catch (error) {
        console.error('Error checking concepts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkForConcepts();
  }, [currentNote?.content]);

  const handleYes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getExplanation',
          concept: detectedConcept
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get explanation');
      }

      const data = await response.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error getting explanation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeQuestion = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getPracticeQuestion',
          concept: detectedConcept
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get practice question');
      }

      const data = await response.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error getting practice question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showAssistant) return null;

  return (
    <div className="ai-assistant">
      <div className="ai-assistant-content">
        {!response ? (
          <>
            <p>{detectedConcept.prompt}</p>
            <div className="ai-assistant-buttons">
              <button onClick={handleYes} disabled={isLoading}>
                Yes
              </button>
              <button onClick={() => setShowAssistant(false)}>
                No thanks
              </button>
              <button onClick={handlePracticeQuestion} disabled={isLoading}>
                Give me a practice question
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ai-response">
              {response}
            </div>
            <button 
              className="close-response"
              onClick={() => {
                setResponse(null);
                setShowAssistant(false);
              }}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AIAssistant; 