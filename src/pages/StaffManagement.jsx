import React, { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';
import Tag from '../components/Tag';

export default function StaffManagement({ isAdmin }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

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
    contact_number: '',
    email: '',
    role: 'Developer'
  });

  const availableRoles = [
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
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Failed to fetch staff directory from database');
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({ name: '', contact_number: '', email: '', role: 'Senior Structural Engineer' });
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingStaff(member);
    setFormData({
      name: member.name || '',
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

      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Are you sure you want to delete staff member '${member.name}'?`)) return;
    try {
      const targetId = member.id || member.uuid;
      const res = await fetch(`/api/staff/${targetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete staff member');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <button
                  className="btn sec sm"
                  onClick={() => openEditModal(staff)}
                  style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn sec sm"
                  onClick={() => handleDelete(staff)}
                  style={{ padding: '6px 12px', fontSize: 12, color: '#ef4444', borderColor: '#fca5a5', cursor: 'pointer' }}
                >
                  🗑️ Delete
                </button>
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
                  Role in the Company *
                </label>
                <select
                  className="inp"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
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
