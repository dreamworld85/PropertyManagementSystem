import React, { useState } from 'react';
import Avatar from '../components/Avatar';

export default function ProjectManagersAdmin({ db = {}, refresh, onSelectProject }) {
  const users = db.users || [];
  const projects = db.projects || [];

  const pmList = users.filter(u => 
    (u.role || '').toLowerCase() === 'project_manager' || 
    (u.role || '').toLowerCase().includes('project manager') ||
    (u.username || '').toLowerCase() === 'projectmanager'
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPm, setEditingPm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    discipline: 'MEP'
  });

  const handleOpenAdd = () => {
    setEditingPm(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      discipline: 'MEP'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pm) => {
    setEditingPm(pm);
    setFormData({
      name: pm.name || '',
      username: pm.username || '',
      email: pm.email || '',
      phone: pm.phone || '',
      password: '',
      discipline: pm.discipline || 'MEP'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Project Manager Name is required');
      return;
    }

    try {
      if (editingPm) {
        // Edit existing PM
        const res = await fetch(`/api/users/${editingPm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            discipline: formData.discipline,
            role: 'project_manager'
          })
        });
        if (!res.ok) throw new Error('Failed to update Project Manager');
        alert(`✅ Project Manager '${formData.name}' updated successfully!`);
      } else {
        // Create new PM
        const res = await fetch('/api/create-pm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create Project Manager');
        }
        alert(`✅ Project Manager '${formData.name}' created successfully with isolated data scope!`);
      }

      setIsModalOpen(false);
      if (refresh) refresh();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (pm) => {
    if (!window.confirm(`Are you sure you want to delete Project Manager '${pm.name}'?`)) return;
    try {
      const res = await fetch(`/api/users/${pm.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete Project Manager');
      alert(`✅ Project Manager '${pm.name}' deleted successfully.`);
      if (refresh) refresh();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              👑
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 }}>
                System Administration
              </div>
              <h2 className="disp" style={{ margin: '2px 0 0 0', fontSize: 22, color: '#fff', fontWeight: 800 }}>
                Project Managers Directory ({pmList.length})
              </h2>
            </div>
          </div>
          <button
            className="btn"
            onClick={handleOpenAdd}
            style={{
              background: '#2563eb',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <span>＋</span> Create Project Manager
          </button>
        </div>
      </div>

      {/* Grid of PM Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {pmList.map(pm => {
          const pmProjectsList = projects.filter(p => 
            String(p.pm_id).toLowerCase() === String(pm.id).toLowerCase() || 
            String(p.projectManagerId).toLowerCase() === String(pm.id).toLowerCase() ||
            (p.project_manager && String(p.project_manager).toLowerCase() === String(pm.name).toLowerCase())
          );

          return (
            <div key={pm.id || pm.username} className="card" style={{ padding: 18, background: '#fff', borderRadius: 16, border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 260 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar name={pm.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                      Project Manager
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 15, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pm.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                      @{pm.username || pm.name.toLowerCase().replace(/\s+/g, '')}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 10, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Discipline:</span>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{pm.discipline || 'MEP'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Email:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent2)' }}>{pm.email || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Phone:</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{pm.phone || '—'}</span>
                  </div>
                </div>

                {/* COMMITTED PROJECTS LIST FOR THIS PM */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: ".4px", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>📁</span> Committed Projects ({pmProjectsList.length})
                  </div>
                  {pmProjectsList.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto", paddingRight: 2 }}>
                      {pmProjectsList.map(proj => (
                        <div
                          key={proj.id}
                          onClick={() => {
                            if (onSelectProject) {
                              onSelectProject(proj.id);
                            }
                          }}
                          title="Click to view project administration details"
                          style={{
                            padding: "4px 8px",
                            background: "#f8fafc",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f0f7ff";
                            e.currentTarget.style.borderColor = "#93c5fd";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#f8fafc";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 11.5, color: "#1e40af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              🔗 {proj.name}
                            </div>
                            <div style={{ fontSize: 9.5, color: "#64748b" }}>{proj.category || "Engineering"}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#2563eb" }}>{proj.progress || 0}%</span>
                            <span className="pill" style={{ fontSize: 9, padding: "1px 5px", background: "#dcfce7", color: "#15803d", fontWeight: 700 }}>
                              {proj.status || "Active"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 6, border: "1px dashed #cbd5e1", fontSize: 10.5, color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>
                      No projects currently assigned to this PM.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <span className="pill" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 10.5, fontWeight: 700 }}>
                  {pmProjectsList.length} Committed Project{pmProjectsList.length !== 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleOpenEdit(pm)}
                    className="btn sec sm"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pm)}
                    className="btn sec sm"
                    style={{ padding: '3px 8px', fontSize: 11, color: 'var(--red)', borderColor: 'var(--red)' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {pmList.length === 0 && (
          <div className="card empty" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👑</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>No Project Managers Registered</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              Click "＋ Create Project Manager" above to register a new PM with dedicated login credentials.
            </div>
          </div>
        )}
      </div>

      {/* Modal for Creating / Editing PM */}
      {isModalOpen && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 480, width: '90%', padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {editingPm ? '✏️ Edit Project Manager' : '👑 Create New Project Manager'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="inp"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
                  Username *
                </label>
                <input
                  type="text"
                  className="inp"
                  required
                  placeholder="e.g. sjenkins"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingPm}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="inp"
                    placeholder="pm@dgec.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="inp"
                    placeholder="+968 9876 5432"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
                    Discipline / Dept
                  </label>
                  <select
                    className="inp"
                    value={formData.discipline}
                    onChange={e => setFormData({ ...formData, discipline: e.target.value })}
                  >
                    <option value="MEP">MEP Engineering</option>
                    <option value="Structure">Structural Engineering</option>
                    <option value="Architecture">Architecture</option>
                    <option value="PMC">Project Management</option>
                  </select>
                </div>

                {!editingPm && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
                      Login Password *
                    </label>
                    <input
                      type="password"
                      className="inp"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn sec" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" style={{ background: '#2563eb', color: '#fff' }}>
                  {editingPm ? 'Save Changes' : 'Create Project Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
