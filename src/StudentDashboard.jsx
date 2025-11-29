// StudentDashboard.jsx
import React, { useState, useEffect } from "react";
import PortfolioEditor from "./PortfolioEditor.jsx"; // keep if you use it

// Month & weekday names used by calendar
const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const weekdayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const StudentDashboard = ({ user, onLogout }) => {
  const studentId = user?.id || null;

  // view: "dashboard" | "addProject" | "projectDetails" | "projects" | "portfolio"
  const [view, setView] = useState("dashboard");

  // core state
  const [projects, setProjects] = useState([]);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);

  // project form fields
  const [pTitle, setPTitle] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pCategory, setPCategory] = useState("");
  const [pLink, setPLink] = useState("");
  const [pTechStack, setPTechStack] = useState("");
  const [pFile, setPFile] = useState("");

  const [newMilestoneText, setNewMilestoneText] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  // feedback list for this student (array of feedback objects)
  const [feedbackList, setFeedbackList] = useState([]);

  // ---------- Load projects + feedback on studentId change ----------
  useEffect(() => {
    // reset local UI state
    setSelectedProjectId(null);
    setEditingProjectId(null);
    resetProjectForm();
    setHasLoadedProjects(false);

    if (!studentId) {
      setProjects([]);
      setHasLoadedProjects(true);
      setFeedbackList([]);
      return;
    }

    // load projects
    const pkey = `projects_${studentId}`;
    try {
      const raw = localStorage.getItem(pkey);
      setProjects(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.warn("Failed to parse projects from localStorage", err);
      setProjects([]);
    }

    // load feedback
    const fkey = `feedback_${studentId}`;
    try {
      const rawf = localStorage.getItem(fkey);
      setFeedbackList(rawf ? JSON.parse(rawf) : []);
    } catch (err) {
      console.warn("Failed to parse feedback from localStorage", err);
      setFeedbackList([]);
    }

    setHasLoadedProjects(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // ---------- Persist projects to localStorage ----------
  useEffect(() => {
    if (!studentId || !hasLoadedProjects) return;
    const key = `projects_${studentId}`;
    try {
      localStorage.setItem(key, JSON.stringify(projects));
    } catch (err) {
      console.warn("Failed to write projects to localStorage", err);
    }
  }, [projects, studentId, hasLoadedProjects]);

  // ---------- Listen for storage events (sync across tabs/pages) ----------
  useEffect(() => {
    const handleStorageChange = (e) => {
      // If projects changed externally for this student, reload
      if (e.key === `projects_${studentId}`) {
        try {
          const updated = JSON.parse(e.newValue || "[]");
          setProjects(updated);
        } catch {
          setProjects([]);
        }
      }

      // If feedback changed externally for this student, reload feedbackList
      if (e.key === `feedback_${studentId}`) {
        try {
          const f = JSON.parse(e.newValue || "[]");
          setFeedbackList(f);
        } catch {
          setFeedbackList([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [studentId]);

  // ---------- When feedbackList changes -> sync project statuses ----------
  useEffect(() => {
    if (!studentId) return;
    if (!Array.isArray(feedbackList) || feedbackList.length === 0) {
      // No feedback: do nothing (or optionally revert statuses — we don't revert)
      return;
    }

    // Build a map of latest feedback per projectId
    const latestByProject = {};
    feedbackList.forEach((f) => {
      // normalize projectId to number/string
      const pid = f.projectId;
      if (!pid) return;
      // choose by date if provided, else by array order (later entries override)
      if (!latestByProject[pid]) {
        latestByProject[pid] = f;
      } else {
        const cur = latestByProject[pid];
        if (f.date && cur.date) {
          // parse date (if invalid, fallback to array order)
          const fd = new Date(f.date).getTime();
          const cd = new Date(cur.date).getTime();
          if (!isNaN(fd) && !isNaN(cd) && fd > cd) {
            latestByProject[pid] = f;
          } else {
            // if dates can't compare, choose later item (current loop order)
            latestByProject[pid] = f;
          }
        } else {
          // no dates — later array entries override
          latestByProject[pid] = f;
        }
      }
    });

    // Update projects accordingly (status + lastUpdated + optionally store lastFeedbackSummary)
    setProjects((prevProjects) => {
      const updated = prevProjects.map((p) => {
        const fb = latestByProject[p.id];
        if (!fb) return p;
        // Only update if status differs (to avoid needless writes)
        const newStatus = fb.status || p.status;
        const lastUpdated = fb.date || p.lastUpdated || new Date().toLocaleDateString();
        // attach small feedback metadata for quick preview in UI
        const lastFeedback = {
          comment: fb.comment || "",
          faculty: fb.faculty || "",
          date: fb.date || lastUpdated,
        };
        return { ...p, status: newStatus, lastUpdated, lastFeedback };
      });

      // persist updated projects also in localStorage (so student & faculty view consistent)
      try {
        localStorage.setItem(`projects_${studentId}`, JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to persist synced projects", err);
      }

      return updated;
    });
  }, [feedbackList, studentId]);

  // Also reload feedbackList whenever projects change (faculty may have edited both)
  useEffect(() => {
    if (!studentId) return;
    try {
      const rawf = localStorage.getItem(`feedback_${studentId}`);
      setFeedbackList(rawf ? JSON.parse(rawf) : []);
    } catch (err) {
      console.warn("Failed to parse feedback from localStorage", err);
      setFeedbackList([]);
    }
  }, [projects, studentId]);

  // ---------- Helpers ----------
  const computeProgress = (milestones) => {
    if (!milestones || milestones.length === 0) return 0;
    const done = milestones.filter((m) => m.completed).length;
    return Math.round((done / milestones.length) * 100);
  };

  const resetProjectForm = () => {
    setPTitle("");
    setPDescription("");
    setPCategory("");
    setPLink("");
    setPTechStack("");
    setPFile("");
  };

  const handleToggleFeatured = (projectId) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, featured: !p.featured } : p))
    );
  };

  // ---------- Add / Edit Project ----------
  const handleProjectSubmit = (e) => {
    e.preventDefault();
    if (!pTitle.trim() || !pDescription.trim()) {
      alert("Please fill in at least title and description.");
      return;
    }

    if (editingProjectId) {
      // update
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProjectId) return p;
          const updated = {
            ...p,
            title: pTitle,
            description: pDescription,
            category: pCategory || "General",
            link: pLink,
            techStack: pTechStack,
            file: pFile,
          };
          return {
            ...updated,
            progress: computeProgress(updated.milestones || []),
            lastUpdated: new Date().toLocaleDateString(),
          };
        })
      );
    } else {
      // create
      const newProject = {
        id: Date.now(),
        title: pTitle,
        description: pDescription,
        category: pCategory || "General",
        link: pLink,
        techStack: pTechStack,
        file: pFile,
        status: "Draft",
        milestones: [],
        progress: 0,
        lastUpdated: new Date().toLocaleDateString(),
        featured: false,
      };
      setProjects((prev) => [newProject, ...prev]);
    }

    resetProjectForm();
    setEditingProjectId(null);
    setView("dashboard");
  };

  const handleCancelProject = () => {
    resetProjectForm();
    setEditingProjectId(null);
    setView("dashboard");
  };

  // ---------- Project details helpers ----------
  const openProjectDetails = (projectId) => {
    setSelectedProjectId(projectId);
    setNewMilestoneText("");
    setView("projectDetails");
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const updateProject = (projectId, updaterFn) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const updated = updaterFn(p);
        return {
          ...updated,
          progress: computeProgress(updated.milestones || []),
          lastUpdated: new Date().toLocaleDateString(),
        };
      })
    );
  };

  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newMilestoneText.trim() || !selectedProject) return;

    updateProject(selectedProject.id, (p) => ({
      ...p,
      milestones: [
        ...(p.milestones || []),
        { id: Date.now(), text: newMilestoneText.trim(), completed: false },
      ],
    }));

    setNewMilestoneText("");
  };

  const handleToggleMilestone = (milestoneId) => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (p) => ({
      ...p,
      milestones: p.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      ),
    }));
  };

  const handleMarkInReview = () => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (p) => ({ ...p, status: "In Review" }));
  };

  const handleBackFromDetails = () => {
    setSelectedProjectId(null);
    setNewMilestoneText("");
    setView("dashboard");
  };

  // ---------- Feedback helpers ----------
  const getFeedbackForProject = (projectId) => {
    if (!feedbackList || !Array.isArray(feedbackList)) return [];
    return feedbackList.filter((f) => String(f.projectId) === String(projectId));
  };

  // Shortcut to check whether a project has feedback
  const hasFeedback = (projectId) => {
    const f = getFeedbackForProject(projectId);
    return f && f.length > 0;
  };

  // ---------- Stats ----------
  const stats = {
    total: projects.length,
    inReview: projects.filter((p) => p.status === "In Review").length,
    approved: projects.filter((p) => p.status === "Approved").length,
    drafts: projects.filter((p) => p.status === "Draft").length,
  };

  // ---------- Calendar ----------
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();
  const today = new Date();
  const isSameMonth = today.getFullYear() === year && today.getMonth() === month;

  const calendarCells = [];
  for (let i = 0; i < startDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // ---------- JSX ----------
  return (
    <div className="dashboard-root">
      {/* Top Navbar */}
      <header className="dashboard-nav">
        <div className="nav-left">
          <div className="logo-badge">EP</div>
          <span className="app-title">EduPortfolio</span>
        </div>

        <nav className="nav-center">
          <button
            className={`nav-pill ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            Home
          </button>
          <button
            className={`nav-pill ${view === "projects" ? "active" : ""}`}
            onClick={() => setView("projects")}
          >
            Projects
          </button>
          <button
            className={`nav-pill ${view === "portfolio" ? "active" : ""}`}
            onClick={() => setView("portfolio")}
          >
            Portfolio
          </button>
          {/* Feedback removed from navbar per request */}
        </nav>

        <div className="nav-right">
          <button className="icon-pill" aria-label="Notifications">
            🔔
          </button>
          <button
            className="primary-pill"
            onClick={() => {
              resetProjectForm();
              setEditingProjectId(null);
              setView("addProject");
            }}
          >
            + New Project
          </button>
          <button className="outline-pill" onClick={onLogout}>
            Logout
          </button>
          <div className="avatar-pill">{studentId ? studentId.substring(0, 2).toUpperCase() : "ST"}</div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* ========== DASHBOARD VIEW ========== */}
        {view === "dashboard" && (
          <>
            <section className="welcome-section">
              <h1 className="welcome-title">Welcome back, {studentId}!</h1>
              <p className="welcome-subtitle">Here’s what’s happening with projects today.</p>
            </section>

            <section className="stats-grid">
              <div className="stat-card big">
                <p className="stat-label">Total Projects</p>
                <p className="stat-value">{stats.total}</p>
                <p className="stat-subtext">All projects you’ve created</p>
              </div>

              <div className="stat-card big">
                <p className="stat-label">In Review</p>
                <p className="stat-value">{stats.inReview}</p>
                <p className="stat-subtext">Waiting for faculty review</p>
              </div>

              <div className="stat-card big">
                <p className="stat-label">Approved</p>
                <p className="stat-value stat-value-success">{stats.approved}</p>
                <p className="stat-subtext">Successfully evaluated projects</p>
              </div>

              <div className="stat-card big">
                <p className="stat-label">Drafts</p>
                <p className="stat-value">{stats.drafts}</p>
                <p className="stat-subtext">Not yet submitted</p>
              </div>
            </section>

            <section className="bottom-grid">
              {/* Projects */}
              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">My Projects</h2>
                  <button
                    className="small-primary-btn"
                    onClick={() => {
                      resetProjectForm();
                      setEditingProjectId(null);
                      setView("addProject");
                    }}
                  >
                    + New Project
                  </button>
                </div>

                {projects.length === 0 ? (
                  <p className="empty-text">No projects yet. Click <strong>+ New Project</strong> to add one.</p>
                ) : (
                  <div className="project-list">
                    {projects.map((p) => {
                      const projectFeedback = getFeedbackForProject(p.id);
                      return (
                        <div key={p.id} className="project-card full">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <div>
                              <h3 className="project-title">{p.title}</h3>
                              <div className="project-tags">
                                <span>🏷 {p.category}</span>
                                {p.techStack && <span>💻 {p.techStack}</span>}
                                <span>📈 {p.progress}%</span>
                                <span>📅 {p.lastUpdated}</span>
                              </div>
                              <p className="project-description">
                                {p.description && p.description.length > 180 ? p.description.slice(0, 180) + "..." : p.description}
                              </p>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                              <div className="project-actions" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <button className="action-btn read" onClick={() => openProjectDetails(p.id)}>🔍 Read</button>

                                <button
                                  className="action-btn edit"
                                  onClick={() => {
                                    setPTitle(p.title); setPDescription(p.description); setPCategory(p.category);
                                    setPLink(p.link); setPTechStack(p.techStack); setPFile(p.file || "");
                                    setEditingProjectId(p.id); setView("addProject");
                                  }}
                                >
                                  ✏ Modify
                                </button>

                                <button className="action-btn delete" onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))}>🗑 Delete</button>

                                {/* Feedback button: changes depending on whether feedback exists */}
                                {projectFeedback && projectFeedback.length > 0 ? (
                                  <button className="action-btn feedback" onClick={() => openProjectDetails(p.id)}>
                                    💬 View Feedback ({projectFeedback.length})
                                  </button>
                                ) : (
                                  <button className="action-btn feedback disabled" disabled>
                                    💬 No feedback yet
                                  </button>
                                )}
                              </div>

                              <div style={{ fontSize: "0.8rem", color: "#666", textAlign: "right" }}>
                                <div>{p.status}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calendar */}
              <div className="panel">
                <div className="panel-header calendar-header">
                  <button type="button" className="calendar-nav-btn" onClick={goToPrevMonth}>◀</button>
                  <h2 className="panel-title">{monthNames[month]} {year}</h2>
                  <button type="button" className="calendar-nav-btn" onClick={goToNextMonth}>▶</button>
                </div>

                <div className="calendar">
                  <div className="calendar-grid calendar-grid-header">
                    {weekdayNames.map((day) => (
                      <div key={day} className="calendar-day-name">{day}</div>
                    ))}
                  </div>

                  <div className="calendar-grid">
                    {calendarCells.map((cell, idx) => {
                      if (cell === null) return <div key={idx} className="calendar-day empty" />;
                      const isToday = isSameMonth && cell === today.getDate();
                      return (
                        <div key={idx} className={`calendar-day ${isToday ? "today" : ""}`}>
                          <span>{cell}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="calendar-footer-text">
                  Today is <strong>{today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear()}</strong>
                </p>
              </div>
            </section>
          </>
        )}

        {/* ========== ADD NEW PROJECT VIEW ========== */}
        {view === "addProject" && (
          <section className="project-form-wrapper">
            <div className="panel project-form-panel">
              <div className="panel-header">
                <h2 className="panel-title">{editingProjectId ? "Edit Project" : "Add New Project"}</h2>
                <button className="outline-pill small-outline" onClick={handleCancelProject}>Back to Dashboard</button>
              </div>

              <form className="project-form" onSubmit={handleProjectSubmit}>
                <label className="field-label">
                  Project Title
                  <input className="input-field" type="text" value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="E.g., Smart Attendance System" required />
                </label>

                <label className="field-label">
                  Description
                  <textarea className="input-field textarea-field" value={pDescription} onChange={(e) => setPDescription(e.target.value)} placeholder="Briefly describe the problem, solution, and impact..." rows={4} required />
                </label>

                <div className="form-row">
                  <label className="field-label">
                    Category
                    <select className="input-field select-field" value={pCategory} onChange={(e) => setPCategory(e.target.value)}>
                      <option value="">Select Category</option>
                      <option value="Web Development">Web Development</option>
                      <option value="Mobile App">Mobile App</option>
                      <option value="Machine Learning">Machine Learning</option>
                      <option value="IoT / Hardware">IoT / Hardware</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="field-label">
                    GitHub / Demo Link
                    <input className="input-field" type="url" value={pLink} onChange={(e) => setPLink(e.target.value)} placeholder="Paste project repository or live link" />
                  </label>
                </div>

                <label className="field-label">
                  Tech Stack
                  <input className="input-field" type="text" value={pTechStack} onChange={(e) => setPTechStack(e.target.value)} placeholder="E.g., React, Node.js, MongoDB" />
                </label>

                <label className="field-label">
                  Upload File (optional)
                  <input className="input-field" type="file" onChange={(e) => setPFile(e.target.files?.[0]?.name || "")} />
                </label>

                <div className="project-form-actions">
                  <button type="button" className="outline-pill small-outline" onClick={handleCancelProject}>Cancel</button>
                  <button type="submit" className="login-btn">{editingProjectId ? "Update Project" : "Save Project"}</button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ========== PROJECT DETAILS VIEW (includes feedback) ========== */}
        {view === "projectDetails" && selectedProject && (
          <section className="project-details-wrapper">
            <div className="panel project-details-panel">
              <div className="panel-header">
                <h2 className="panel-title">{selectedProject.title}</h2>
                <button className="outline-pill small-outline" onClick={handleBackFromDetails}>Back to Dashboard</button>
              </div>

              <p className="project-details-description">{selectedProject.description}</p>

              <div className="project-details-meta">
                <span>🏷 {selectedProject.category}</span>
                {selectedProject.techStack && <span>💻 {selectedProject.techStack}</span>}
                {selectedProject.link && <span>🔗 <a href={selectedProject.link} target="_blank" rel="noreferrer">View Project</a></span>}
                {selectedProject.file && <span>📎 {selectedProject.file}</span>}
                <span>📅 Last updated: {selectedProject.lastUpdated}</span>
              </div>

              <div className="project-progress-row">
                <div className="progress-block">
                  <div className="progress-header"><span>Progress</span><span>{selectedProject.progress}%</span></div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${selectedProject.progress}%` }} /></div>
                </div>

                <div className="status-block">
                  <span className="status-label">Status</span>
                  <span className={`status-pill status-${selectedProject.status.replace(" ", "").toLowerCase()}`}>{selectedProject.status}</span>
                  {selectedProject.status === "Draft" && <button className="small-primary-btn" onClick={handleMarkInReview}>Submit for Review</button>}
                </div>
              </div>

              <div className="milestones-section">
                <h3 className="milestones-title">Milestones</h3>
                {(!selectedProject.milestones || selectedProject.milestones.length === 0) ? (
                  <p className="empty-text">No milestones yet. Add milestones to track your progress.</p>
                ) : (
                  <ul className="milestones-list">
                    {selectedProject.milestones.map((m) => (
                      <li key={m.id} className="milestone-item">
                        <label className="milestone-label">
                          <input type="checkbox" checked={m.completed} onChange={() => handleToggleMilestone(m.id)} />
                          <span className={m.completed ? "milestone-text done" : "milestone-text"}>{m.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                <form className="milestone-add-form" onSubmit={handleAddMilestone}>
                  <input type="text" className="input-field milestone-input" value={newMilestoneText} onChange={(e) => setNewMilestoneText(e.target.value)} placeholder="Add a new milestone (e.g., UI completed)" />
                  <button type="submit" className="small-primary-btn">Add</button>
                </form>
              </div>

              {/* -------- Feedback Section -------- */}
              <div className="panel" style={{ marginTop: "1rem" }}>
                <div className="panel-header">
                  <h3 className="panel-title">Faculty Feedback</h3>
                  <p className="panel-subtitle">Feedback submitted by your faculty for this project</p>
                </div>

                {getFeedbackForProject(selectedProject.id).length === 0 ? (
                  <p className="empty-text">No feedback for this project yet.</p>
                ) : (
                  <div className="project-list">
                    {getFeedbackForProject(selectedProject.id).map((f, idx) => (
                      <div key={idx} className="feedback-card" style={{ padding: "1rem", borderRadius: 10, marginBottom: "0.75rem", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong>{f.projectTitle || selectedProject.title}</strong>
                          <span style={{ fontSize: "0.85rem", color: "#444" }}>{f.status || ""}</span>
                        </div>
                        <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{f.comment || "No comment provided."}</p>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
                          <span>Faculty: {f.faculty || "Faculty"}</span>
                          <span>{f.date || ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========== PROJECTS PAGE VIEW ========== */}
        {view === "projects" && (
          <section className="project-list-view">
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">My Projects</h2>
                <button className="small-primary-btn" onClick={() => { resetProjectForm(); setEditingProjectId(null); setView("addProject"); }}>+ New Project</button>
              </div>

              {projects.length === 0 ? <p className="empty-text">No projects found. Create your first project 🚀</p> : (
                <div className="project-list">
                  {projects.map((p) => (
                    <div key={p.id} className="project-card full">
                      <h3 className="project-title">{p.title}</h3>
                      <div className="project-tags">
                        <span>🏷 {p.category}</span>
                        {p.techStack && <span>💻 {p.techStack}</span>}
                        <span>📈 {p.progress}%</span>
                        <span>📅 {p.lastUpdated}</span>
                      </div>
                      {p.file && <p className="project-file">📎 File: {p.file}</p>}
                      <div className="project-actions">
                        <button className="action-btn read" onClick={() => openProjectDetails(p.id)}>🔍 Read</button>
                        <button className="action-btn edit" onClick={() => { setPTitle(p.title); setPDescription(p.description); setPCategory(p.category); setPLink(p.link); setPTechStack(p.techStack); setPFile(p.file || ""); setEditingProjectId(p.id); setView("addProject"); }}>✏ Modify</button>
                        <button className="action-btn delete" onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))}>🗑 Delete</button>
                        {getFeedbackForProject(p.id).length > 0 ? (
                          <button className="action-btn feedback" onClick={() => openProjectDetails(p.id)}>💬 Feedback</button>
                        ) : (
                          <button className="action-btn feedback disabled" disabled>💬 No feedback</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Portfolio view */}
        {view === "portfolio" && (
          <PortfolioEditor projects={projects} setProjects={setProjects} studentId={studentId} />
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
