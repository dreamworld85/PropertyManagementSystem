# DGEC Project Control Dashboard

A comprehensive project management and control dashboard system for DGEC.

## Features
- **Administrator Portal**: Manage users, roles, projects, and overall configuration.
- **Project Manager Portal**: Track projects, allocate tasks, manage timelines.
- **Staff Engineer Portal**: View assigned tasks, update progress.
- **Client Portal**: Track project progress, view documents, invoice status.
- **Database Backend**: Node.js and Express connected to a MySQL/MariaDB database.
- **Frontend Portal**: Modern interactive web interface built with Vite and React.

## Getting Started

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Database Initialization
Ensure you have a MySQL server running on the port configured in `.env` (default is `3307`), then initialize the database and default admin accounts:
```bash
node init_db.js
```

### 3. Running the Project

To start the backend server:
```bash
node server.js
```

To start the frontend Vite development server:
```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) to access the dashboard.
