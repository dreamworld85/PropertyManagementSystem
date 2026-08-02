import React, { useState } from 'react';
import Avatar from '../components/Avatar';

export default function AdminStaffPortal({ db = {}, onOpenProject }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  const users = db.users || [];
  const staffRecords = db.staff || [];
  const projects = db.projects || [];
  const tasks = db.tasks || [];

  const combinedUsers = [...users];
  (staffRecords || []).forEach(s => {
    if (s.name && !combinedUsers.some(u => String(u.name).toLowerCase() === String(s.name).toLowerCase())) {
      combinedUsers.push({
        id: s.id || s.uuid,
        uuid: s.uuid || s.id,
        name: s.name,
        username: s.username || s.name.toLowerCase().replace(/\s+/g, ''),
        role: s.role || 'Staff Member',
        userType: 'staff',
        email: s.email,
        phone: s.contact_number || s.phone
      });
    }
  });

  // Filter staff members (all non-client users or staff/engineer/PM roles)
  const staffMembers = combinedUsers.filter(u => {
    const role = (u.role || '').toLowerCase();
    const userType = (u.userType || u.user_type || '').toLowerCase();
    return role !== 'client' && userType !== 'client';
  });

  // Calculate project & task progress for each staff member across the company
  const staffData = staffMembers.map(member => {
    const mIdStr = String(member.id || member.uuid || '').toLowerCase();
    const mNameStr = String(member.name || '').toLowerCase();

    // Tasks assigned to this staff member
    const memberTasks = tasks.filter(t => {
      const assigneeStr = String(t.assignee || t.user_id || '').toLowerCase();
      return (mIdStr && assigneeStr === mIdStr) || (mNameStr && assigneeStr === mNameStr);
    });

    const totalTasks = memberTasks.length;
    const completedTasks = memberTasks.filter(t => t.status === 'Done' || t.percent === 100).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const avgTaskProgress = totalTasks > 0 ? Math.round(memberTasks.reduce((acc, t) => acc + (Number(t.percent) || (t.status === 'Done' ? 100 : 0)), 0) / totalTasks) : 0;

    // Assigned projects for this staff member
    const assignedProjectIds = new Set();
    memberTasks.forEach(t => {
      if (t.projectId || t.project_id) assignedProjectIds.add(String(t.projectId || t.project_id));
    });

    const assignedProjects = projects.filter(p => {
      const pIdStr = String(p.id || p.uuid || '');
      const pPmIdStr = String(p.pm_id || p.projectManagerId || '');
      const pPmNameStr = String(p.project_manager || '').toLowerCase();
      return assignedProjectIds.has(pIdStr) || (mIdStr && pPmIdStr === mIdStr) || (mNameStr && pPmNameStr === mNameStr);
    });

    return {
      ...member,
      totalTasks,
      completedTasks,
      completionRate,
      avgTaskProgress,
      tasks: memberTasks,
      assignedProjects
    };
  });

  const filteredMembers = staffData.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.discipline && m.discipline.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const totalStaffCount = staffMembers.length;
  const totalProjectsCount = projects.length;
  const totalCompanyTasks = tasks.length;
  const totalCompletedCompanyTasks = tasks.filter(t => t.status === 'Done' || t.percent === 100).length;
  const overallCompanyCompletionRate = totalCompanyTasks > 0 ? Math.round((totalCompletedCompanyTasks / totalCompanyTasks) * 100) : 0;

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
      {/* Top Banner / Executive Summary Header */}
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
                Executive Master Roster
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '2px 0 4px', color: '#ffffff' }}>
              Company Staff Portal & Performance Matrix
            </h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
              Comprehensive view of all company staff, assigned engineering projects, and real-time task progress metrics across all departments.
            </p>
          </div>
        </div>

        {/* Quick Executive Stats */}
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
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Company Staff Roster</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{totalStaffCount}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Active Engineering Projects</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#818cf8', marginTop: 2 }}>{totalProjectsCount}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Company Tasks</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f43f5e', marginTop: 2 }}>{totalCompanyTasks}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Overall Completion Rate</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 2 }}>{overallCompanyCompletionRate}%</div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
          <input
            type="text"
            className="inp"
            placeholder="🔍 Search company staff by name, role, or discipline…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 14, height: 38, fontSize: 13, borderRadius: 8, background: '#fff' }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          Showing {filteredMembers.length} of {totalStaffCount} Company Employees
        </div>
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--fg)' }}>
            No Staff Members Found
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 420, margin: '0 auto' }}>
            No employees matching "{searchQuery}".
          </p>
        </div>
      )}

      {/* Responsive Staff Cards Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', 
          gap: 18,
          alignItems: 'start'
        }}
      >
        {filteredMembers.map((member) => {
          const mId = member.id || member.uuid;
          const isExpanded = expandedMemberId === mId;
          const assignedProjs = member.assignedProjects || [];
          const memberTasks = member.tasks || [];
          const completionRate = member.completionRate || 0;
          const avgProgress = member.avgTaskProgress || 0;

          const formattedName = member.name 
            ? member.name.charAt(0).toUpperCase() + member.name.slice(1) 
            : 'Staff Member';
          const formattedRole = member.role || 'Staff Employee';

          return (
            <div 
              key={mId} 
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
                  onClick={() => setExpandedMemberId(isExpanded ? null : mId)}
                  className="btn sec sm"
                  style={{ fontSize: 11, borderRadius: 6, padding: '4px 10px', height: 28 }}
                >
                  {isExpanded ? 'Hide Tasks ▲' : 'View Tasks ▼'}
                </button>
              </div>

              {/* Contact Information Badges */}
              <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
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

              {/* Committed Projects & Progress in Each Project */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Committed Projects & Progress ({assignedProjs.length}):
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
                      title="Click to open project administration"
                    >
                      🔗 {p.name}
                      <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 800 }}>({p.progress || 0}%)</span>
                    </span>
                  ))}
                  {assignedProjs.length === 0 && (
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>No committed project assignments</span>
                  )}
                </div>
              </div>

              {/* Expandable Task Breakdowns */}
              {isExpanded && (
                <div 
                  style={{ 
                    borderTop: '1px dashed #cbd5e1', 
                    paddingTop: 12, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 8 
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)', textTransform: 'uppercase' }}>
                    Assigned Task Items ({memberTasks.length}):
                  </div>
                  
                  {memberTasks.map((task) => (
                    <div 
                      key={task.id || task.uuid} 
                      style={{ 
                        padding: '8px 10px', 
                        background: '#f8fafc', 
                        borderRadius: 8, 
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <div style={{ fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📍 {task.title || 'Task Assignment'}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                          Discipline: {task.discipline || 'Engineering'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span 
                          style={{ 
                            fontSize: 11, 
                            fontWeight: 800, 
                            color: task.percent === 100 || task.status === 'Done' ? '#10b981' : '#2563eb' 
                          }}
                        >
                          {task.percent !== undefined ? `${task.percent}%` : (task.status === 'Done' ? '100%' : '0%')}
                        </span>
                        <span 
                          style={{ 
                            padding: '2px 6px', 
                            borderRadius: 4, 
                            fontSize: 10, 
                            fontWeight: 700,
                            background: task.status === 'Done' ? '#dcfce7' : '#e0f2fe',
                            color: task.status === 'Done' ? '#15803d' : '#0369a1'
                          }}
                        >
                          {task.status || 'In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {memberTasks.length === 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic', padding: '4px 0' }}>
                      No tasks assigned yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
