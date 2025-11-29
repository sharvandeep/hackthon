import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import StudentDashboard from "./StudentDashboard.jsx";
import FacultyDashboard from "./FacultyDashboard.jsx";

function Root() {
  // Logged-in user: null or { role: "student" | "faculty", id, name }
  const [user, setUser] = useState(null);

  // All registered students (persistent)
  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem("students");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save students whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("students", JSON.stringify(students));
    } catch {
      // ignore
    }
  }, [students]);

  const [loginError, setLoginError] = useState("");

  // One faculty account (as you specified)
  const facultyAccounts = [
    { id: "faculty1", password: "123@faculty", name: "Faculty 1" },
  ];

  // Register a new student (called from App)
  const handleRegisterStudent = (newStudent) => {
    // newStudent should be an object: { studentId, password, name }
    setLoginError("");
    setStudents((prev) => {
      if (prev.find((s) => s.studentId === newStudent.studentId)) {
        setLoginError("Student ID already registered");
        return prev;
      }
      return [...prev, newStudent];
    });
  };

  const handleLogin = (role, id, password) => {
    setLoginError("");

    // STUDENT LOGIN
    if (role === "student") {
      const match = students.find(
        (s) => s.studentId === id && s.password === password
      );

      if (!match) {
        setLoginError("Invalid Student ID or Password");
        return;
      }

      setUser({
        role: "student",
        id: match.studentId,
        name: match.name,
      });

      return;
    }

    // FACULTY LOGIN
    if (role === "faculty") {
      const match = facultyAccounts.find(
        (f) => f.id === id && f.password === password
      );

      if (!match) {
        setLoginError("Invalid Faculty ID or Password");
        return;
      }

      setUser({
        role: "faculty",
        id: match.id,
        name: match.name,
      });

      return;
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginError("");
  };

  // Not logged in → show auth
  if (!user) {
    return (
      <App
        onLogin={handleLogin}
        onRegisterStudent={handleRegisterStudent}
        loginError={loginError}
        clearLoginError={() => setLoginError("")}
      />
    );
  }

  // Student logged in
  if (user.role === "student") {
    return <StudentDashboard user={user} onLogout={handleLogout} />;
  }

  // Faculty logged in
  if (user.role === "faculty") {
    return <FacultyDashboard user={user} onLogout={handleLogout} />;
  }

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
