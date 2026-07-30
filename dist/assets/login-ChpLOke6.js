import{a as x,j as e,r as o}from"./client-CkCYsZd5.js";function h(){const[l,b]=o.useState(""),[d,u]=o.useState(""),[n,g]=o.useState(!1),[m,c]=o.useState("");o.useEffect(()=>{localStorage.removeItem("dgec_user")},[]);const f=async a=>{if(a.preventDefault(),!l.trim()||!d.trim()){c("Please fill in all fields.");return}g(!0),c("");try{const s=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:l.trim(),password:d.trim()})}),r=await s.json();if(!s.ok)throw new Error(r.error||"Login failed. Please try again.");localStorage.setItem("dgec_user",JSON.stringify(r.user));const t=(r.user.role||"").toLowerCase(),i=(r.user.userType||"").toLowerCase(),p=(r.user.username||r.user.name||"").toLowerCase();p==="client"||p==="anjana"||t==="client"||t.includes("client")||i==="client"?window.location.href="/client":t==="admin"||i==="admin"?window.location.href="/admin":t==="project manager"||t==="project_manager"||i==="project manager"||i==="project_manager"||p==="projectmanager"?window.location.href="/":window.location.href="/staff"}catch(s){c(s.message)}finally{g(!1)}};return e.jsxs("div",{className:"login-wrap",children:[e.jsx("style",{children:`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        
        :root {
          --bg: #0b0f19;
          --surface: rgba(17, 24, 39, 0.7);
          --border: rgba(255, 255, 255, 0.08);
          --accent: #10b981;
          --accent-hover: #059669;
          --ink: #f3f4f6;
          --muted: #9ca3af;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background-color: var(--bg);
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--ink);
          overflow: hidden;
        }

        .login-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100vw;
          padding: 20px;
          background: radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                      #0b0f19;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          backdrop-filter: blur(16px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--accent), #6366f1);
          border-radius: 12px;
          font-size: 24px;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(to right, #ffffff, #d1d5db);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          font-size: 13.5px;
          color: var(--muted);
          margin-top: 6px;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
        }

        .input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--ink);
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        .btn-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 12px;
          background: var(--accent);
          border: none;
          border-radius: 10px;
          color: #0b0f19;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(11, 15, 25, 0.2);
          border-top-color: #0b0f19;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .footer {
          text-align: center;
          margin-top: 24px;
          font-size: 12px;
          color: var(--muted);
        }
      `}),e.jsxs("div",{className:"login-card",children:[e.jsxs("div",{className:"header",children:[e.jsx("div",{className:"logo",children:"⚒"}),e.jsx("h1",{className:"title",children:"DGEC Portals"}),e.jsx("p",{className:"subtitle",children:"Enter credentials to access your dashboard"})]}),m&&e.jsx("div",{className:"error-banner",children:m}),e.jsxs("form",{onSubmit:f,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{className:"label",children:"Username or Email"}),e.jsx("div",{className:"input-wrapper",children:e.jsx("input",{type:"text",className:"input",placeholder:"e.g. admin",value:l,onChange:a=>b(a.target.value),disabled:n,autoFocus:!0})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{className:"label",children:"Password"}),e.jsx("div",{className:"input-wrapper",children:e.jsx("input",{type:"password",className:"input",placeholder:"••••••••",value:d,onChange:a=>u(a.target.value),disabled:n})})]}),e.jsx("button",{type:"submit",className:"btn-submit",disabled:n,children:n?e.jsx("div",{className:"spinner"}):"Log In"})]}),e.jsxs("div",{className:"footer",children:["© ",new Date().getFullYear()," DGEC Engineering. All rights reserved."]})]})]})}const w=document.getElementById("root"),v=x(w);v.render(e.jsx(h,{}));
