import React, { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';

export default function PMStaffPortal({ loggedInUser, onOpenProject }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  const pmId = loggedInUser?.uuid || loggedInUser?.pm_id || loggedInUser?.id || '';
  const pmName = loggedInUser?.name || 'Project Manager';

  const fetchStaffPortalData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (pmId) headers['x-pm-id'] = pmId;

      const url = pmId 
        ? `/api/pm/staff-portal?pm_id=${encodeURIComponent(pmId)}&pm_name=${encodeURIComponent(pmName)}`
        : `/api/pm/staff-portal`;

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to load PM staff portal data');
      }
    } catch (err) {
      console.error('Fetch PM Staff Portal error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffPortalData();
  }, [pmId, pmName]);

  const teamMembers = data?.teamMembers || [];
  const projects = data?.projects || [];

  const filteredMembers = teamMembers.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.discipline && m.discipline.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const totalTeamCount = teamMembers.length;
  const totalProjectsCount = projects.length;
  const totalTasksCount = teamMembers.reduce((acc, m) => acc + (m.totalTasks || 0), 0);
  const totalCompletedCount = teamMembers.reduce((acc, m) => acc + (m.completedTasks || 0), 0);
  const overallCompletionRate = totalTasksCount > 0 ? Math.round((totalCompletedCount / totalTasksCount) * 100) : 0;

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
      {/* Top Banner / Header Header */}
      <div 
        className="card" 
        style={{ 
          padding: '20px 24px', 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 14,
          color: '#fff',
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span 
                style={{ 
                  background: 'rgba(59, 130, 246, 0.2)', 
                  color: '#60a5fa', 
                  padding: '3px 10px', 
                  borderRadius: 20, 
                  fontSize: 11, 
                  fontWeight: 700, 
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(96, 165, 250, 0.3)'
                }}
              >
                PM Staff Workspace
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '2px 0 4px', color: '#ffffff' }}>
              {pmName}'s Team & Staff Portal
            </h2>
            <p style={{ margin: 0, color: 'var(--muted, #94a3b8)', fontSize: 13 }}>
              Displaying team members, assigned projects, and task completion metrics strictly scoped under your supervision.
            </p>
          </div>

          <button 
            onClick={fetchStaffPortalData} 
            className="btn sec sm" 
            disabled={loading}
            style={{ 
              background: 'rgba(255, 255, 255, 0.08)', 
              color: '#fff', 
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {loading ? 'Refreshing…' : 'Sync Live Data'}
          </button>
        </div>

        {/* Compact Quick Stats */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: 12, 
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Active Teammates</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{totalTeamCount}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Scoped PM Projects</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#818cf8', marginTop: 2 }}>{totalProjectsCount}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Assigned Tasks</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f43f5e', marginTop: 2 }}>{totalTasksCount}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Completion Rate</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 2 }}>{overallCompletionRate}%</div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
          <input
            type="text"
            className="inp"
            placeholder="Search team members by name, role, or discipline…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 14, height: 38, fontSize: 13 }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          Showing {filteredMembers.length} of {totalTeamCount} Teammates
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card" style={{ padding: 14, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: 8, fontSize: 13 }}>
          <strong>⚠️ Data Load Notice:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Loading {pmName}'s Staff Workspace…</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMembers.length === 0 && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>
            No Teammates Found
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 420, margin: '0 auto 14px' }}>
            {searchQuery 
              ? `No team members matching "${searchQuery}".`
              : `No staff members assigned under ${pmName}'s projects.`}
          </p>
        </div>
      )}

      {/* Desktop Grid Layout: Responsive Columns */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', 
          gap: 18,
          alignItems: 'start'
        }}
      >
        {filteredMembers.map((member) => {
          const isExpanded = expandedMemberId === member.uuid;
          const assignedProjs = member.assignedProjects || [];
          const tasks = member.tasks || [];
          const completionRate = member.completionRate || 0;
          const avgProgress = member.avgTaskProgress || 0;

          const formattedName = member.name 
            ? member.name.charAt(0).toUpperCase() + member.name.slice(1) 
            : 'Staff Member';
          const formattedRole = member.role && member.role !== 'staff' 
            ? member.role 
            : 'Staff Teammate';

          return (
            <div 
              key={member.uuid || member.id} 
              className="card" 
              style={{ 
                padding: '18px 20px', 
                background: '#fff', 
                borderRadius: 14,
                border: '1px solid var(--line)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                transition: 'all 0.2s ease'
              }}
            >
              {/* Header: Avatar, Name, Role, Discipline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={formattedName} size={44} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--fg)', textTransform: 'capitalize' }}>
                        {formattedName}
                      </h3>
                      {member.discipline && (
                        <span 
                          style={{ 
                            background: '#eff6ff', 
                            color: '#2563eb', 
                            padding: '2px 8px', 
                            borderRadius: 10, 
                            fontSize: 10.5, 
                            fontWeight: 700 
                          }}
                        >
                          {member.discipline}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
                      {formattedRole}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setExpandedMemberId(isExpanded ? null : member.uuid)}
                  className="btn sec sm"
                  style={{ fontSize: 11, borderRadius: 6, padding: '4px 10px', height: 28 }}
                >
                  {isExpanded ? 'Hide Tasks ▲' : 'View Tasks ▼'}
                </button>
              </div>

              {/* Contact Information Badges */}
              <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
                {member.email && <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>✉️ {member.email}</span>}
                {member.phone && <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>📞 {member.phone}</span>}
              </div>

              {/* Progress Summary Section */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, marginBottom: 6 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Task Progress</span>
                  <span style={{ fontWeight: 800, color: completionRate >= 80 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#3b82f6' }}>
                    {member.completedTasks} / {member.totalTasks} Done ({completionRate}%)
                  </span>
                </div>
                <div style={{ background: '#e2e8f0', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${avgProgress}%`, 
                      height: '100%', 
                      background: avgProgress >= 80 ? '#10b981' : avgProgress >= 40 ? '#f59e0b' : '#3b82f6',
                      borderRadius: 3,
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Assigned Projects */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Assigned Projects ({assignedProjs.length}):
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {assignedProjs.map((p) => (
                    <span 
                      key={p.id || p.uuid} 
                      onClick={() => onOpenProject && onOpenProject(p.id)}
                      style={{ 
                        background: '#eff6ff', 
                        border: '1px solid #bfdbfe', 
                        padding: '4px 9px', 
                        borderRadius: 14, 
                        fontSize: 11.5, 
                        fontWeight: 600, 
                        color: '#1e40af',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Click to view project details"
                    >
                      📁 {p.name}
                      <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 700 }}>({p.progress || 0}%)</span>
                    </span>
                  ))}
                  {assignedProjs.length === 0 && (
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>No active project assignments</span>
                  )}
                </div>
              </div>

              {/* Expandable Task Breakdowns */}
              {isExpanded && (
                <div 
                  style={{ 
                    paddingTop: 12, 
                    borderTop: '1px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg)' }}>
                    Task Details ({tasks.length}):
                  </div>

                  {tasks.length === 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      No tasks assigned yet.
                    </div>
                  )}

                  {tasks.map((t) => (
                    <div 
                      key={t.uuid || t.id}
                      style={{ 
                        padding: '8px 10px', 
                        background: '#f8fafc', 
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--fg)' }}>
                          {t.title}
                        </div>
                        <span 
                          style={{ 
                            fontSize: 10, 
                            fontWeight: 700, 
                            padding: '2px 6px', 
                            borderRadius: 4,
                            background: String(t.status).toLowerCase() === 'done' ? '#dcfce7' : '#dbeafe',
                            color: String(t.status).toLowerCase() === 'done' ? '#15803d' : '#1e40af'
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>📁 {t.projectName}</span>
                        <span>{t.percent || 0}% Done</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
