import React from 'react';
import EditableList from '../components/EditableList';
import UserAccessGuideCard from '../components/UserAccessGuideCard';
import { SEED } from '../data/seed';

export default function Settings({ db = {}, setList, resetDB, onNavigate, loggedInUser, isAdmin }) {
  const safeDb = db || {};
  const settings = safeDb.settings || SEED.settings;

  const isPmUser = !isAdmin || loggedInUser?.role?.toLowerCase().includes('manager') || 
                   loggedInUser?.userType?.toLowerCase().includes('manager') ||
                   loggedInUser?.username === 'projectmanager' ||
                   loggedInUser?.name === 'Saurabh M.' ||
                   loggedInUser?.name === 'Tharun';

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Back Button */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          className="btn sec sm"
          onClick={() => onNavigate ? onNavigate("projects") : (window.history.length > 1 ? window.history.back() : null)}
          style={{ padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", background: "#fff", border: "1px solid var(--line)" }}
        >
          ← Back
        </button>
      </div>
      <div className="split-1-1">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Staff & Project Managers Portal Access Card */}
        <div className="card" style={{ padding: 20, background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#fff", borderRadius: 14, boxShadow: "0 4px 16px rgba(15,23,42,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, color: "#60a5fa" }}>
                Dedicated Team & Management Portals
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0", color: "#fff" }}>
                {isPmUser ? "Project Manager's Team & Client Portals" : "Company Staff & Project Managers"}
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
                {isPmUser 
                  ? "View your assigned project teammates, task progress metrics, and client organization portals."
                  : "Access all company staff records, view project manager portfolios and their committed projects."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button 
                className="btn pri sm" 
                onClick={() => onNavigate && onNavigate(isAdmin ? "staff_mgmt" : "pm_staff_portal")}
                style={{ background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
              >
                👥 Staff Portal
              </button>
              {isAdmin && (
                <>
                  <button 
                    className="btn sm" 
                    onClick={() => onNavigate && onNavigate("pms")}
                    style={{ background: "#8b5cf6", color: "#fff", border: "none", fontWeight: 700, borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
                  >
                    👑 Project Managers Portal
                  </button>
                </>
              )}
              <button 
                className="btn sec sm" 
                onClick={() => onNavigate ? onNavigate("clients") : window.location.href = "/client"}
                style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)", background: "rgba(56, 189, 248, 0.1)", borderRadius: 8, padding: "8px 12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}
              >
                🏢 Client Portal ↗
              </button>
            </div>
          </div>
        </div>
        <EditableList
          title="Services / categories"
          hint="Used in the Service field when creating a project."
          items={settings.categories || SEED.settings.categories}
          onChange={(arr) => setList("categories", arr)}
        />
        <EditableList
          title="Task statuses"
          hint="The options a task can move through (click a task's chip to cycle them)."
          items={settings.taskStatuses || SEED.settings.taskStatuses}
          onChange={(arr) => setList("taskStatuses", arr)}
        />
        <EditableList
          title="Project statuses"
          hint="The overall state of a project."
          items={settings.projectStatuses || SEED.settings.projectStatuses}
          onChange={(arr) => setList("projectStatuses", arr)}
        />
        <EditableList
          title="Disciplines"
          hint="Tasks are grouped under these inside each project."
          items={settings.disciplines || SEED.settings.disciplines}
          onChange={(arr) => setList("disciplines", arr)}
        />
      </div>
      <div>
        <UserAccessGuideCard />
      </div>
    </div>
    </div>
  );
}
