import React from "react";
import '../styles/Recents.css';

const Recents = () => {
  const recentFiles = [
    { name: "Math", date: "01/10" },
    { name: "Art", date: "01/10" },
    { name: "Chem", date: "01/9" },
    { name: "Gov", date: "01/8" },
    { name: "Class Schedule" },
    { name: "Journal" },
    { name: "Math", date: "01/7" },
    { name: "Art", date: "01/7" },
    { name: "Gov", date: "01/5" },
    { name: "Chem", date: "01/4" }
  ];

  return (
    <div className="recents">
      <div className="folders">
        <h3>Folders</h3>
        <ul>
          <li>Math</li>
          <li>Science</li>
          <li>Internship</li>
        </ul>
      </div>
      <div className="recent-files">
        {recentFiles.map((file, index) => (
          <div key={index} className="file-card">
            <p>{file.name}</p>
            {file.date && <small>{file.date}</small>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recents;
