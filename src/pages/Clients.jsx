import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import Bar from '../components/Bar';
import Tag from '../components/Tag';
import { fmt, statusColor, barColor } from '../utils/helpers';

export default function Clients({ db = {}, onAdd, onOpenProject, loggedInUser }) {
  const [selectedId, setSelectedId] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const safeDb = db || {};
  const allClients = safeDb.clients || [];
  const allProjects = safeDb.projects || [];
  const allTasks = safeDb.tasks || [];
  const users = safeDb.users || [];

  // Identify active Project Manager context
  const isPmUser = loggedInUser?.role?.toLowerCase().includes('manager') || 
                   loggedInUser?.userType?.toLowerCase().includes('manager') ||
                   loggedInUser?.username === 'projectmanager' ||
                   loggedInUser?.name === 'Saurabh M.' ||
                   loggedInUser?.name === 'Tharun';

  const activePmId = String(loggedInUser?.uuid || loggedInUser?.pm_id || loggedInUser?.id || '').toLowerCase();
  const activePmName = String(loggedInUser?.name || '').toLowerCase();

  // 1. Filter projects belonging to active PM
  const pmProjects = isPmUser
    ? allProjects.filter(p => {
        const pPmId = String(p.pm_id || p.pmId || '').toLowerCase();
        const pPmName = String(p.project_manager || p.pm_name || '').toLowerCase();
        return (activePmId && pPmId === activePmId) || (activePmName && pPmName.includes(activePmName)) || (activePmName && activePmName.includes(pPmName));
      })
    : allProjects;

  // 2. Filter clients belonging to active PM or owning active PM's projects
  const scopedClients = isPmUser
    ? allClients.filter(c => {
        const cPmId = String(c.pm_id || c.pmId || '').toLowerCase();
        const cPmName = String(c.pm_name || '').toLowerCase();

        if (activePmId && cPmId === activePmId) return true;
        if (activePmName && cPmName && cPmName.includes(activePmName)) return true;

        const cIdStr = String(c.id);
        const cUuidStr = String(c.uuid || '');
        const cNameStr = String(c.name || '').toLowerCase().trim();

        // Check if any of PM's projects belong to this client
        return pmProjects.some(p => 
          String(p.client_id) === cIdStr ||
          String(p.client_id) === cUuidStr ||
          (p.client_name && String(p.client_name).toLowerCase().trim() === cNameStr) ||
          (cNameStr && p.name && String(p.name).toLowerCase().includes(cNameStr))
        );
      })
    : allClients;

  // Helper to get all committed projects for a specific client under PM scope
  const getClientProjects = (c) => {
    if (!c || !pmProjects) return [];
    const cIdStr = String(c.id);
    const cUuidStr = String(c.uuid || '');
    const cNameStr = String(c.name || '').toLowerCase().trim();

    return pmProjects.filter(p => {
      const pCid = String(p.client_id || p.clientId || '');
      if (pCid && (pCid === cIdStr || pCid === cUuidStr)) return true;
      if (p.client_name && String(p.client_name).toLowerCase().trim() === cNameStr) return true;
      if (cNameStr && p.name && String(p.name).toLowerCase().includes(cNameStr)) return true;
      return false;
    });
  };

  // Helper to get tasks for a specific project
  const getProjectTasks = (projectId) => {
    if (!projectId || !allTasks) return [];
    const pStr = String(projectId).toLowerCase();
    return allTasks.filter(t => String(t.project_id || t.projectId).toLowerCase() === pStr);
  };

  if (selectedId) {
    const c = scopedClients.find(item => String(item.id) === String(selectedId) || String(item.uuid) === String(selectedId));
    if (!c) {
      setSelectedId(null);
      return null;
    }
    const clientProjects = getClientProjects(c);

    const totalContractValue = clientProjects.reduce((acc, p) => acc + (parseFloat(p.total_cost || p.totalCost) || 0), 0);
    const totalProgressSum = clientProjects.reduce((acc, p) => acc + (Number(p.progress) || 0), 0);
    const avgProgress = clientProjects.length > 0 ? Math.round(totalProgressSum / clientProjects.length) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <button
          onClick={() => setSelectedId(null)}
          className="btn sec sm"
          style={{ width: 'fit-content', borderRadius: 8 }}
        >
          ← Back to Clients Directory
        </button>

        {/* Client Summary Header Card */}
        <div className="card" style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid var(--line)', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar name={c.name} size={60} />
              <div>
                <h2 className="disp" style={{ fontWeight: 800, fontSize: 22, color: 'var(--fg)', margin: 0 }}>{c.name}</h2>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Organization / Sector: <strong>{c.company || c.sector || 'General Engineering Sector'}</strong>
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Overall Committed Progress</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: avgProgress >= 80 ? '#10b981' : avgProgress >= 40 ? '#f59e0b' : '#3b82f6', marginTop: 2 }}>
                {avgProgress}% Completed
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Email Address</div>
              <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: 13.5, marginTop: 4, wordBreak: 'break-all' }}>{c.email || c.contact || 'contact@client.com'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Phone Number</div>
              <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: 13.5, marginTop: 4 }}>{c.phone || c.contact_number || '+968 9000 0000'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Committed Projects</div>
              <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: 16, marginTop: 4 }}>{clientProjects.length} Projects</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Total Contract Value</div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: 16, marginTop: 4 }}>
                {totalContractValue > 0 ? `$${totalContractValue.toLocaleString()}` : 'Active Agreement'}
              </div>
            </div>
          </div>
        </div>

        {/* Committed Projects & Tasks List */}
        <div className="card" style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 className="disp" style={{ margin: 0, fontSize: 18, color: 'var(--fg)', fontWeight: 800 }}>
                Committed Projects ({clientProjects.length})
              </h3>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                Displaying projects and task details committed under {loggedInUser?.name || 'Project Manager'}'s supervision.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {clientProjects.map((p) => {
              const pTasks = getProjectTasks(p.id || p.uuid);
              const isExpanded = expandedProjectId === p.id;

              return (
                <div
                  key={p.id || p.uuid}
                  style={{
                    background: 'var(--surface, #f8fafc)',
                    padding: 20,
                    borderRadius: 14,
                    border: '1.5px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h4 
                          onClick={() => onOpenProject(p.id || p.uuid || p.name)}
                          style={{ fontWeight: 800, color: 'var(--fg)', fontSize: 16.5, margin: 0, cursor: 'pointer' }}
                        >
                          📁 {p.name}
                        </h4>
                        <Tag label={p.status || 'Active'} color={statusColor(p.status, db.settings?.projectStatuses)} />
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                        Category: <strong>{p.category || 'Full Engineering'}</strong> · PM: <strong style={{ color: '#2563eb' }}>{p.project_manager || loggedInUser?.name || 'Project Manager'}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Progress</div>
                        <div style={{ fontWeight: 800, color: 'var(--fg)', fontSize: 15 }}>{p.progress || 0}%</div>
                      </div>
                      <button
                        className="btn sec sm"
                        onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                        style={{ fontSize: 11.5, borderRadius: 6 }}
                      >
                        {isExpanded ? 'Hide Tasks ▲' : `View Tasks (${pTasks.length}) ▼`}
                      </button>
                      <button
                        className="btn pri sm"
                        onClick={() => onOpenProject(p.id || p.uuid || p.name)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', fontSize: 11.5, borderRadius: 6 }}
                      >
                        Open Workspace →
                      </button>
                    </div>
                  </div>

                  {/* Task Breakdowns */}
                  {isExpanded && (
                    <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>Committed Tasks ({pTasks.length}):</div>
                      {pTasks.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>No individual tasks logged for this project yet.</div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                        {pTasks.map((t) => (
                          <div key={t.id || t.uuid} style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid var(--line)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--fg)' }}>{t.title}</span>
                              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: String(t.status).toLowerCase() === 'done' ? '#dcfce7' : '#dbeafe', color: String(t.status).toLowerCase() === 'done' ? '#15803d' : '#1e40af' }}>
                                {t.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                              <span>Discipline: {t.discipline || 'Engineering'}</span>
                              <span>{t.percent || 0}% Done</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {clientProjects.length === 0 && (
              <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                No active projects committed for {c.name} under {loggedInUser?.name || 'this PM'} yet.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 className="disp" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--fg)' }}>
            {isPmUser ? `${loggedInUser?.name || 'Project Manager'}'s Clients Directory` : 'Clients Directory'} ({scopedClients.length})
          </h2>
          <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {isPmUser 
              ? `Displaying clients and committed projects strictly scoped under ${loggedInUser?.name || 'your supervision'}.`
              : 'Select any client to view contact info and committed projects.'}
          </p>
        </div>
        <button className="btn pri" onClick={onAdd} style={{ background: '#3b82f6', color: '#fff', borderRadius: 8, padding: '8px 16px', fontWeight: 700 }}>
          ＋ Add client
        </button>
      </div>

      {/* Empty State */}
      {scopedClients.length === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: '#fff', borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px', color: 'var(--fg)' }}>
            No Clients Found
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, maxWidth: 440, margin: '0 auto 16px' }}>
            No clients are currently registered under {loggedInUser?.name || 'your Project Manager supervision'}. Click "+ Add client" above to bind a new client.
          </p>
        </div>
      )}

      {/* Scoped Clients Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: 18,
          alignItems: 'start'
        }}
      >
        {scopedClients.map((c) => {
          const clientProjects = getClientProjects(c);
          const n = clientProjects.length;
          const totalVal = clientProjects.reduce((acc, p) => acc + (parseFloat(p.total_cost || p.totalCost) || 0), 0);

          return (
            <div
              key={c.id || c.uuid}
              className="card"
              onClick={() => setSelectedId(c.id || c.uuid)}
              style={{
                padding: '20px 22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                border: '1px solid var(--line)',
                background: '#fff',
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar name={c.name} size={44} />
                <div>
                  <div className="disp" style={{ fontWeight: 800, fontSize: 16, color: 'var(--fg)' }}>
                    {c.name}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>
                    {c.company || c.sector || 'General Engineering Sector'}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted" style={{ fontWeight: 600 }}>Email:</span>
                  <span style={{ color: 'var(--fg)', fontWeight: 600, wordBreak: 'break-all' }}>{c.email || c.contact || 'contact@client.com'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted" style={{ fontWeight: 600 }}>Phone:</span>
                  <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{c.phone || c.contact_number || '+968 9000 0000'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <span className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                  Committed Projects
                </span>
                <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', fontSize: 14 }}>
                  {n} Project{n !== 1 ? 's' : ''} →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
