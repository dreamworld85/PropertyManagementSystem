import React, { useState } from 'react';
import Avatar from '../components/Avatar';

export default function ProjectManagersFullData({ db = {}, onOpenProject, commit, updateUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPmId, setExpandedPmId] = useState(null);
  
  // Create PM Modal State
  const [showCreatePmModal, setShowCreatePmModal] = useState(false);
  const [newPmName, setNewPmName] = useState('');
  const [newPmUsername, setNewPmUsername] = useState('');
  const [newPmEmail, setNewPmEmail] = useState('');
  const [newPmPhone, setNewPmPhone] = useState('');
  const [newPmDiscipline, setNewPmDiscipline] = useState('Full Engineering Management');
  const [newPmPassword, setNewPmPassword] = useState('dgec123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = db.users || [];
  const projects = db.projects || [];
  const tasks = db.tasks || [];
  const clients = db.clients || [];

  // Filter all Project Managers in the company
  const pmList = users.filter(u => 
    (u.role || '').toLowerCase() === 'project_manager' || 
    (u.role || '').toLowerCase().includes('project manager') ||
    (u.username || '').toLowerCase() === 'projectmanager' ||
    u.name === 'Saurabh M.' ||
    u.name === 'Tharun'
  );

  // Handle Create PM Submit
  const handleCreatePmSubmit = async (e) => {
    e.preventDefault();
    if (!newPmName.trim()) {
      alert("Please enter full name of Project Manager");
      return;
    }
    const uname = newPmUsername.trim() || newPmName.trim().toLowerCase().replace(/\s+/g, '');
    const pmUuid = 'pm_' + Math.random().toString(36).substring(2, 9);
    
    setIsSubmitting(true);
    try {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: pmUuid,
          name: newPmName.trim(),
          contact_number: newPmPhone || '+968 9123 4567',
          email: newPmEmail || `${uname}@dgec.com`,
          role: 'Project Manager'
        })
      });
    } catch(err) {
      console.error("API error creating PM:", err);
    }

    if (commit) {
      commit((d) => {
        const nextUsers = [...(d.users || [])];
        const nextPms = [...(d.pms || d.project_managers || [])];

        const newUser = {
          id: pmUuid,
          uuid: pmUuid,
          name: newPmName.trim(),
          username: uname,
          email: newPmEmail || `${uname}@dgec.com`,
          phone: newPmPhone || '+968 9123 4567',
          role: 'project_manager',
          userType: 'project_manager',
          discipline: newPmDiscipline
        };

        if (!nextUsers.some(u => String(u.name).toLowerCase() === String(newUser.name).toLowerCase())) {
          nextUsers.push(newUser);
        }
        if (!nextPms.some(p => String(p.name).toLowerCase() === String(newUser.name).toLowerCase())) {
          nextPms.push(newUser);
        }

        return {
          ...d,
          users: nextUsers,
          pms: nextPms
        };
      }, `Created new Project Manager: ${newPmName.trim()}`);
    }

    setIsSubmitting(false);
    setShowCreatePmModal(false);
    setNewPmName('');
    setNewPmUsername('');
    setNewPmEmail('');
    setNewPmPhone('');
    alert(`✅ Project Manager "${newPmName.trim()}" created successfully!`);
  };

  // Compile full data for each Project Manager
  const pmFullDataList = pmList.map(pm => {
    const pmIdStr = String(pm.id || pm.uuid || '').toLowerCase();
    const pmNameStr = String(pm.name || '').toLowerCase();

    // 1. Projects managed by this PM
    const pmProjects = projects.filter(p => {
      const pPmIdStr = String(p.pm_id || p.projectManagerId || '').toLowerCase();
      const pPmNameStr = String(p.project_manager || p.pm_name || '').toLowerCase();
      return (pmIdStr && pPmIdStr === pmIdStr) || (pmNameStr && pPmNameStr.includes(pmNameStr)) || (pmNameStr && pmNameStr.includes(pPmNameStr));
    });

    // 2. Financial Portfolio Value
    const totalPortfolioValue = pmProjects.reduce((acc, p) => acc + (parseFloat(p.total_cost || p.totalCost) || 0), 0);

    // 3. Average Project Progress
    const totalProgressSum = pmProjects.reduce((acc, p) => acc + (Number(p.progress) || 0), 0);
    const avgProjectProgress = pmProjects.length > 0 ? Math.round(totalProgressSum / pmProjects.length) : 0;

    // 4. Teammates assigned under this PM's projects
    const pmProjectIds = new Set(pmProjects.map(p => String(p.id || p.uuid)));
    const pmTasks = tasks.filter(t => pmProjectIds.has(String(t.projectId || t.project_id)));

    const assignedTeammateIds = new Set();
    pmTasks.forEach(t => {
      if (t.assignee || t.user_id) assignedTeammateIds.add(String(t.assignee || t.user_id));
    });

    const assignedTeammates = users.filter(u => {
      const uIdStr = String(u.id || u.uuid);
      const uNameStr = String(u.name || '').toLowerCase();
      return assignedTeammateIds.has(uIdStr) || Array.from(assignedTeammateIds).some(tid => tid.toLowerCase() === uNameStr);
    });

    // 5. Scoped Clients
    const clientIds = new Set(pmProjects.map(p => String(p.client_id || p.clientId)));
    const scopedClients = clients.filter(c => clientIds.has(String(c.id || c.uuid)));

    return {
      ...pm,
      pmProjects,
      totalPortfolioValue,
      avgProjectProgress,
      assignedTeammates,
      pmTasks,
      scopedClients
    };
  });

  const filteredPms = pmFullDataList.filter(pm => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (pm.name && pm.name.toLowerCase().includes(q)) ||
      (pm.username && pm.username.toLowerCase().includes(q)) ||
      (pm.discipline && pm.discipline.toLowerCase().includes(q)) ||
      (pm.email && pm.email.toLowerCase().includes(q))
    );
  });

  const grandTotalPortfolioValue = pmFullDataList.reduce((acc, pm) => acc + pm.totalPortfolioValue, 0);
  const grandTotalPmProjects = pmFullDataList.reduce((acc, pm) => acc + pm.pmProjects.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Back Button */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          className="btn sec sm"
          onClick={() => window.history.length > 1 ? window.history.back() : null}
          style={{ padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: '#fff', border: '1px solid var(--line)' }}
        >
          ← Back
        </button>
      </div>

      {/* Executive Header Banner */}
      <div 
        className="card" 
        style={{ 
          padding: '14px 20px', 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 14,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              👑
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 }}>
                Executive Leadership Directory
              </div>
              <h2 className="disp" style={{ margin: '1px 0 0 0', fontSize: 19, color: '#fff', fontWeight: 800 }}>
                Project Managers Portfolio Grid ({pmList.length})
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 11px', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }}>
              Managed Projects: <strong style={{ color: '#818cf8' }}>{grandTotalPmProjects}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 11px', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }}>
              Total Portfolio: <strong style={{ color: '#34d399' }}>AED {grandTotalPortfolioValue.toLocaleString()}</strong>
            </div>

            {/* CREATE PROJECT MANAGER BUTTON */}
            <button
              className="btn sm"
              onClick={() => setShowCreatePmModal(true)}
              style={{
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
              }}
            >
              ＋ Create Project Manager
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
          <input
            type="text"
            className="inp"
            placeholder="🔍 Search Project Managers by name, email, or discipline…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 12, height: 34, fontSize: 12, borderRadius: 8, background: '#fff' }}
          />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
          Showing {filteredPms.length} of {pmList.length} PM Grid Cards
        </div>
      </div>

      {/* OPTIMIZED MULTI-COLUMN RESPONSIVE GRID LAYOUT */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: 14,
          alignItems: 'start'
        }}
      >
        {filteredPms.map((pm) => {
          const pmId = pm.id || pm.uuid;
          const isExpanded = expandedPmId === pmId;

          return (
            <div 
              key={pmId}
              className="card" 
              style={{ 
                padding: 16, 
                background: '#fff', 
                borderRadius: 14, 
                border: '1px solid var(--line)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'all 0.15s ease'
              }}
            >
              {/* TOP PROFILE HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={pm.name} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pm.name}
                      </h3>
                      <span className="pill" style={{ background: '#f3e8ff', color: '#7e22ce', fontWeight: 800, fontSize: 10, padding: '1px 6px' }}>
                        👑 PM
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>{pm.discipline || 'MEP'}</span> · @{pm.username || pm.name.toLowerCase().replace(/\s+/g, '')}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setExpandedPmId(isExpanded ? null : pmId)}
                  className="btn sec sm"
                  style={{ fontSize: 10.5, borderRadius: 6, padding: '3px 8px', fontWeight: 700, height: 26 }}
                >
                  {isExpanded ? 'Hide ▲' : 'More Details ▼'}
                </button>
              </div>

              {/* 4 COMPACT METRICS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Projects:</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>{pm.pmProjects.length} Active</span>
                </div>
                <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Avg Progress:</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#8b5cf6' }}>{pm.avgProjectProgress}%</span>
                </div>
                <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Portfolio Value:</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>AED {pm.totalPortfolioValue.toLocaleString()}</span>
                </div>
              </div>

              {/* COMMITTED PROJECTS LIST (SCROLLABLE) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>📁</span> Committed Projects ({pm.pmProjects.length})
                </div>
                {pm.pmProjects.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto', paddingRight: 2 }}>
                    {pm.pmProjects.map(proj => (
                      <div 
                        key={proj.id || proj.uuid} 
                        onClick={() => onOpenProject && onOpenProject(proj.id)}
                        style={{ 
                          padding: '5px 8px', 
                          background: '#f8fafc', 
                          borderRadius: 6, 
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f0f7ff';
                          e.currentTarget.style.borderColor = '#93c5fd';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                          <div style={{ fontWeight: 800, fontSize: 11.5, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            🔗 {proj.name}
                          </div>
                          <div style={{ fontSize: 9.5, color: '#64748b' }}>
                            Budget: <strong style={{ color: '#059669' }}>AED {(parseFloat(proj.total_cost || proj.totalCost) || 0).toLocaleString()}</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#2563eb' }}>{proj.progress || 0}%</span>
                          <span className="pill" style={{ fontSize: 9, padding: '1px 5px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                            {proj.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1', fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                    No active project assignments.
                  </div>
                )}
              </div>

              {/* EXPANDABLE DRAWER: TEAMMATES & CLIENTS */}
              {isExpanded && (
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>
                    ✉️ <strong>{pm.email || 'N/A'}</strong> · 📞 <strong>{pm.phone || 'N/A'}</strong>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 4 }}>
                      👥 Assigned Teammates ({pm.assignedTeammates.length}):
                    </div>
                    {pm.assignedTeammates.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {pm.assignedTeammates.map(tm => (
                          <span key={tm.id || tm.uuid} className="pill" style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9', color: '#334155', fontWeight: 700 }}>
                            👤 {tm.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic' }}>No staff teammates assigned.</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 4 }}>
                      🏢 Linked Clients ({pm.scopedClients.length}):
                    </div>
                    {pm.scopedClients.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {pm.scopedClients.map(c => (
                          <span key={c.id || c.uuid} className="pill" style={{ fontSize: 10, padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                            🏢 {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic' }}>No linked clients.</div>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE PROJECT MANAGER MODAL POPUP */}
      {showCreatePmModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999, 
            padding: 20 
          }}
          onClick={() => setShowCreatePmModal(false)}
        >
          <div 
            className="card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: '100%', 
              maxWidth: 520, 
              background: '#fff', 
              borderRadius: 16, 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' 
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>👑</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>Create New Project Manager</h3>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Assign executive leadership & portfolio controls</div>
                </div>
              </div>
              <button 
                onClick={() => setShowCreatePmModal(false)}
                style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', width: 30, height: 30, borderRadius: 8, fontSize: 16, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleCreatePmSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="inp"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={newPmName}
                  onChange={(e) => setNewPmName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Username</label>
                  <input 
                    type="text" 
                    className="inp"
                    placeholder="e.g. alex_pm"
                    value={newPmUsername}
                    onChange={(e) => setNewPmUsername(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Department</label>
                  <select 
                    className="inp"
                    value={newPmDiscipline}
                    onChange={(e) => setNewPmDiscipline(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  >
                    <option value="Full Engineering Management">Full Engineering</option>
                    <option value="MEP Engineering">MEP Engineering</option>
                    <option value="Structural Management">Structural Management</option>
                    <option value="Architecture & Design">Architecture & Design</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Email Address</label>
                  <input 
                    type="email" 
                    className="inp"
                    placeholder="alex@dgec.com"
                    value={newPmEmail}
                    onChange={(e) => setNewPmEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Contact Phone</label>
                  <input 
                    type="text" 
                    className="inp"
                    placeholder="+968 9123 4567"
                    value={newPmPhone}
                    onChange={(e) => setNewPmPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Initial Password</label>
                <input 
                  type="password" 
                  className="inp"
                  value={newPmPassword}
                  onChange={(e) => setNewPmPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  className="btn sec sm" 
                  onClick={() => setShowCreatePmModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn pri sm" 
                  disabled={isSubmitting}
                  style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none' }}
                >
                  {isSubmitting ? 'Creating...' : '＋ Create PM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
