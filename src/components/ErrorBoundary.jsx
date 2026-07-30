import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.removeItem('dgec_user');
      localStorage.removeItem('dgec_db_v1');
    } catch(e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 30,
          background: '#f8fafc',
          color: '#1e293b',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: 550,
            width: '100%',
            background: '#ffffff',
            borderRadius: 16,
            padding: 32,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.01)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛠️</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
              Project Control Dashboard Recovery
            </h1>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              A temporary runtime state error occurred. Click below to restore default session settings and recover the dashboard immediately.
            </p>

            {this.state.error && (
              <div style={{
                background: '#f1f5f9',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#ef4444',
                textAlign: 'left',
                marginBottom: 20,
                maxHeight: 120,
                overflowY: 'auto',
                border: '1px solid #cbd5e1'
              }}>
                {String(this.state.error.message || this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                ↻ Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#f87171',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                ⚡ Reset Session & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
