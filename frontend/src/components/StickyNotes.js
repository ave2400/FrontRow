import React, { useState, useEffect } from "react";
import "./StickyNotes.css";
import "../styles/buttons.css";
import { getNotes, createNote, deleteNote, uploadImage, updateNote } from "../noteService";

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
    loadPersistedNote();
  }, [setCurrentNote]);

  const loadNotes = async () => {
    try {
      const fetchedNotes = await getNotes();
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadPersistedNote = async () => {
    const persistedNote = localStorage.getItem('currentNote');
    if (persistedNote) {
      try {
        const parsedNote = JSON.parse(persistedNote);
        if (parsedNote.images && parsedNote.images.length > 0) {
          const convertedImages = await Promise.all(
            parsedNote.images.map(async (imageData) => {
              if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                const response = await fetch(imageData);
                return await response.blob();
              }
              return imageData;
            })
          );
          parsedNote.images = convertedImages;
        }
        setCurrentNote(parsedNote);
      } catch (error) {
        console.error('Error parsing persisted note:', error);
        localStorage.removeItem('currentNote');
      }
    }
  };

  useEffect(() => {
    saveToLocalStorage(currentNote);
  }, [currentNote]);

  const saveToLocalStorage = async (currentNote) => {
    if (currentNote.title || currentNote.content || (currentNote.images && currentNote.images.length > 0)) {
      const noteForStorage = {
        ...currentNote,
        images: currentNote.images ? await Promise.all(
          currentNote.images.map(async (image) => {
            if (image instanceof Blob) {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(image);
              });
            }
            return image;
          })
        ) : []
      };
      localStorage.setItem('currentNote', JSON.stringify(noteForStorage));
    } else {
      localStorage.removeItem('currentNote');
    }
  };

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

  const addNote = async () => {
    if (currentNote.title.trim() && currentNote.content.trim()) {
      setLoading(true);
      try {
        const noteData = {
          title: currentNote.title,
          content: currentNote.content,
          image_urls: []
        };

        const newNote = await createNote(noteData);

        if (currentNote.images && currentNote.images.length > 0) {
          let uploadedUrls = [];
          try {
            uploadedUrls = await Promise.all(
              currentNote.images.map(async (image) => {
                try {
                  return await uploadImage(image, newNote.id);
                } catch (error) {
                  console.error('Error uploading image:', error);
                  return null; // Return null for failed uploads
                }
              })
            );
            // Filter out any null values from failed uploads
            uploadedUrls = uploadedUrls.filter((url) => url !== null);
          } catch (error) {
            console.error('Error during image uploads:', error);
          }

          if (uploadedUrls.length > 0) {
            const updatedNote = await updateNote(newNote.id, { image_urls: uploadedUrls });
            setNotes([...notes, updatedNote]);
          } else {
            setNotes([...notes, newNote]);
          }
        } else {
          setNotes([...notes, newNote]);
        }

        setCurrentNote({ title: "", content: "", images: [] });
        localStorage.removeItem('currentNote');
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
        {currentNote.images && currentNote.images.filter(image => (
          image instanceof Blob || image instanceof File || (typeof image === 'string' && image.startsWith('data:'))
        )).length > 0 && (
            <div className="current-images">
              <h4>Current Images:</h4>
              <div className="image-preview-grid">
                {currentNote.images
                  .map((image, index) => ({ image, index }))
                  .filter(({ image }) => (
                    image instanceof Blob || image instanceof File || (typeof image === 'string' && image.startsWith('data:'))
                  ))
                  .map(({ image, index }) => {
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
