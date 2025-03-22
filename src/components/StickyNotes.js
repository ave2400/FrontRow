import React, { useState } from "react";
import "./StickyNotes.css";

const StickyNotes = () => {
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState({ title: "", content: "" });

  const addNote = () => {
    if (currentNote.title.trim() && currentNote.content.trim()) {
      setNotes([
        ...notes,
        {
          id: Date.now(),
          title: currentNote.title,
          content: currentNote.content,
        },
      ]);
      setCurrentNote({ title: "", content: "" });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentNote({
      ...currentNote,
      [name]: value,
    });
  };

  const handleDelete = (id) => {
    setNotes(notes.filter((note) => note.id !== id));
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
        <button onClick={addNote}>Add Note</button>
      </div>
      <div className="notes-container">
        {notes.map((note) => (
          <div className="note" key={note.id}>
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <button onClick={() => handleDelete(note.id)}>Delete</button>
          </div>
        ))}
      </div>

      <div className="export">
        <button onClick={exportNotes}>Export Notes as TXT</button>
      </div>
    </div>
  );
};

export default StickyNotes;
