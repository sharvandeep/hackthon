import React, { useState, useEffect } from "react";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const StudentDashboard = ({ user, onLogout }) => {
  const studentId = user?.id || "Student";

  // view: "dashboard" | "addProject" | "projectDetails" | "projects"
  const [view, setView] = useState("dashboard");

  // Projects state
  const [projects, setProjects] = useState([]);

  // Load projects for this student
  useEffect(() => {
    if (!studentId) return;
    const key = `projects_${studentId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setProjects(JSON.parse(raw));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  }, [studentId]);

  // Save projects when they change
  useEffect(() => {
    if (!studentId) return;
    const key = `projects_${studentId}`;
    try {
      localStorage.setItem(key, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects, studentId]);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);

  // Add Project form fields
  const [pTitle, setPTitle] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pCategory, setPCategory] = useState("");
  const [pLink, setPLink] = useState("");
  const [pTechStack, setPTechStack] = useState("");
  const [pFile, setPFile] = useState("");

  const [newMilestoneText, setNewMilestoneText] = useState("");

  const stats = {
    total: projects.length,
    inReview: projects.filter((p) => p.status === "In Review").length,
    approved: projects.filter((p) => p.status === "Approved").length,
    drafts: projects.filter((p) => p.status === "Draft").length,
  };

  // Calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const today = new Date();
  const isSameMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const calendarCells = [];
  for (let i = 0; i < startDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helpers
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

  // Add / Edit Project
  const handleProjectSubmit = (e) => {
    e.preventDefault();
    if (!pTitle || !pDescription) {
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

  // Details helpers
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
        {
          id: Date.now(),
          text: newMilestoneText.trim(),
          completed: false,
        },
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
    updateProject(selectedProject.id, (p) => ({
      ...p,
      status: "In Review",
    }));
  };

  const handleBackFromDetails = () => {
    setSelectedProjectId(null);
    setNewMilestoneText("");
    setView("dashboard");
  };

  // JSX
  return (
    <div className="dashboard-root">
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
          <button className="nav-pill">Portfolios</button>
          <button className="nav-pill">Feedback</button>
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
            {studentId?.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* DASHBOARD VIEW */}
        {view === "dashboard" && (
          <>
            <section className="welcome-section">
              <h1 className="welcome-title">Welcome back, {studentId}!</h1>
              <p className="welcome-subtitle">
                Here’s what’s happening with projects today.
              </p>
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
                <p className="stat-value stat-value-success">
                  {stats.approved}
                </p>
                <p className="stat-subtext">Successfully evaluated projects</p>
              </div>
              <div className="stat-card big">
                <p className="stat-label">Drafts</p>
                <p className="stat-value">{stats.drafts}</p>
                <p className="stat-subtext">Not yet submitted</p>
              </div>
            </section>

            <section className="bottom-grid">
              {/* My Projects */}
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
                  <p className="empty-text">
                    No projects yet. Click <strong>+ New Project</strong> to add
                    one.
                  </p>
                ) : (
                  <div className="project-list">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        className="project-card project-card-button"
                        onClick={() => openProjectDetails(p.id)}
                      >
                        <div className="project-card-main">
                          <h3 className="project-title">{p.title}</h3>
                          <span
                            className={`status-pill status-${p.status
                              .replace(" ", "")
                              .toLowerCase()}`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="project-description">
                          {p.description.length > 120
                            ? p.description.substring(0, 120) + "..."
                            : p.description}
                        </p>
                        <div className="project-meta">
                          <span className="project-meta-item">
                            🏷 {p.category}
                          </span>
                          {p.techStack && (
                            <span className="project-meta-item">
                              💻 {p.techStack}
                            </span>
                          )}
                          {p.file && (
                            <span className="project-meta-item">
                              📎 {p.file}
                            </span>
                          )}
                          <span className="project-meta-item">
                            📅 {p.lastUpdated}
                          </span>
                          <span className="project-meta-item">
                            📈 {p.progress}% complete
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Calendar */}
              <div className="panel">
                <div className="panel-header calendar-header">
                  <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={goToPrevMonth}
                  >
                    ◀
                  </button>
                  <h2 className="panel-title">
                    {monthNames[month]} {year}
                  </h2>
                  <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={goToNextMonth}
                  >
                    ▶
                  </button>
                </div>

                <div className="calendar">
                  <div className="calendar-grid calendar-grid-header">
                    {weekdayNames.map((day) => (
                      <div key={day} className="calendar-day-name">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="calendar-grid">
                    {calendarCells.map((cell, idx) => {
                      if (cell === null) {
                        return (
                          <div key={idx} className="calendar-day empty" />
                        );
                      }

                      const isToday = isSameMonth && cell === today.getDate();

                      return (
                        <div
                          key={idx}
                          className={`calendar-day ${
                            isToday ? "today" : ""
                          }`}
                        >
                          <span>{cell}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="calendar-footer-text">
                  Today is{" "}
                  <strong>
                    {today.getDate()} {monthNames[today.getMonth()]}{" "}
                    {today.getFullYear()}
                  </strong>
                </p>
              </div>
            </section>
          </>
        )}

        {/* ADD / EDIT PROJECT */}
        {view === "addProject" && (
          <section className="project-form-wrapper">
            <div className="panel project-form-panel">
              <div className="panel-header">
                <h2 className="panel-title">
                  {editingProjectId ? "Edit Project" : "Add New Project"}
                </h2>
                <button
                  className="outline-pill small-outline"
                  onClick={handleCancelProject}
                >
                  Back to Dashboard
                </button>
              </div>

              <form className="project-form" onSubmit={handleProjectSubmit}>
                <label className="field-label">
                  Project Title
                  <input
                    className="input-field"
                    type="text"
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    required
                  />
                </label>

                <label className="field-label">
                  Description
                  <textarea
                    className="input-field textarea-field"
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    rows={4}
                    required
                  />
                </label>

                <div className="form-row">
                  <label className="field-label">
                    Category
                    <select
                      className="input-field select-field"
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                    >
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
                    <input
                      className="input-field"
                      type="url"
                      value={pLink}
                      onChange={(e) => setPLink(e.target.value)}
                    />
                  </label>
                </div>

                <label className="field-label">
                  Tech Stack
                  <input
                    className="input-field"
                    type="text"
                    value={pTechStack}
                    onChange={(e) => setPTechStack(e.target.value)}
                  />
                </label>

                <label className="field-label">
                  Upload File (optional)
                  <input
                    className="input-field"
                    type="file"
                    onChange={(e) =>
                      setPFile(e.target.files?.[0]?.name || "")
                    }
                  />
                </label>

                <div className="project-form-actions">
                  <button
                    type="button"
                    className="outline-pill small-outline"
                    onClick={handleCancelProject}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="login-btn">
                    {editingProjectId ? "Update Project" : "Save Project"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* PROJECT DETAILS */}
        {view === "projectDetails" && selectedProject && (
          <section className="project-details-wrapper">
            <div className="panel project-details-panel">
              <div className="panel-header">
                <h2 className="panel-title">{selectedProject.title}</h2>
                <button
                  className="outline-pill small-outline"
                  onClick={handleBackFromDetails}
                >
                  Back to Dashboard
                </button>
              </div>

              <p className="project-details-description">
                {selectedProject.description}
              </p>

              <div className="project-details-meta">
                <span>🏷 {selectedProject.category}</span>
                {selectedProject.techStack && (
                  <span>💻 {selectedProject.techStack}</span>
                )}
                {selectedProject.link && (
                  <span>
                    🔗{" "}
                    <a
                      href={selectedProject.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Project
                    </a>
                  </span>
                )}
                {selectedProject.file && <span>📎 {selectedProject.file}</span>}
                <span>📅 Last updated: {selectedProject.lastUpdated}</span>
              </div>

              <div className="project-progress-row">
                <div className="progress-block">
                  <div className="progress-header">
                    <span>Progress</span>
                    <span>{selectedProject.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${selectedProject.progress}%` }}
                    />
                  </div>
                </div>

                <div className="status-block">
                  <span className="status-label">Status</span>
                  <span
                    className={`status-pill status-${selectedProject.status
                      .replace(" ", "")
                      .toLowerCase()}`}
                  >
                    {selectedProject.status}
                  </span>
                  {selectedProject.status === "Draft" && (
                    <button
                      className="small-primary-btn"
                      onClick={handleMarkInReview}
                    >
                      Submit for Review
                    </button>
                  )}
                </div>
              </div>

              <div className="milestones-section">
                <h3 className="milestones-title">Milestones</h3>

                {selectedProject.milestones.length === 0 ? (
                  <p className="empty-text">
                    No milestones yet. Add milestones to track your progress.
                  </p>
                ) : (
                  <ul className="milestones-list">
                    {selectedProject.milestones.map((m) => (
                      <li key={m.id} className="milestone-item">
                        <label className="milestone-label">
                          <input
                            type="checkbox"
                            checked={m.completed}
                            onChange={() => handleToggleMilestone(m.id)}
                          />
                          <span
                            className={
                              m.completed
                                ? "milestone-text done"
                                : "milestone-text"
                            }
                          >
                            {m.text}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  className="milestone-add-form"
                  onSubmit={handleAddMilestone}
                >
                  <input
                    type="text"
                    className="input-field milestone-input"
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    placeholder="Add a new milestone (e.g., UI completed)"
                  />
                  <button type="submit" className="small-primary-btn">
                    Add
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* PROJECTS PAGE VIEW */}
        {view === "projects" && (
          <section className="project-list-view">
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
                <p className="empty-text">
                  No projects found. Create your first project 🚀
                </p>
              ) : (
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

                      {p.file && (
                        <p className="project-file">📎 File: {p.file}</p>
                      )}

                      <div className="project-actions">
                        <button
                          className="action-btn read"
                          onClick={() => openProjectDetails(p.id)}
                        >
                          🔍 Read
                        </button>

                        <button
                          className="action-btn edit"
                          onClick={() => {
                            setPTitle(p.title);
                            setPDescription(p.description);
                            setPCategory(p.category);
                            setPLink(p.link);
                            setPTechStack(p.techStack);
                            setPFile(p.file || "");
                            setEditingProjectId(p.id);
                            setView("addProject");
                          }}
                        >
                          ✏ Modify
                        </button>

                        <button
                          className="action-btn delete"
                          onClick={() =>
                            setProjects((prev) =>
                              prev.filter((x) => x.id !== p.id)
                            )
                          }
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
