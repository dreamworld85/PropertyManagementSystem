import React from 'react';
import EditableList from '../components/EditableList';
import UserAccessGuideCard from '../components/UserAccessGuideCard';
import { SEED } from '../data/seed';

export default function Settings({ db = {}, setList, resetDB }) {
  const safeDb = db || {};
  const settings = safeDb.settings || SEED.settings;

  return (
    <div className="split-1-1">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="card" style={{ padding: 16, background: "#fff" }}>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            ⚠️ This shared link has no separate logins — anyone with the link can view and edit everything, including switching to the client preview. Keep the link within your team. For real, locked client logins, use the Supabase version.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn sec sm" style={{ color: "var(--red)", borderColor: "var(--red)" }} onClick={resetDB}>
              ⚠ Reset to Seed Data
            </button>
            <a href="/admin" className="btn sec sm" style={{ textDecoration: "none", color: "var(--accent)" }}>
              👑 Go to Admin Portal
            </a>
            <a href="/staff" className="btn sec sm" style={{ textDecoration: "none", color: "var(--green)" }}>
              🛠 Go to Staff Portal
            </a>
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
  );
}
