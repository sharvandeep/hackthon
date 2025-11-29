import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import StudentDashboard from "./StudentDashboard.jsx";

function Root() {
  // Logged-in user: null or { role: "student", id, name }
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

  // Register student (no uniqueness checks, to keep it simple & robust)
  const handleRegisterStudent = (studentData) => {
    setStudents((prev) => [...prev, studentData]);
    setLoginError("");
    alert("Registration successful! You can now login with your Student ID and password.");
  };

  // Login with Student ID + password only
  const handleLogin = (role, id, password) => {
    setLoginError("");

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
        id: match.studentId, // used for localStorage key
        name: match.name,
      });

      return;
    }

    // Faculty: (optional) just show error for now
    setLoginError("Faculty login not implemented in this demo.");
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

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
