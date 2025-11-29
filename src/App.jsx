import { useState } from "react";

function App({ onLogin, onRegisterStudent, loginError, clearLoginError }) {
  const [role, setRole] = useState("student"); // "student" | "faculty"
  const [view, setView] = useState("login"); // "login" | "register"

  // Login fields
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  // Registration fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regStudentId, setRegStudentId] = useState("");
  const [regDept, setRegDept] = useState("");
  const [regYear, setRegYear] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const isStudent = role === "student";

  const resetLoginFields = () => {
    setUserId("");
    setPassword("");
  };

  const resetRegisterFields = () => {
    setRegName("");
    setRegEmail("");
    setRegStudentId("");
    setRegDept("");
    setRegYear("");
    setRegPassword("");
    setRegConfirmPassword("");
  };

  const switchRole = (newRole) => {
    setRole(newRole);
    resetLoginFields();
    if (clearLoginError) clearLoginError();
    setView("login");
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();

    if (!userId || !password) {
      alert("Please enter ID and password");
      return;
    }

    if (clearLoginError) clearLoginError();
    onLogin(role, userId, password);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();

    if (regPassword !== regConfirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    onRegisterStudent({
      name: regName,
      studentId: regStudentId,
      email: regEmail,
      department: regDept,
      year: regYear,
      password: regPassword,
    });

    resetRegisterFields();
    resetLoginFields();
    setView("login");
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo-badge">EP</div>
        <h1 className="app-title">EduPortfolio</h1>
      </header>

      <main className="card-wrapper">
        {view === "login" ? (
          <div className="auth-card">
            {/* Role Selector */}
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${isStudent ? "active" : ""}`}
                onClick={() => switchRole("student")}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-btn ${!isStudent ? "active" : ""}`}
                onClick={() => switchRole("faculty")}
              >
                Faculty
              </button>
            </div>

            {/* Role text */}
            <div className="role-description">
              <p className={isStudent ? "highlight" : ""}>
                Manage your projects & milestones
              </p>
              <p className={!isStudent ? "highlight" : ""}>
                Review student submissions
              </p>
            </div>

            {/* Login Form */}
            <form className="login-form" onSubmit={handleLoginSubmit}>
              <label className="field-label">
                {isStudent ? "Student ID" : "Faculty ID"}
                <input
                  className="input-field"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </label>

              <label className="field-label">
                Password
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <button type="submit" className="login-btn">
                Login
              </button>
            </form>

            {loginError && <p className="error-text">{loginError}</p>}

            {/* Register Link only for students */}
            {isStudent && (
              <p className="register-text">
                New here?{" "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    resetLoginFields();
                    resetRegisterFields();
                    if (clearLoginError) clearLoginError();
                    setView("register");
                  }}
                >
                  Register as Student
                </button>
              </p>
            )}

            {/* Faculty Login Hint */}
            {!isStudent && (
              <p className="register-text">
                Use: <b>faculty1</b> / <b>123@faculty</b>
              </p>
            )}
          </div>
        ) : (
          // REGISTER STUDENT PAGE
          <div className="auth-card">
            <h2 className="form-title">Student Registration</h2>

            <form className="login-form" onSubmit={handleRegisterSubmit}>
              <label className="field-label">
                Full Name
                <input
                  className="input-field"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </label>

              <label className="field-label">
                Student ID
                <input
                  className="input-field"
                  type="text"
                  value={regStudentId}
                  onChange={(e) => setRegStudentId(e.target.value)}
                  required
                />
              </label>

              <label className="field-label">
                Email
                <input
                  className="input-field"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </label>

              <div className="form-row">
                <label className="field-label">
                  Department
                  <select
                    className="input-field select-field"
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="IT">IT</option>
                    <option value="AIML">AIML</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </label>

                <label className="field-label">
                  Year
                  <select
                    className="input-field select-field"
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                </label>
              </div>

              <label className="field-label">
                Password
                <input
                  className="input-field"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </label>

              <label className="field-label">
                Confirm Password
                <input
                  className="input-field"
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                />
              </label>

              <button type="submit" className="login-btn">
                Register
              </button>
            </form>

            <p className="register-text">
              Already have an account?{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  resetRegisterFields();
                  resetLoginFields();
                  if (clearLoginError) clearLoginError();
                  setView("login");
                }}
              >
                Back to Login
              </button>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
