import React, { useEffect, useState } from "react";

const FacultyDashboard = ({ user, onLogout }) => {
  const facultyId = user?.id || "Faculty";

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Load all students and their projects from localStorage
  useEffect(() => {
    try {
      const rawStudents = localStorage.getItem("students");
      const parsedStudents = rawStudents ? JSON.parse(rawStudents) : [];
      setStudents(parsedStudents);

      const allSubs = [];

      parsedStudents.forEach((s) => {
        const key = `projects_${s.studentId}`;
        const rawProjects = localStorage.getItem(key);
        let projects = [];
        try {
          projects = rawProjects ? JSON.parse(rawProjects) : [];
        } catch {
          projects = [];
        }

        projects.forEach((p) => {
          allSubs.push({
            ...p,
            studentId: s.studentId,
            studentName: s.name,
          });
        });
      });

      setSubmissions(allSubs);
    } catch {
      setStudents([]);
      setSubmissions([]);
    }
  }, []);

  // Stats
  const total = submissions.length;
  const inReview = submissions.filter((p) => p.status === "In Review").length;
  const approved = submissions.filter((p) => p.status === "Approved").length;
  const drafts = submissions.filter((p) => p.status === "Draft").length;

  return (
    <div className="dashboard-root">
      {/* Top Navbar */}
      <header className="dashboard-nav">
        <div className="nav-left">
          <div className="logo-badge">EP</div>
          <span className="app-title">EduPortfolio – Faculty</span>
        </div>

        <nav className="nav-center">
          <button className="nav-pill active">Overview</button>
          <button className="nav-pill">Submissions</button>
          <button className="nav-pill">Students</button>
        </nav>

        <div className="nav-right">
          <button className="icon-pill" aria-label="Notifications">
            🔔
          </button>
          <button className="outline-pill" onClick={onLogout}>
            Logout
          </button>
          <div className="avatar-pill">
            {facultyId?.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Overview section */}
        <section className="welcome-section">
          <h1 className="welcome-title">
            Welcome, {user?.name || "Faculty"}!
          </h1>
          <p className="welcome-subtitle">
            You are mapped to all registered students. Review their project
            progress and statuses here.
          </p>
        </section>

        {/* Stats cards */}
        <section className="stats-grid">
          <div className="stat-card big">
            <p className="stat-label">Total Submissions</p>
            <p className="stat-value">{total}</p>
            <p className="stat-subtext">
              Total number of projects from all students
            </p>
          </div>

          <div className="stat-card big">
            <p className="stat-label">In Review</p>
            <p className="stat-value">{inReview}</p>
            <p className="stat-subtext">Waiting for your feedback</p>
          </div>

          <div className="stat-card big">
            <p className="stat-label">Approved</p>
            <p className="stat-value stat-value-success">{approved}</p>
            <p className="stat-subtext">Projects you have approved</p>
          </div>

          <div className="stat-card big">
            <p className="stat-label">Drafts</p>
            <p className="stat-value">{drafts}</p>
            <p className="stat-subtext">
              Draft projects (not yet submitted by students)
            </p>
          </div>
        </section>

        {/* Submissions list */}
        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <div className="panel-header">
            <h2 className="panel-title">All Student Projects</h2>
            <p className="panel-subtitle">
              These are projects created by students mapped to this faculty.
            </p>
          </div>

          {submissions.length === 0 ? (
            <p className="empty-text">
              No project submissions found. Ask students to create projects in
              their dashboards.
            </p>
          ) : (
            <div className="project-list">
              {submissions.map((p) => (
                <div key={`${p.studentId}-${p.id}`} className="project-card full">
                  <h3 className="project-title">
                    {p.title}{" "}
                    <span className="project-student">
                      · {p.studentName} ({p.studentId})
                    </span>
                  </h3>

                  <div className="project-tags">
                    <span>🏷 {p.category}</span>
                    {p.techStack && <span>💻 {p.techStack}</span>}
                    <span>📈 {p.progress}%</span>
                    <span>📅 {p.lastUpdated}</span>
                    <span className={`status-pill status-${p.status
                      .replace(" ", "")
                      .toLowerCase()}`}>
                      {p.status}
                    </span>
                  </div>

                  <p className="project-description">
                    {p.description && p.description.length > 180
                      ? p.description.slice(0, 180) + "..."
                      : p.description}
                  </p>

                  <div className="project-actions">
                    {p.link && (
                      <a
                        className="action-btn read"
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        🔗 Open Link
                      </a>
                    )}

                    {p.file && (
                      <span className="project-file">📎 File: {p.file}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Students summary */}
        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <div className="panel-header">
            <h2 className="panel-title">Students Mapped to You</h2>
            <p className="panel-subtitle">
              All students registered in the platform are mapped to this
              faculty account.
            </p>
          </div>

          {students.length === 0 ? (
            <p className="empty-text">
              No students registered yet on the platform.
            </p>
          ) : (
            <div className="project-list">
              {students.map((s) => {
                const count = submissions.filter(
                  (p) => p.studentId === s.studentId
                ).length;

                return (
                  <div key={s.studentId} className="project-card full">
                    <h3 className="project-title">
                      {s.name} ({s.studentId})
                    </h3>
                    <div className="project-tags">
                      <span>🎓 {s.department}</span>
                      <span>📅 {s.year}</span>
                      <span>📁 Projects: {count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default FacultyDashboard;
