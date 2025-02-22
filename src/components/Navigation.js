import React from "react";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <nav className="navigation">
      <div className="logo">FRONT ROW</div>
      <div className="nav-links">
        <Link to="/class-schedule">Class</Link>
        <Link to="/recents">Notepad</Link>
      </div>
    </nav>
  );
};

export default Navigation;
