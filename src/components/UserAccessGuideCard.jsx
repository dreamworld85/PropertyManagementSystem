import React from 'react';

export default function UserAccessGuideCard() {
  return (
    <div className="card" style={{ padding: 20, background: "#fff" }}>
      <div className="h3 disp" style={{ fontSize: 14, marginBottom: 8, color: "var(--ink)" }}>🔐 User Access Management Guide</div>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
        Since this dashboard operates on shared client-side local storage, follow these steps to add or remove dashboard access for team members:
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
        <div style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 8 }}>
          <b style={{ color: "var(--text)" }}>Adding a New User:</b>
          <p className="muted" style={{ marginTop: 2 }}>Click "Add member" in the Team directory. Once added, their name will appear in task assignments and the Active User selector in the sidebar.</p>
        </div>
        <div style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 8 }}>
          <b style={{ color: "var(--text)" }}>Removing a User:</b>
          <p className="muted" style={{ marginTop: 2 }}>To remove a user, reassign their tasks and delete or clean up their records in the database settings.</p>
        </div>
        <div style={{ borderLeft: "2px solid var(--accent2)", paddingLeft: 8 }}>
          <b style={{ color: "var(--text)" }}>Deploying to Supabase (Production):</b>
          <p className="muted" style={{ marginTop: 2 }}>For production access control, use Supabase Authentication. Go to your Supabase Dashboard → Authentication → Users → click "Invite User" to send an email invitation, or select a user and click "Delete User" to revoke their login access instantly.</p>
        </div>
      </div>
    </div>
  );
}
