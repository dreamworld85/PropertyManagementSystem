import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Auto-generate .env on production server if it does not exist
const envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️ .env file not found, creating default production .env...');
  const envContent = `# SMTP Mail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Portals configurations
API_PORT=3000
PORTAL_URL=https://webapp.greensparrows.com
DISABLE_EMAIL=true

# Database configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=u859202671_pmf_circle_us
DB_PASSWORD=Welcome_2026@
DB_NAME=u859202671_pmf_circle_its
`;
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log('✅ Default .env file created.');
}

dotenv.config();
