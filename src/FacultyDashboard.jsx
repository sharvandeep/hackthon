import React, { useEffect, useState } from "react";

/**
 * FacultyDashboard.jsx
 *
 * - Reads students list from localStorage key "students"
 * - Reads each student's projects from localStorage key `projects_<studentId>`
 * - Allows faculty to view submissions, change status (approve/request changes),
 *   and add feedback. All changes are written back to each student's projects key.
 *
 * - Feedback store: localStorage key "faculty_feedbacks"
 *    structure: { "<facultyId>_<studentId>_<projectId>": [ { by, text, ts } ] , ... }
 */

const FacultyDashboard = ({ user, onLogout }) => {
  const facultyId = user?.id || "faculty1";
  const facultyName = user?.name || "Faculty";

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState("overview"); // overview | submissions | students
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | Draft | In Review | Approved | Changes Requested
  const [selectedSubmission, setSelectedSubmission] = useState(null); // object with submission + student info
  const [feedbacksMap, setFeedbacksMap] = useState({}); // cached faculty_feedbacks
  const [selectedStudentForPanel, setSelectedStudentForPanel] = useState(null);

  // Load students and submissions
  useEffect(() => {
    loadStudentsAndSubmissions();
    loadFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper to load feedbacks map
  function loadFeedbacks() {
    try {
      const raw = localStorage.getItem("faculty_feedbacks");
      const parsed = raw ? JSON.parse(raw) : {};
      setFeedbacksMap(parsed);
    } catch (err) {
      setFeedbacksMap({});
    }
  }

  // load students and their projects into submissions
  function loadStudentsAndSubmissions() {
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

      // sort newest first by id (timestamp) if available
      allSubs.sort((a, b) => (b.id || 0) - (a.id || 0));

      setSubmissions(allSubs);
    } catch (err) {
      console.warn("Failed loading students/submissions", err);
      setStudents([]);
      setSubmissions([]);
    }
  }

  // Stats derived from submissions
  const total = submissions.length;
  const inReview = submissions.filter((p) => p.status === "In Review").length;
  const approved = submissions.filter((p) => p.status === "Approved").length;
  const drafts = submissions.filter((p) => p.status === "Draft").length;
  const changesRequested = submissions.filter(
    (p) => p.status === "Changes Requested"
  ).length;

  // Save feedback map to localStorage
  function persistFeedbacks(newMap) {
    try {
      localStorage.setItem("faculty_feedbacks", JSON.stringify(newMap));
      setFeedbacksMap(newMap);
    } catch (err) {
      console.warn("Failed persisting feedbacks", err);
    }
  }

  // Helper to update a specific student's project and persist to localStorage,
  // then reload submissions state.
  function updateProjectForStudent(studentId, projectId, updaterFn) {
    const key = `projects_${studentId}`;
    try {
      const raw = localStorage.getItem(key);
      const projects = raw ? JSON.parse(raw) : [];

      const updatedProjects = projects.map((proj) => {
        if (proj.id === projectId) {
          return updaterFn(proj);
        }
        return proj;
      });

      localStorage.setItem(key, JSON.stringify(updatedProjects));
      // reload submissions to reflect changes
      loadStudentsAndSubmissions();
    } catch (err) {
      console.warn("Failed to update project for student", studentId, err);
    }
  }

  // Actions: Approve, Request Changes, Add Feedback
  function handleApprove(sub) {
    if (!sub) return;
    if (!window.confirm(`Approve project "${sub.title}" by ${sub.studentName}?`))
      return;

    updateProjectForStudent(sub.studentId, sub.id, (p) => ({
      ...p,
      status: "Approved",
    }));

    // Close modal if open and reload feedbacks/submissions
    loadStudentsAndSubmissions();
    loadFeedbacks();
    setSelectedSubmission((prev) =>
      prev && prev.id === sub.id && prev.studentId === sub.studentId
        ? { ...prev, status: "Approved" }
        : prev
    );
  }

  function handleRequestChanges(sub) {
    if (!sub) return;
    const reason = window.prompt(
      `Enter short feedback to request changes for "${sub.title}":`,
      ""
    );
    if (reason === null) return; // cancelled

    // Save feedback entry
    const key = `${facultyId}_${sub.studentId}_${sub.id}`;
    const existing = feedbacksMap[key] || [];
    const entry = { by: facultyName, text: reason.trim(), ts: new Date().toISOString() };
    const next = { ...feedbacksMap, [key]: [entry, ...existing] };
    persistFeedbacks(next);

    // Update status on student's project to 'Changes Requested'
    updateProjectForStudent(sub.studentId, sub.id, (p) => ({
      ...p,
      status: "Changes Requested",
    }));

    loadStudentsAndSubmissions();
    setSelectedSubmission((prev) =>
      prev && prev.id === sub.id && prev.studentId === sub.studentId
        ? { ...prev, status: "Changes Requested" }
        : prev
    );
  }

  function handleAddFeedback(sub) {
    if (!sub) return;
    const text = window.prompt(
      `Add feedback/note for "${sub.title}" (this will be saved):`,
      ""
    );
    if (!text || text.trim() === "") return;

    const key = `${facultyId}_${sub.studentId}_${sub.id}`;
    const existing = feedbacksMap[key] || [];
    const entry = { by: facultyName, text: text.trim(), ts: new Date().toISOString() };
    const next = { ...feedbacksMap, [key]: [entry, ...existing] };
    persistFeedbacks(next);
    // keep modal open — feedback will appear in the details view
    loadFeedbacks();
  }

  // View details modal open
  function openDetails(sub) {
    setSelectedSubmission(sub);
    // ensure we have latest feedback map
    loadFeedbacks();
  }

  function closeDetails() {
    setSelectedSubmission(null);
  }

  // Filtered submissions for list view
  const filteredSubmissions = submissions.filter((s) => {
    const term = searchTerm.trim().toLowerCase();
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!term) return true;
    const inTitle = (s.title || "").toLowerCase().includes(term);
    const inStudent = (s.studentName || "").toLowerCase().includes(term);
    const inDesc = (s.description || "").toLowerCase().includes(term);
    return inTitle || inStudent || inDesc;
  });

  // get feedback list for a submission
  function getFeedbacksFor(sub) {
    if (!sub) return [];
    const key = `${facultyId}_${sub.studentId}_${sub.id}`;
    return feedbacksMap[key] || [];
  }

  // Student panel: view projects of a student
  function openStudentPanel(student) {
    setSelectedStudentForPanel(student);
    setActiveTab("students");
  }

  // UI small helpers
  function statusBadge(status) {
    const cls = `status-pill status-${(status || "draft").replace(/\s+/g, "").toLowerCase()}`;
    return <span className={cls}>{status}</span>;
  }

  // render
  return (
    <div className="dashboard-root">
      {/* Top Navbar */}
      <header className="dashboard-nav">
        <div className="nav-left">
          <div className="logo-badge">EP</div>
          <span className="app-title">EduPortfolio – Faculty</span>
        </div>

        <nav className="nav-center">
          <button
            className={`nav-pill ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`nav-pill ${activeTab === "submissions" ? "active" : ""}`}
            onClick={() => setActiveTab("submissions")}
          >
            Submissions
          </button>
          <button
            className={`nav-pill ${activeTab === "students" ? "active" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            Students
          </button>
        </nav>

        <div className="nav-right">
          <button className="icon-pill" aria-label="Notifications">
            🔔
          </button>
          <button className="outline-pill" onClick={onLogout}>
            Logout
          </button>
          <div className="avatar-pill">{facultyId?.substring(0, 2).toUpperCase()}</div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Overview */}
        {activeTab === "overview" && (
          <>
            <section className="welcome-section">
              <h1 className="welcome-title">Welcome, {facultyName}!</h1>
              <p className="welcome-subtitle">
                You are mapped to all registered students. Review their project progress and statuses here.
              </p>
            </section>

            <section className="stats-grid">
              <div className="stat-card big">
                <p className="stat-label">Total Submissions</p>
                <p className="stat-value">{total}</p>
                <p className="stat-subtext">Total number of projects from all students</p>
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
                <p className="stat-subtext">Draft projects (not yet submitted by students)</p>
              </div>
            </section>
          </>
        )}

        {/* Submissions */}
        {activeTab === "submissions" && (
          <section className="panel" style={{ marginTop: "1rem" }}>
            <div className="panel-header" style={{ alignItems: "center" }}>
              <div>
                <h2 className="panel-title">All Student Projects</h2>
                <p className="panel-subtitle">These are projects created by students mapped to this faculty.</p>
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="In Review">In Review</option>
                  <option value="Changes Requested">Changes Requested</option>
                  <option value="Approved">Approved</option>
                </select>

                <input
                  placeholder="Search by title or student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>Reset</button>
              </div>
            </div>

            {filteredSubmissions.length === 0 ? (
              <p className="empty-text">No project submissions found. Ask students to create projects in their dashboards.</p>
            ) : (
              <div className="project-list">
                {filteredSubmissions.map((p) => (
                  <div key={`${p.studentId}-${p.id}`} className="project-card full">
                    <h3 className="project-title">
                      {p.title} <span className="project-student">· {p.studentName} ({p.studentId})</span>
                    </h3>

                    <div className="project-tags" style={{ gap: "0.5rem", marginBottom: ".5rem" }}>
                      <span>🏷 {p.category}</span>
                      {p.techStack && <span>💻 {p.techStack}</span>}
                      <span>📈 {p.progress}%</span>
                      <span>📅 {p.lastUpdated}</span>
                      {statusBadge(p.status)}
                    </div>

                    <p className="project-description">{p.description && p.description.length > 180 ? p.description.slice(0, 180) + "..." : p.description}</p>

                    <div className="project-actions" style={{ marginTop: ".75rem" }}>
                      <button className="action-btn read" onClick={() => openDetails(p)}>View</button>

                      <button
                        className="action-btn edit"
                        onClick={() => {
                          // open specific student's projects in the Students tab for quick edits
                          const student = students.find((s) => s.studentId === p.studentId);
                          if (student) {
                            openStudentPanel(student);
                          }
                        }}
                      >
                        Student
                      </button>

                      <button
                        className="action-btn"
                        onClick={() => {
                          // add quick feedback prompt
                          handleAddFeedback(p);
                        }}
                        title="Add feedback"
                      >
                        ✉ Feedback
                      </button>

                      <button
                        className="action-btn"
                        onClick={() => handleRequestChanges(p)}
                        title="Request changes from student"
                      >
                        ⚠ Request Changes
                      </button>

                      <button
                        className="action-btn"
                        onClick={() => handleApprove(p)}
                        title="Approve project"
                      >
                        ✅ Approve
                      </button>

                      {p.file && <span className="project-file">📎 {p.file}</span>}
                      {p.link && (
                        <a className="action-btn read" href={p.link} target="_blank" rel="noreferrer">
                          🔗 Open Link
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Students */}
        {activeTab === "students" && (
          <section className="panel" style={{ marginTop: "1.5rem" }}>
            <div className="panel-header">
              <h2 className="panel-title">Students Mapped to You</h2>
              <p className="panel-subtitle">All students registered in the platform are mapped to this faculty account.</p>
            </div>

            {students.length === 0 ? (
              <p className="empty-text">No students registered yet on the platform.</p>
            ) : (
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="project-list">
                    {students.map((s) => {
                      const count = submissions.filter((p) => p.studentId === s.studentId).length;
                      return (
                        <div key={s.studentId} className="project-card full" style={{ cursor: "pointer" }} onClick={() => openStudentPanel(s)}>
                          <h3 className="project-title">{s.name} ({s.studentId})</h3>
                          <div className="project-tags">
                            <span>🎓 {s.department || "—"}</span>
                            <span>📅 {s.year || "—"}</span>
                            <span>📁 Projects: {count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <aside style={{ width: 420 }}>
                  <div className="panel" style={{ padding: "1rem" }}>
                    <h3 style={{ marginTop: 0 }}>Student detail</h3>
                    {selectedStudentForPanel ? (
                      <>
                        <p><strong>{selectedStudentForPanel.name}</strong> ({selectedStudentForPanel.studentId})</p>
                        <p>Department: {selectedStudentForPanel.department || "—"}</p>
                        <p>Year: {selectedStudentForPanel.year || "—"}</p>

                        <h4 style={{ marginTop: "1rem" }}>Projects</h4>
                        <div>
                          {submissions.filter((p) => p.studentId === selectedStudentForPanel.studentId).length === 0 ? (
                            <p className="empty-text">No projects.</p>
                          ) : (
                            submissions
                              .filter((p) => p.studentId === selectedStudentForPanel.studentId)
                              .map((proj) => (
                                <div key={proj.id} style={{ marginBottom: ".75rem", borderBottom: "1px solid #eee", paddingBottom: ".5rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}>
                                    <strong>{proj.title}</strong>
                                    {statusBadge(proj.status)}
                                  </div>
                                  <div style={{ marginTop: ".25rem" }}>
                                    <small>{proj.description?.slice(0, 120)}{proj.description && proj.description.length > 120 ? "..." : ""}</small>
                                  </div>
                                  <div style={{ marginTop: ".35rem" }}>
                                    <button className="action-btn read" onClick={() => openDetails(proj)}>View</button>
                                    <button className="action-btn" onClick={() => handleApprove(proj)}>Approve</button>
                                    <button className="action-btn" onClick={() => handleRequestChanges(proj)}>Request Changes</button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="empty-text">Select a student to view details</p>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </section>
        )}

        {/* Details modal */}
        {selectedSubmission && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={closeDetails}
          >
            <div
              className="panel"
              style={{ width: "900px", maxHeight: "85vh", overflow: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{selectedSubmission.title} <small style={{ color: "#666", marginLeft: 8 }}>· {selectedSubmission.studentName} ({selectedSubmission.studentId})</small></h3>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  {statusBadge(selectedSubmission.status)}
                  <button onClick={() => handleAddFeedback(selectedSubmission)}>Add Feedback</button>
                  <button onClick={() => handleRequestChanges(selectedSubmission)}>Request Changes</button>
                  <button onClick={() => handleApprove(selectedSubmission)}>Approve</button>
                  <button onClick={closeDetails} style={{ background: "#eee" }}>Close</button>
                </div>
              </div>

              <p style={{ color: "#666", marginTop: ".25rem" }}>{selectedSubmission.category} · {selectedSubmission.techStack || "—"} · {selectedSubmission.lastUpdated}</p>

              <div style={{ marginTop: "1rem" }}>
                <h4>Description</h4>
                <p style={{ whiteSpace: "pre-wrap" }}>{selectedSubmission.description || "—"}</p>
              </div>

              {selectedSubmission.milestones && selectedSubmission.milestones.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4>Milestones</h4>
                  <ul>
                    {selectedSubmission.milestones.map((m) => (
                      <li key={m.id} style={{ textDecoration: m.completed ? "line-through" : "none" }}>
                        {m.text} {m.completed ? "✅" : "◻"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: "1rem" }}>
                <h4>Attachments</h4>
                {selectedSubmission.file ? <p>📎 {selectedSubmission.file}</p> : <p>No file attached.</p>}
                {selectedSubmission.link && <p>🔗 <a href={selectedSubmission.link} target="_blank" rel="noreferrer">{selectedSubmission.link}</a></p>}
              </div>

              <div style={{ marginTop: "1rem" }}>
                <h4>Feedback / Notes</h4>
                {getFeedbacksFor(selectedSubmission).length === 0 ? (
                  <p>No feedback yet.</p>
                ) : (
                  getFeedbacksFor(selectedSubmission).map((fb, idx) => (
                    <div key={idx} style={{ borderLeft: "3px solid #e3e8ff", paddingLeft: ".5rem", marginBottom: ".5rem" }}>
                      <div style={{ fontSize: ".85rem", color: "#333" }}>{fb.text}</div>
                      <div style={{ fontSize: ".75rem", color: "#666" }}>{fb.by} • {new Date(fb.ts).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FacultyDashboard;
