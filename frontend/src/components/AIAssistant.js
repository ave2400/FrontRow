import React, { useState, useEffect, useRef } from 'react';
import './AIAssistant.css';
import logo from './FrontRow_Eyeball_Logo.svg';

const AI_ASSISTANT_API_URL = `${process.env.REACT_APP_BACKEND}/api/ai/assistant`;
// console.log(`HELLO LOOK AT ME, this is BACKEND: ${process.env.REACT_APP_BACKEND}`);

const AIAssistant = ({ currentNote }) => {
  const [showButtons, setShowButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [lastCheckedContent, setLastCheckedContent] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectedConcept, setDetectedConcept] = useState(null);

  const debounceTimeoutRef = useRef(null);

  // Monitor note content for concepts with Debouncing
  useEffect(() => {
    const noteContent = currentNote?.content;

    if (typeof noteContent !== 'string') {
      return;
    }
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (noteContent === lastCheckedContent) {
        return;
      }

      if (noteContent.trim() === "") {
        setDetectedConcept(null);
        setLastCheckedContent(noteContent);
        return;
      }

      try {
        const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'checkConcepts',
            content: noteContent,
            lastContent: lastCheckedContent
          }),
        });

        if (!apiResponse.ok) {
          throw new Error('Failed to check concepts');
        }

        const data = await apiResponse.json();
        setDetectedConcept(data.detectedConcept);
      } catch (error) {
        console.error('Error checking concepts:', error);
        setDetectedConcept(null);
      } finally {
        setLastCheckedContent(noteContent);
      }
    }, 750);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [currentNote?.content]);

  // Debug log to check if component is receiving currentNote
  // useEffect(() => {
  //   console.log('AIAssistant received currentNote:', currentNote);
  // }, [currentNote]);

  // Function to get the last sentence or phrase from the content
  const getLastPhrase = (content) => {
    if (!content) return "";
    const sentences = content.split(/[.!?]+/);
    return sentences[sentences.length - 1].trim();
  };

  const handleLogoClick = () => {
    setShowButtons(!showButtons);
  };

  const handleRefresh = async () => {
    if (!detectedConcept) return;

    setIsLoading(true);
    setResponse(null);
    try {
      const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getExplanation', 
          concept: detectedConcept
        }),
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
    setResponse(null);
    try {
      const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getPracticeQuestion', 
          concept: detectedConcept
        }),
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

  const handleCustomTopic = async () => {
    if (!customTopic) return;

    setIsLoading(true);
    setResponse(null);
    try {
      const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getExplanation', 
          concept: { name: customTopic, category: 'custom' }
        }),
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

  const handleClose = () => {
    setShowButtons(false);
    setResponse(null);
    setCustomTopic("");
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSummary = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setResponse(null);
    try {
      const apiResponse = await fetch(AI_ASSISTANT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getImageSummary',
          imageUrl: selectedImage
        }),
      });
      if (!apiResponse.ok) throw new Error('Failed to get image summary');
      const data = await apiResponse.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error getting image summary:', error);
      setResponse("Sorry, I couldn't analyze the image right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-assistant-container">
      {response && (
        <div className="ai-response-overlay">
          <div className="ai-response-content">
            <div className="ai-response" dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br />') }} />
            <button className="close-response" onClick={handleClose}>Close</button>
          </div>
        </div>
      )}
      
      <div className="ai-assistant-logo" onClick={handleLogoClick}>
        <img src={logo} alt="FrontRow Assistant" />
      </div>

      {showButtons && (
        <div className="ai-assistant-buttons">
          {detectedConcept ? (
            <>
              <button onClick={handleRefresh} disabled={isLoading}>
                Need a refresher on "{detectedConcept.name}"
              </button>
              <button onClick={handlePracticeQuestion} disabled={isLoading}>
                Practice problem on "{detectedConcept.name}"
              </button>
            </>
          ) : (
            <div className="no-concept-message">
              Type something related to a topic in our concept bank to get help!
            </div>
          )}
          <div className="custom-topic-section">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Type your own topic..."
            />
            <button onClick={handleCustomTopic} disabled={isLoading || !customTopic}>
              Get Help
            </button>
          </div>
          <div className="image-section">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <label htmlFor="image-upload" className="image-upload-label">
              Upload Image
            </label>
            {selectedImage && (
              <>
                <img src={selectedImage} alt="Selected" className="preview-image" />
                <button onClick={handleImageSummary} disabled={isLoading}>
                  Get Image Summary
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;