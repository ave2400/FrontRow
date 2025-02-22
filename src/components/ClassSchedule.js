import React from "react";
import '../styles/ClassSchedule.css';

const ClassSchedule = () => {
  const classes = [
    {
      name: "Accounting 311",
      room: "UTC 1.104",
      code: "MNS475",
      color: "#FFD700"
    },
    {
      name: "Accounting 312",
      room: "GSB 2.202",
      code: "QWR7Y6",
      color: "#808080"
    },
    {
      name: "Accounting 312H",
      room: "PMA 4.102",
      code: "RTD7TM",
      color: "#FFFFFF"
    }
  ];

  return (
    <div className="class-schedule">
      {classes.map((course, index) => (
        <div 
          key={index} 
          className="course-card"
          style={{ backgroundColor: course.color }}
        >
          <h3>{course.name}</h3>
          <p>Room: {course.room}</p>
          <p>Code: {course.code}</p>
        </div>
      ))}
    </div>
  );
};

export default ClassSchedule;
