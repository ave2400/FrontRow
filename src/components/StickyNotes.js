import React, { useState, useEffect } from "react";
import "./StickyNotes.css";
import "../styles/buttons.css";
import { getNotes, createNote, deleteNote } from "../noteService";

const StickyNotes = ({ currentNote, setCurrentNote, onScreenshot }) => {
  const [notes, setNotes] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "My Notes",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  // Handle screenshot from WebcamContainer
  useEffect(() => {
    if (onScreenshot) {
      const handleScreenshot = (blob) => {
        // If no title exists, create a default one
        if (!currentNote.title) {
          const now = new Date();
          const defaultTitle = `Note ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
          setCurrentNote(prev => ({
            ...prev,
            title: defaultTitle,
            images: [...(prev.images || []), blob]
          }));
        } else {
          setCurrentNote(prev => ({
            ...prev,
            images: [...(prev.images || []), blob]
          }));
        }
      };

      onScreenshot(handleScreenshot);
    }
  }, [onScreenshot, currentNote.title, setCurrentNote]);

  const loadNotes = async () => {
    try {
      const fetchedNotes = await getNotes();
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const addNote = async () => {
    if (currentNote.title.trim() && currentNote.content.trim()) {
      setLoading(true);
      try {
        const newNote = await createNote(currentNote);
        setNotes([...notes, newNote]);
        setCurrentNote({ title: "", content: "", images: [] });
      } catch (error) {
        console.error('Error adding note:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentNote({
      ...currentNote,
      [name]: value,
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteNote(id);
      setNotes(notes.filter((note) => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setCurrentNote({
      ...currentNote,
      images: [...(currentNote.images || []), ...files]
    });
  };

  const removeImage = (index) => {
    setCurrentNote({
      ...currentNote,
      images: currentNote.images.filter((_, i) => i !== index)
    });
  };

  const exportNotes = () => {
    const notesContent = notes
      .map((note) => `${note.title}: ${note.content}`)
      .join("\n\n");

    const blob = new Blob([notesContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "notes.txt";
    link.click();
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailData({
      ...emailData,
      [name]: value
    });
  };

  const sendEmail = () => {
    const notesContent = notes
      .map((note) => `${note.title}: ${note.content}`)
      .join("\n\n");

    const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(notesContent)}`;
    window.location.href = mailtoLink;
    setShowEmailModal(false);
  };

  const NoteList = ({ notes, onDelete }) => (
    <div className="notes-list">
      {notes.map((note) => (
        <div key={note.id} className="note">
          <h3>{note.title}</h3>
          <p>{note.content}</p>
          {note.image_urls && note.image_urls.length > 0 && (
            <div className="note-images">
              {note.image_urls.map((url, index) => (
                <div key={index} className="note-image-container">
                  <img 
                    src={url} 
                    alt={`Screenshot ${index + 1}`} 
                    className="note-image"
                    onClick={() => window.open(url, '_blank')}
                  />
                </div>
              ))}
            </div>
          )}
          <button 
            className="btn btn-danger btn-sm" 
            onClick={() => onDelete(note.id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="sticky-notes">
      <div className="note-input">
        <input
          type="text"
          name="title"
          value={currentNote.title}
          onChange={handleChange}
          placeholder="Subject / Class Name"
        />
        <textarea
          name="content"
          value={currentNote.content}
          onChange={handleChange}
          placeholder="Type your notes..."
        ></textarea>
        {currentNote.images && currentNote.images.length > 0 && (
          <div className="current-images">
            <h4>Current Images:</h4>
            <div className="image-preview-grid">
              {currentNote.images.map((image, index) => {
                // Only create object URL if image is a Blob or File
                const imageUrl = image instanceof Blob ? URL.createObjectURL(image) : image;
                return (
                  <div key={index} className="image-preview">
                    <img 
                      src={imageUrl} 
                      alt={`Preview ${index + 1}`} 
                    />
                    <button 
                      className="remove-image"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button 
          className="btn btn-primary" 
          onClick={addNote}
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Note'}
        </button>
      </div>
      <div className="notes-container">
        <NoteList notes={notes} onDelete={handleDelete} />
      </div>

      <div className="export">
        <button className="btn btn-primary btn-full" onClick={exportNotes}>Export Notes as TXT</button>
        <button className="btn btn-secondary btn-full" onClick={() => setShowEmailModal(true)}>Send Notes via Email</button>
      </div>

      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Send Notes via Email</h2>
            <input
              type="email"
              name="to"
              value={emailData.to}
              onChange={handleEmailChange}
              placeholder="Recipient's email"
            />
            <input
              type="text"
              name="subject"
              value={emailData.subject}
              onChange={handleEmailChange}
              placeholder="Email subject"
            />
            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={sendEmail}>Send</button>
              <button className="btn btn-danger" onClick={() => setShowEmailModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickyNotes;
