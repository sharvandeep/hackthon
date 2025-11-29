import React, { useState, useEffect } from "react";
import "./PortfolioEditor.css";

const PortfolioEditor = ({ projects, setProjects }) => {
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [links, setLinks] = useState({ github: "", linkedin: "", website: "" });

  useEffect(() => {
    const saved = localStorage.getItem("portfolioInfo");
    if (saved) {
      const parsed = JSON.parse(saved);
      setFullName(parsed.fullName || "");
      setHeadline(parsed.headline || "");
      setSummary(parsed.summary || "");
      setSkills(parsed.skills || []);
      setLinks(parsed.links || { github: "", linkedin: "", website: "" });
    }
  }, []);

  const handleSave = () => {
    const data = { fullName, headline, summary, skills, links };
    localStorage.setItem("portfolioInfo", JSON.stringify(data));
  };

  const handleClear = () => {
    setFullName("");
    setHeadline("");
    setSummary("");
    setSkills([]);
    setLinks({ github: "", linkedin: "", website: "" });
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const toggleFeatured = (projectId) => {
    const updated = projects.map((p) =>
      p.id === projectId ? { ...p, featured: !p.featured } : p
    );
    setProjects(updated);
    localStorage.setItem("projects_" + localStorage.getItem("studentId"), JSON.stringify(updated));
  };

  const featuredProjects = projects.filter((p) => p.featured);

  return (
    <div className="portfolio-editor-container">
      <div className="editor-panel">
        <div className="panel-header">
          <span className="mode-label">Editing</span>
          <div className="edit-actions">
            <button onClick={handleSave}>Save</button>
            <button onClick={() => window.location.reload()}>Load</button>
            <button onClick={handleClear}>Clear</button>
          </div>
        </div>
        <h2>Edit your details</h2>

        <label>Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
        </label>

        <label>Headline
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g., Frontend Developer" />
        </label>

        <label>Summary
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short bio, focus areas, and goals" rows={4} />
        </label>

        <label>Skills
          <div className="skills-input-row">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              placeholder="Type a skill and press Add or enter"
            />
            <button onClick={addSkill}>Add</button>
          </div>
        </label>

        <div className="skills-chips">
          {skills.map((s) => (
            <span key={s} className="chip" onClick={() => removeSkill(s)}>{s} ×</span>
          ))}
        </div>

        <label>Links
          <input value={links.github} onChange={(e) => setLinks({ ...links, github: e.target.value })} placeholder="GitHub URL" />
          <input value={links.linkedin} onChange={(e) => setLinks({ ...links, linkedin: e.target.value })} placeholder="LinkedIn URL" />
          <input value={links.website} onChange={(e) => setLinks({ ...links, website: e.target.value })} placeholder="Personal website/portfolio URL" />
        </label>
      </div>

      <div className="preview-panel">
        <div className="preview-header">
          <button className="preview-button">Preview</button>
        </div>
        <h2>{fullName || "Your Name"}</h2>
        <p className="preview-sub">{headline || "Role"}</p>

        <div className="preview-block">
          <h4>About</h4>
          <p>{summary || "Write a short summary about strengths, interests, and goals."}</p>
        </div>

        <div className="preview-block">
          <h4>Skills</h4>
          <p>{skills.length > 0 ? skills.join(", ") : "No skills listed."}</p>
        </div>

        <div className="preview-block">
          <h4>Resume</h4>
          <p>No resume selected.</p>
        </div>

        <div className="preview-block">
          <h4>Links</h4>
          {links.github && <p>🔗 GitHub: {links.github}</p>}
          {links.linkedin && <p>🔗 LinkedIn: {links.linkedin}</p>}
          {links.website && <p>🔗 Website: {links.website}</p>}
          {!links.github && !links.linkedin && !links.website && <p>No links added.</p>}
        </div>

        <div className="preview-block">
          <h4>Featured Projects</h4>
          {featuredProjects.length === 0 ? (
            <p>No featured projects.</p>
          ) : (
            featuredProjects.map((p) => (
              <div key={p.id} className="portfolio-project-preview">
                <strong>{p.title}</strong>
                <p>{p.description.slice(0, 100)}...</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="portfolio-bottom">
        <h3>Your Projects</h3>
        <div className="bottom-projects">
          {projects.map((p) => (
            <div key={p.id} className="bottom-project-card">
              <div className="bottom-project-info">
                <h4>{p.title}</h4>
                <p>{p.description}</p>
              </div>
              <div className="bottom-project-actions">
                <button
                  className={`btn ${p.featured ? "btn-warning" : "btn-primary"}`}
                  onClick={() => toggleFeatured(p.id)}
                >
                  {p.featured ? "Remove from Portfolio" : "Add to Portfolio"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioEditor;