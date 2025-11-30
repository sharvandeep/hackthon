// StudentDashboard.jsx
import React, { useState, useEffect } from "react";
import PortfolioEditor from "./PortfolioEditor.jsx"; // keep if used

/* StudentDashboard
   - Adds milestone-date selection modal
   - Shows calendar dots for milestone dates
   - Click dot to open popup showing milestones for that date
*/

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const weekdayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const StudentDashboard = ({ user, onLogout }) => {
  const studentId = user?.id || null;

  // view: "dashboard" | "addProject" | "projectDetails" | "projects" | "portfolio"
  const [view, setView] = useState("dashboard");

  // projects and helpers
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

  // feedback list (unchanged behaviour)
  const [feedbackList, setFeedbackList] = useState([]);

  // ---------- New states for date-picker modal and milestone popup ----------
  const [showDatePicker, setShowDatePicker] = useState(false);
  // modal month/year (for date-picker). default to currently showing month
  const [modalYear, setModalYear] = useState(currentDate.getFullYear());
  const [modalMonth, setModalMonth] = useState(currentDate.getMonth());
  // pending milestone text to attach after selecting date
  const [pendingMilestoneText, setPendingMilestoneText] = useState("");

  // popup showing milestones for a selected calendar day
  const [showMilestonePopup, setShowMilestonePopup] = useState(false);
  const [popupDate, setPopupDate] = useState(null);
  const [popupMilestones, setPopupMilestones] = useState([]);

  // ----- load projects for this student -----
  useEffect(() => {
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

    const key = `projects_${studentId}`;
    try {
      const raw = localStorage.getItem(key);
      setProjects(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.warn("Failed to parse projects from localStorage", err);
      setProjects([]);
    }

    // load feedback for this student (unchanged)
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

  // Save projects whenever they change (only after initial load)
  useEffect(() => {
    if (!studentId || !hasLoadedProjects) return;
    const key = `projects_${studentId}`;
    try {
      localStorage.setItem(key, JSON.stringify(projects));
    } catch (err) {
      console.warn("Failed to write projects to localStorage", err);
    }
  }, [projects, studentId, hasLoadedProjects]);

  // reload feedback when either studentId or projects change (faculty might add feedback)
  useEffect(() => {
    if (!studentId) return;
    try {
      const rawf = localStorage.getItem(`feedback_${studentId}`);
      setFeedbackList(rawf ? JSON.parse(rawf) : []);
    } catch (err) {
      console.warn("Failed to parse feedback from localStorage", err);
      setFeedbackList([]);
    }
  }, [studentId, projects]);

  // storage event listener to react to feedback added in other tabs (unchanged)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `feedback_${studentId}`) {
        try {
          const data = JSON.parse(e.newValue || "[]");
          setFeedbackList(data);
        } catch {
          setFeedbackList([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [studentId]);

  // ---------- helpers ----------
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

  // ---------- add/edit project ----------
  const handleProjectSubmit = (e) => {
    e.preventDefault();
    if (!pTitle.trim() || !pDescription.trim()) {
      alert("Please fill in at least title and description.");
      return;
    }

    if (editingProjectId) {
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

  // ---------- project details helpers ----------
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

  // ---------- Milestones: open date-picker modal instead of directly adding ----------
  const openDatePickerForMilestone = (e) => {
    e.preventDefault();
    if (!newMilestoneText.trim()) {
      alert("Please enter milestone text first.");
      return;
    }
    setPendingMilestoneText(newMilestoneText.trim());
    // initialize modal month/year to currentDate or selected project's lastUpdated month
    setModalYear(currentDate.getFullYear());
    setModalMonth(currentDate.getMonth());
    setShowDatePicker(true);
  };

  // when user selects a day in the date-picker modal, attach milestone with that date
  const handleSelectMilestoneDate = (day) => {
    if (!selectedProject) {
      setShowDatePicker(false);
      return;
    }
    // build YYYY-MM-DD string based on modalMonth/modalYear and selected day
    const mm = String(modalMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateString = `${modalYear}-${mm}-${dd}`;

    updateProject(selectedProject.id, (p) => ({
      ...p,
      milestones: [
        ...(p.milestones || []),
        {
          id: Date.now(),
          text: pendingMilestoneText,
          completed: false,
          date: dateString,
        },
      ],
    }));

    // clear and close modal, also clear the input on details page
    setPendingMilestoneText("");
    setNewMilestoneText("");
    setShowDatePicker(false);
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

  // ---------- calendar - dots & popup ----------
  // helper returns array of milestone objects (with projectTitle) for a given 'YYYY-MM-DD' date
  const getMilestonesForDate = (dateString) => {
    if (!projects || projects.length === 0) return [];
    const out = [];
    projects.forEach((proj) => {
      (proj.milestones || []).forEach((ms) => {
        if (ms.date === dateString) {
          out.push({
            ...ms,
            projectTitle: proj.title,
            projectId: proj.id,
          });
        }
      });
    });
    return out;
  };

  // clicking a calendar dot opens popup modal with milestones for that date
  const openMilestonePopup = (dateString) => {
    const list = getMilestonesForDate(dateString);
    setPopupDate(dateString);
    setPopupMilestones(list);
    setShowMilestonePopup(true);
  };

  // ---------- stats ----------
  const stats = {
    total: projects.length,
    inReview: projects.filter((p) => p.status === "In Review").length,
    approved: projects.filter((p) => p.status === "Approved").length,
    drafts: projects.filter((p) => p.status === "Draft").length,
  };

  // ---------- calendar generation for main dashboard (uses currentDate) ----------
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

  // ---------- small helpers to generate modal calendar (month/year stateled) ----------
  const genMonthCells = (mYear, mMonth) => {
    const sOfM = new Date(mYear, mMonth, 1);
    const eOfM = new Date(mYear, mMonth + 1, 0);
    const sDay = sOfM.getDay();
    const count = eOfM.getDate();
    const cells = [];
    for (let i = 0; i < sDay; i++) cells.push(null);
    for (let d = 1; d <= count; d++) cells.push(d);
    return cells;
  };

  // ---------- feedback getter unchanged ----------
  const getFeedbackForProject = (projectId) => {
    if (!feedbackList || !Array.isArray(feedbackList)) return [];
    return feedbackList.filter((f) => Number(f.projectId) === Number(projectId));
  };

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
          {/* feedback removed from navbar */}
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
          <div className="avatar-pill">
            {studentId ? studentId.substring(0, 2).toUpperCase() : "ST"}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* DASHBOARD */}
        {view === "dashboard" && (
          <>
            <section className="welcome-section">
              <h1 className="welcome-title">Welcome back, {studentId}!</h1>
              <p className="welcome-subtitle">
                Here’s what’s happening with projects today.
              </p>
            </section>

            {/* Stats */}
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

            {/* Bottom: Projects list + Calendar */}
            <section className="bottom-grid" style={{ display: "flex", gap: 20 }}>
              <div className="panel" style={{ flex: 1 }}>
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
                  <p className="empty-text">
                    No projects yet. Click <strong>+ New Project</strong> to add one.
                  </p>
                ) : (
                  <div className="project-list">
                    {projects.map((p) => {
                      const projectFeedback = getFeedbackForProject(p.id);
                      return (
                        <div key={p.id} className="project-card full">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <div style={{ flex: 1 }}>
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
                                <button className="action-btn edit" onClick={() => {
                                  setPTitle(p.title); setPDescription(p.description); setPCategory(p.category);
                                  setPLink(p.link); setPTechStack(p.techStack); setPFile(p.file || "");
                                  setEditingProjectId(p.id); setView("addProject");
                                }}>✏ Modify</button>
                                <button className="action-btn delete" onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))}>🗑 Delete</button>

                                {projectFeedback && projectFeedback.length > 0 && (
                                  <button className="action-btn feedback" onClick={() => openProjectDetails(p.id)}>
                                    💬 View Feedback ({projectFeedback.length})
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

              <div className="panel" style={{ width: 420 }}>
                <div className="panel-header calendar-header">
                  <button type="button" className="calendar-nav-btn" onClick={goToPrevMonth}>◀</button>
                  <h2 className="panel-title">{monthNames[month]} {year}</h2>
                  <button type="button" className="calendar-nav-btn" onClick={goToNextMonth}>▶</button>
                </div>

                <div className="calendar">
                  <div className="calendar-grid calendar-grid-header" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {weekdayNames.map((day) => (
                      <div key={day} className="calendar-day-name" style={{ textAlign: "center", fontSize: 12, color: "#7b8794" }}>
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 10 }}>
                    {calendarCells.map((cell, idx) => {
                      if (cell === null) {
                        return <div key={idx} className="calendar-day empty" style={{ height: 46 }} />;
                      }

                      const isToday = isSameMonth && cell === today.getDate();
                      // build date string for this cell
                      const mm = String(month + 1).padStart(2, "0");
                      const dd = String(cell).padStart(2, "0");
                      const dateString = `${year}-${mm}-${dd}`;
                      const milestonesForDay = getMilestonesForDate(dateString);

                      return (
                        <div
                          key={idx}
                          className={`calendar-day ${isToday ? "today" : ""}`}
                          style={{
                            height: 60,
                            padding: 6,
                            borderRadius: 8,
                            background: isToday ? "#eaf6ff" : "transparent",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ fontSize: 13, color: "#1f2937" }}>{cell}</div>

                          {/* dot indicator if there are milestones */}
                          <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
                            {milestonesForDay.length > 0 && (
                              <button
                                onClick={() => openMilestonePopup(dateString)}
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: 12,
                                  background: "#2b7cff",
                                  border: "2px solid white",
                                  boxShadow: "0 4px 8px rgba(43,124,255,0.18)",
                                  cursor: "pointer",
                                }}
                                title={`${milestonesForDay.length} milestone(s)`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="calendar-footer-text" style={{ marginTop: 12, color: "#6b7280" }}>
                  Today is{" "}
                  <strong>
                    {today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear()}
                  </strong>
                </p>
              </div>
            </section>
          </>
        )}

        {/* Add / Edit project */}
        {view === "addProject" && (
          <section className="project-form-wrapper">
            <div className="panel project-form-panel">
              <div className="panel-header">
                <h2 className="panel-title">{editingProjectId ? "Edit Project" : "Add New Project"}</h2>
                <button className="outline-pill small-outline" onClick={handleCancelProject}>Back to Dashboard</button>
              </div>

              <form className="project-form" onSubmit={handleProjectSubmit}>
                <label className="field-label">Project Title
                  <input className="input-field" type="text" value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="E.g., Smart Attendance System" required />
                </label>

                <label className="field-label">Description
                  <textarea className="input-field textarea-field" value={pDescription} onChange={(e) => setPDescription(e.target.value)} placeholder="Briefly describe the problem, solution, and impact..." rows={4} required />
                </label>

                <div className="form-row">
                  <label className="field-label">Category
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

                  <label className="field-label">GitHub / Demo Link
                    <input className="input-field" type="url" value={pLink} onChange={(e) => setPLink(e.target.value)} placeholder="Paste project repository or live link" />
                  </label>
                </div>

                <label className="field-label">Tech Stack
                  <input className="input-field" type="text" value={pTechStack} onChange={(e) => setPTechStack(e.target.value)} placeholder="E.g., React, Node.js, MongoDB" />
                </label>

                <label className="field-label">Upload File (optional)
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

        {/* Project details (includes milestone add -> date flow) */}
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

              <div className="project-progress-row" style={{ display: "flex", gap: 20, marginTop: 14 }}>
                <div className="progress-block" style={{ flex: 1 }}>
                  <div className="progress-header" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Progress</span><span>{selectedProject.progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ marginTop: 8 }}>
                    <div className="progress-bar-fill" style={{ width: `${selectedProject.progress}%` }} />
                  </div>
                </div>

                <div className="status-block" style={{ width: 240 }}>
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
                      <li key={m.id} className="milestone-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input type="checkbox" checked={m.completed} onChange={() => handleToggleMilestone(m.id)} />
                            <span className={m.completed ? "milestone-text done" : "milestone-text"}>
                              {m.text}
                              {m.date ? <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>— {m.date}</span> : null}
                            </span>
                          </label>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          {/* Optionally allow removing milestone */}
                          <button
                            className="action-btn"
                            onClick={() => {
                              updateProject(selectedProject.id, (p) => ({
                                ...p,
                                milestones: p.milestones.filter((x) => x.id !== m.id),
                              }));
                            }}
                            title="Remove milestone"
                          >
                            🗑
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Instead of immediate add, open calendar modal for date selection */}
                <form className="milestone-add-form" onSubmit={(e) => { e.preventDefault(); openDatePickerForMilestone(e); }}>
                  <input
                    type="text"
                    className="input-field milestone-input"
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    placeholder="Add a new milestone (e.g., UI completed)"
                  />
                  <button type="submit" className="small-primary-btn">Add</button>
                </form>
              </div>

              {/* Feedback display remains unchanged */}
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

        {/* Projects list page (unchanged except feedback button kept) */}
        {view === "projects" && (
          <section className="project-list-view">
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">My Projects</h2>
                <button className="small-primary-btn" onClick={() => { resetProjectForm(); setEditingProjectId(null); setView("addProject"); }}>+ New Project</button>
              </div>

              {projects.length === 0 ? <p className="empty-text">No projects found. Create your first project 🚀</p> : (
                <div className="project-list">
                  {projects.map(p => (
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
                        {getFeedbackForProject(p.id).length > 0 && <button className="action-btn feedback" onClick={() => openProjectDetails(p.id)}>💬 Feedback</button>}
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

      {/* ---------------------------
            Date-picker Modal (for adding milestone date)
           --------------------------- */}
      {showDatePicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => { setShowDatePicker(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360,
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 20px 60px rgba(7,11,20,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Select date for milestone</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="action-btn" onClick={() => setModalMonth(modalMonth - 1)}>&lt;</button>
                <button className="action-btn" onClick={() => setModalMonth(modalMonth + 1)}>&gt;</button>
              </div>
            </div>

            <div style={{ marginTop: 10, marginBottom: 8, display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
              <button className="action-btn" onClick={() => { setModalYear(modalYear - 1); }}>-Y</button>
              <div style={{ fontWeight: 700 }}>{monthNames[(modalMonth + 12) % 12]} {modalYear}</div>
              <button className="action-btn" onClick={() => { setModalYear(modalYear + 1); }}>+Y</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 8 }}>
              {weekdayNames.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>{d}</div>)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 8 }}>
              {genMonthCells(modalYear, modalMonth).map((cell, idx) => {
                if (cell === null) return <div key={idx} style={{ height: 36 }} />;
                // build date string for cell and show small indicator if there are milestones already (optional)
                const mm = String(modalMonth + 1).padStart(2, "0");
                const dd = String(cell).padStart(2, "0");
                const dString = `${modalYear}-${mm}-${dd}`;
                const existing = getMilestonesForDate(dString);
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectMilestoneDate(cell)}
                    style={{
                      height: 44,
                      borderRadius: 8,
                      border: "1px solid rgba(15,20,30,0.06)",
                      background: existing.length ? "#f0fbff" : "#fff",
                      cursor: "pointer"
                    }}
                    title={existing.length ? `${existing.length} milestone(s) exist` : ""}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 13 }}>{cell}</div>
                      {existing.length > 0 && <div style={{ width: 8, height: 8, borderRadius: 8, background: "#2b7cff" }} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button className="outline-pill" onClick={() => { setShowDatePicker(false); }}>Cancel</button>
              <button className="primary-pill" onClick={() => setShowDatePicker(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------
            Milestone popup modal (shows milestones for selected date)
          --------------------------- */}
      {showMilestonePopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
          }}
          onClick={() => { setShowMilestonePopup(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              maxHeight: "70vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 18,
              boxShadow: "0 30px 80px rgba(7,11,20,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Milestones on {popupDate}</strong>
              <button className="action-btn" onClick={() => setShowMilestonePopup(false)}>Close</button>
            </div>

            <div style={{ marginTop: 12 }}>
              {popupMilestones.length === 0 ? (
                <p>No milestones for this date.</p>
              ) : (
                popupMilestones.map((m) => (
                  <div key={m.id} style={{ padding: 12, borderRadius: 8, background: "#fbfdff", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{m.projectTitle}</strong>
                      <small style={{ color: "#6b7280" }}>{m.completed ? "Done" : "Pending"}</small>
                    </div>
                    <div style={{ marginTop: 6 }}>{m.text}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      {/* Jump to project details button */}
                      <button className="action-btn" onClick={() => {
                        // open that project details and scroll to milestone (simple)
                        setShowMilestonePopup(false);
                        openProjectDetails(m.projectId);
                      }}>Open Project</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
