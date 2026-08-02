import React, { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';
import Tag from '../components/Tag';

export default function StaffManagement({ isAdmin, db = {}, onOpenProject, commit, updateUser }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState(null);

  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('dgec_user');
      return stored ? JSON.parse(stored) : null;
    } catch(e) {
      return null;
    }
  })();

  const isSystemAdmin = isAdmin || (currentUser && (
    String(currentUser.role || '').toLowerCase() === 'admin' ||
    String(currentUser.userType || '').toLowerCase() === 'admin' ||
    String(currentUser.username || '').toLowerCase() === 'admin'
  ));

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    contact_number: '',
    email: '',
    role: 'Senior Structural Engineer'
  });

  const availableRoles = [
    'Project Manager',
    'Senior Structural Engineer',
    'Architect Lead',
    'MEP Lead',
    'Electrical Engineer',
    'Plumbing Lead',
    'Structural Engineer',
    'CAD Technician',
    'BIM Specialist',
    'Site Engineer',
    'Project Coordinator'
  ];

  // Dedicated PM Creation Modal State
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [pmFormData, setPmFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    discipline: 'MEP'
  });

  const handlePmSubmit = async (e) => {
    e.preventDefault();
    if (!pmFormData.name.trim()) {
      alert('Project Manager Name is required');
      return;
    }

    try {
      const res = await fetch('/api/create-pm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pmFormData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create Project Manager');
      }

      alert(`✅ Project Manager '${pmFormData.name}' created successfully with Project Manager role!`);
      setIsPmModalOpen(false);
      setPmFormData({ name: '', username: '', email: '', phone: '', password: '', discipline: 'MEP' });
      fetchStaff();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Fetch staff list from backend API (MySQL prepared statements backend)
  const fetchStaff = async (showLoading = false) => {
    try {
      if (showLoading || staffList.length === 0) setLoading(true);
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Failed to fetch staff directory from database');
      const data = await res.json();
      
      const apiStaff = data.staff || [];
      const dbStaff = db.staff || [];
      const dbUsers = (db.users || []).filter(u => {
        const r = String(u.role || '').toLowerCase();
        const ut = String(u.userType || u.user_type || '').toLowerCase();
        return !r.includes('admin') && !ut.includes('admin') && !r.includes('client') && !ut.includes('client');
      });

      const combined = [...apiStaff];

      [...dbStaff, ...dbUsers].forEach(item => {
        if (!item.name) return;
        const normName = item.name.trim().toLowerCase();
        if (!combined.some(s => s.name && s.name.trim().toLowerCase() === normName)) {
          combined.push({
            id: item.id || item.uuid || `s_${Math.random()}`,
            uuid: item.uuid || item.id,
            name: item.name,
            username: item.username || normName.replace(/\s+/g, ''),
            contact_number: item.contact_number || item.phone || '+968 9412 8899',
            email: item.email || `${normName.replace(/\s+/g, '')}@dgec.com`,
            role: item.role || item.discipline || 'Engineering Staff',
            created_at: item.created_at || new Date().toISOString()
          });
        }
      });

      setStaffList(combined);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff(staffList.length === 0);
  }, [(db.staff || []).length, (db.users || []).length]);

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({ name: '', username: '', password: '', contact_number: '', email: '', role: 'Senior Structural Engineer' });
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingStaff(member);
    setFormData({
      name: member.name || '',
      username: member.username || member.name?.toLowerCase().replace(/\s+/g, '') || '',
      password: '',
      contact_number: member.contact_number || '',
      email: member.email || '',
      role: member.role || 'Senior Structural Engineer'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role.trim()) {
      alert('Please fill in required fields: Staff Name and Role');
      return;
    }

    if (formData.role.toLowerCase() === 'admin') {
      alert('Cannot assign Admin role. System enforces a single administrator hierarchy.');
      return;
    }

    try {
      const payload = {
        uuid: editingStaff ? editingStaff.uuid : undefined,
        name: formData.name.trim(),
        username: formData.username.trim() || formData.name.trim().toLowerCase().replace(/\s+/g, ''),
        password: formData.password.trim(),
        contact_number: formData.contact_number.trim(),
        email: formData.email.trim(),
        role: formData.role.trim()
      };

      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save staff member');
      }

      const resData = await res.json();

      if (commit) {
        commit((d) => {
          const nextStaff = [...(d.staff || [])];
          const nextUsers = [...(d.users || [])];

          const newStaffObj = {
            id: resData.staff?.id || payload.uuid || ('s_' + Math.random().toString(36).substring(2, 9)),
            uuid: resData.staff?.uuid || payload.uuid,
            name: payload.name,
            username: payload.username,
            contact_number: payload.contact_number,
            email: payload.email,
            role: payload.role,
            created_at: new Date().toISOString()
          };

          if (!nextStaff.some(s => String(s.name).toLowerCase() === payload.name.toLowerCase())) {
            nextStaff.push(newStaffObj);
          }
          if (!nextUsers.some(u => String(u.name).toLowerCase() === payload.name.toLowerCase())) {
            nextUsers.push({
              ...newStaffObj,
              user_type: 'staff',
              userType: 'staff'
            });
          }

          return { ...d, staff: nextStaff, users: nextUsers };
        }, `Saved staff member ${payload.name}`);
      }

      alert(`✅ Staff member '${formData.name}' saved with username '${payload.username}'! They can now log into the Staff Panel.`);
      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${member.name}'? This will delete all staff records, user logins, and task assignments entirely.`)) return;
    try {
      const targetId = member.uuid || member.id;
      const res = await fetch(`/api/staff/${targetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: member.name })
      });
      if (!res.ok) throw new Error('Failed to delete staff member');
      setStaffList(prev => prev.filter(s => String(s.id) !== String(member.id) && String(s.uuid) !== String(member.uuid) && String(s.name).toLowerCase() !== String(member.name).toLowerCase()));
      fetchStaff();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_number?.includes(searchTerm);
    const matchesRole = roleFilter === 'ALL' || s.role?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  if (selectedStaffDetail) {
    const staffIdStr = String(selectedStaffDetail.id || selectedStaffDetail.uuid || '').toLowerCase();
    const staffNameStr = String(selectedStaffDetail.name || '').toLowerCase();

    const allProjects = db.projects || [];
    const allTasks = db.tasks || [];
    const allUsers = db.users || [];

    // Filter tasks assigned to this staff member
    const memberTasks = allTasks.filter(t => {
      const assigneeStr = String(t.assignee || t.user_id || '').toLowerCase();
      return (staffIdStr && assigneeStr === staffIdStr) || (staffNameStr && assigneeStr === staffNameStr);
    });

    // Find committed projects for this staff member or Project Manager
    const assignedProjectIds = new Set(memberTasks.map(t => String(t.projectId || t.project_id)));
    const committedProjects = allProjects.filter(p => {
      const pPmIdStr = String(p.pm_id || p.projectManagerId || '').toLowerCase();
      const pPmNameStr = String(p.project_manager || p.pm_name || '').toLowerCase();
      const isPmProject = (staffIdStr && pPmIdStr === staffIdStr) || (staffNameStr && pPmNameStr && pPmNameStr.includes(staffNameStr)) || (staffNameStr && pPmNameStr && staffNameStr.includes(pPmNameStr));
      return assignedProjectIds.has(String(p.id || p.uuid)) || isPmProject;
    });

    // Total metrics
    const totalTasksCount = memberTasks.length;
    const completedTasksCount = memberTasks.filter(t => t.status === 'Done' || t.percent === 100).length;
    const overallCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Back Button */}
        <button
          className="btn sec sm"
          onClick={() => setSelectedStaffDetail(null)}
          style={{ width: 'fit-content', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
        >
          ← Back to Staff Management Directory
        </button>

        {/* Staff Profile Hero Card */}
        <div
          className="card"
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar name={selectedStaffDetail.name} size={56} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 className="disp" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>
                    {selectedStaffDetail.name}
                  </h2>
                  <span className="pill" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: 11.5 }}>
                    💼 {selectedStaffDetail.role || 'Staff Member'}
                  </span>
                  {selectedStaffDetail.discipline && (
                    <span className="pill" style={{ background: '#f3e8ff', color: '#7e22ce', fontWeight: 800, fontSize: 11.5 }}>
                      {selectedStaffDetail.discipline}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
                  ✉️ {selectedStaffDetail.email || 'N/A'} · 📞 {selectedStaffDetail.contact_number || selectedStaffDetail.phone || 'N/A'}
                  {selectedStaffDetail.created_at && ` · 🗓️ Joined: ${new Date(selectedStaffDetail.created_at).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Committed Projects</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{committedProjects.length} Projects</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Tasks</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#818cf8', marginTop: 2 }}>{totalTasksCount} Tasks</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Task Completion</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399', marginTop: 2 }}>{completedTasksCount} / {totalTasksCount} ({overallCompletionRate}%)</div>
            </div>
          </div>
        </div>

        {/* COMMITTED PROJECTS & TASKS SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📁</span> Committed Projects & Task Progress Breakdown ({committedProjects.length})
          </div>

          {committedProjects.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {committedProjects.map(proj => {
                // Find PM for this project
                const pmUser = allUsers.find(u => 
                  String(u.id) === String(proj.pm_id || proj.projectManagerId) || 
                  String(u.name).toLowerCase() === String(proj.project_manager || proj.pm_name).toLowerCase()
                );
                const pmName = pmUser ? pmUser.name : (proj.project_manager || proj.pm_name || 'Assigned PM');

                // Tasks for this staff member in this project
                const projMemberTasks = memberTasks.filter(t => 
                  String(t.projectId || t.project_id) === String(proj.id || proj.uuid)
                );

                const projCompletedCount = projMemberTasks.filter(t => t.status === 'Done' || t.percent === 100).length;

                return (
                  <div
                    key={proj.id || proj.uuid}
                    className="card"
                    style={{
                      padding: 18,
                      background: '#fff',
                      borderRadius: 14,
                      border: '1px solid var(--line)',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    {/* Project Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div
                          onClick={() => onOpenProject && onOpenProject(proj.id)}
                          style={{ fontWeight: 800, fontSize: 15, color: '#1e40af', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Click to view project details"
                        >
                          🔗 {proj.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          Category: <strong>{proj.category || 'Engineering'}</strong>
                        </div>
                      </div>
                      <span className="pill" style={{ fontSize: 10, padding: '2px 8px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                        {proj.status || 'Active'}
                      </span>
                    </div>

                    {/* ASSIGNED PROJECT MANAGER */}
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>👑</span>
                      <div style={{ fontSize: 11.5, color: '#475569' }}>
                        Project Manager: <strong style={{ color: '#1e293b', fontWeight: 800 }}>{pmName}</strong>
                      </div>
                    </div>

                    {/* TASKS LIST IN THIS PROJECT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        Assigned Tasks ({projMemberTasks.length}):
                      </div>

                      {projMemberTasks.map(task => {
                        const taskPercent = task.percent !== undefined ? task.percent : (task.status === 'Done' ? 100 : 0);
                        return (
                          <div key={task.id || task.uuid} style={{ padding: '8px 10px', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink)' }}>
                                📍 {task.title || 'Task Assignment'}
                              </div>
                              <span className="pill" style={{ fontSize: 9.5, padding: '1px 6px', background: task.status === 'Done' ? '#dcfce7' : '#e0f2fe', color: task.status === 'Done' ? '#15803d' : '#0369a1', fontWeight: 700 }}>
                                {task.status || 'In Progress'} ({taskPercent}%)
                              </span>
                            </div>

                            {/* Task Progress Bar */}
                            <div style={{ background: '#e2e8f0', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 2 }}>
                              <div
                                style={{
                                  width: `${taskPercent}%`,
                                  height: '100%',
                                  background: taskPercent === 100 ? '#10b981' : taskPercent >= 40 ? '#2563eb' : '#f59e0b',
                                  borderRadius: 3,
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {projMemberTasks.length === 0 && (
                        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                          No specific task items logged for this project.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card empty" style={{ padding: 36, textAlign: 'center', background: '#fff', borderRadius: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>No Committed Projects Found</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                This staff member does not have active project task assignments currently logged.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: 24, background: '#fff', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="h1 disp" style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
              👤 Staff Management
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Register, manage, and view company staff members & role assignments saved in MySQL.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isSystemAdmin && (
              <button
                className="btn"
                onClick={() => setIsPmModalOpen(true)}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <span>👑</span> Create Project Manager
              </button>
            )}
            <button
              className="btn"
              onClick={openAddModal}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer'
              }}
            >
              <span>+</span> Add Staff Member
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: 14, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <input
              className="inp"
              type="text"
              placeholder="🔍 Search staff by name, email, or contact number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <select
            className="inp"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="ALL">All Roles</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Members List Cards / Table */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          Loading staff directory from MySQL...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 30, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 14 }}>
          {error}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="card empty" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>No Staff Members Found</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Click "+ Add Staff Member" to add your first employee to the database.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {filteredStaff.map((staff) => (
            <div
              key={staff.id || staff.uuid}
              className="card"
              style={{
                padding: 20,
                background: '#fff',
                borderRadius: 16,
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={staff.name} size={44} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>{staff.name}</div>
                      <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, color: '#1d4ed8', fontSize: 11.5, fontWeight: 700 }}>
                        💼 {staff.role || 'Staff Member'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📞</span> <span>{staff.contact_number || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>✉️</span> <span>{staff.email || 'N/A'}</span>
                  </div>
                  {staff.created_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      <span>🗓️ Added:</span> <span>{new Date(staff.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: isSystemAdmin ? 'space-between' : 'flex-end', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                {isSystemAdmin && (
                  <button
                    className="btn pri sm"
                    onClick={() => setSelectedStaffDetail(staff)}
                    style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    🔍 View More Details
                  </button>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn sec sm"
                    onClick={() => openEditModal(staff)}
                    style={{ padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn sec sm"
                    onClick={() => handleDelete(staff)}
                    style={{ padding: '6px 10px', fontSize: 12, color: '#ef4444', borderColor: '#fca5a5', cursor: 'pointer' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dedicated Modal Form for Creating Project Manager (Admin View) */}
      {isPmModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24, background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div className="h3 disp" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e3a8a' }}>
                👑 Create New Project Manager (PM)
              </div>
              <button onClick={() => setIsPmModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            </div>

            <form onSubmit={handlePmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Project Manager Name *</label>
                <input className="inp" type="text" required placeholder="e.g. Saurabh M." value={pmFormData.name} onChange={(e) => setPmFormData({ ...pmFormData, name: e.target.value })} style={{ width: '100%' }} />
              </div>

              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Username *</label>
                  <input className="inp" type="text" required placeholder="e.g. pm_saurabh" value={pmFormData.username} onChange={(e) => setPmFormData({ ...pmFormData, username: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Login Password *</label>
                  <input className="inp" type="password" required placeholder="Set PM password" value={pmFormData.password} onChange={(e) => setPmFormData({ ...pmFormData, password: e.target.value })} style={{ width: '100%' }} />
                </div>
              </div>

              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Email Address</label>
                  <input className="inp" type="email" placeholder="pm@dgec.com" value={pmFormData.email} onChange={(e) => setPmFormData({ ...pmFormData, email: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Contact Phone</label>
                  <input className="inp" type="tel" placeholder="+968 9412 8899" value={pmFormData.phone} onChange={(e) => setPmFormData({ ...pmFormData, phone: e.target.value })} style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Primary Discipline</label>
                <select className="inp" value={pmFormData.discipline} onChange={(e) => setPmFormData({ ...pmFormData, discipline: e.target.value })} style={{ width: '100%' }}>
                  <option value="MEP">MEP Engineering</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Structural">Structural Engineering</option>
                  <option value="Project Management">Project Management</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <button type="button" className="btn sec sm" onClick={() => setIsPmModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn sm" style={{ background: '#2563eb', color: '#fff', padding: '8px 18px', fontWeight: 700 }}>Save Project Manager</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Form for Add / Edit Staff Member */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 500,
              padding: 24,
              background: '#fff',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div className="h3 disp" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Staff Name *
                </label>
                <input
                  className="inp"
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    Username for Login *
                  </label>
                  <input
                    className="inp"
                    type="text"
                    required
                    placeholder="e.g. boby_eng"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    Password for Login *
                  </label>
                  <input
                    className="inp"
                    type="password"
                    required={!editingStaff}
                    placeholder={editingStaff ? "Leave blank to keep current" : "Set staff password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="row2">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    Contact Number *
                  </label>
                  <input
                    className="inp"
                    type="tel"
                    required
                    placeholder="+968 9876 5432"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    Email ID *
                  </label>
                  <input
                    className="inp"
                    type="email"
                    required
                    placeholder="email@dgec.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Role in the Company (Type custom role or select below) *
                </label>
                <input
                  className="inp"
                  type="text"
                  list="staff-roles-options"
                  required
                  placeholder="e.g. Senior Structural Engineer, Lead Designer"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%' }}
                />
                <datalist id="staff-roles-options">
                  {availableRoles.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <button
                  type="button"
                  className="btn sec sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn sm"
                  style={{ background: 'var(--accent)', color: '#fff', padding: '8px 18px', fontWeight: 700 }}
                >
                  {editingStaff ? 'Save Changes' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
