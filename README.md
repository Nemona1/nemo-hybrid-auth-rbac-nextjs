markdown
# Nemo-Hybrid-Auth-RBAC-NextJS

## 🛡️ Enterprise-Grade Authentication & Authorization System

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-blue)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://postgresql.org/)
[![Security](https://img.shields.io/badge/Security-A%2B-brightgreen)](https://owasp.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Authentication Flow](#-authentication-flow)
- [Authorization System](#-authorization-system)
- [Two-Factor Authentication (2FA)](#-two-factor-authentication-2fa)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Security Features](#-security-features)
- [Customization Guide](#-customization-guide)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Demo Accounts](#-demo-accounts)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 Overview

**Nemo-Hybrid-Auth-RBAC-NextJS** is a production-ready, enterprise-grade authentication and authorization system built with Next.js 15 App Router. It combines **Role-Based Access Control (RBAC)** with **Permission-Based Access Control (PBAC)** to provide a flexible and secure authorization system.

### Key Highlights

- ✅ **Complete Authentication System** - Registration, Login, Email Verification, Password Reset
- ✅ **Two-Factor Authentication (2FA)** - Email-based OTP verification with backup codes
- ✅ **Hybrid RBAC/PBAC** - Role-based permissions with direct user overrides
- ✅ **Enterprise Security** - Brute force protection, inactivity timeout, anti-tamper measures
- ✅ **Admin Dashboard** - User management, role management, permission toggling
- ✅ **Audit & Security Logs** - Complete logging of all security-critical actions
- ✅ **Dark/Light Mode** - Enterprise color palette with theme toggle
- ✅ **Responsive Design** - Mobile-friendly with collapsible sidebar

---

## 🚀 Features

### Authentication & Security

| Feature | Description |
|---------|-------------|
| **JWT with Refresh Token Rotation** | Short-lived access tokens (15min) + refresh tokens (7d) |
| **httpOnly Secure Cookies** | XSS-proof token storage |
| **Brute Force Protection** | 3 failed attempts = 30-second lockout across all devices |
| **Inactivity Session Killer** | Auto-logout after 1 minute (client + server) |
| **Email Verification** | Required before any role application |
| **Password Reset Flow** | OTP-based secure password reset |
| **Production Anti-Tamper** | Disables right-click, text selection, and DevTools (F12, Ctrl+Shift+I) |
| **Two-Factor Authentication (2FA)** | Email-based OTP verification with backup codes |
| **Trusted Devices** | Remember trusted devices for 30 days |

### Authorization (Hybrid RBAC + PBAC)

| Feature | Description |
|---------|-------------|
| **Role-Based Access Control (RBAC)** | 4 system roles: ADMIN, EDITOR, MANAGER, VIEWER |
| **Permission-Based Access Control (PBAC)** | Granular permissions (users:read, content:create, etc.) |
| **Direct User Overrides** | Admins can grant/revoke individual permissions that override role permissions |
| **Priority Logic** | Direct Deny > Direct Grant > Role Permissions |

### User Management

| Feature | Description |
|---------|-------------|
| **Role Application System** | Users request roles with justification |
| **Admin Dashboard** | Full user management, role assignment, permission toggling |
| **Audit Logs** | All security-critical actions logged |
| **Security Logs** | Dedicated logging for authentication and security events |
| **Session Management** | View and revoke active sessions |
| **Profile Management** | Update profile info, change password with OTP |

### UI/UX Features

| Feature | Description |
|---------|-------------|
| **Dark/Light Mode** | Enterprise color palette with theme toggle |
| **Responsive Design** | Mobile-friendly with collapsible sidebar |
| **Toast Notifications** | Real-time feedback for all actions |
| **Tooltips** | Helpful hints on all interactive elements |
| **Loading States** | Spinners and skeletons for async operations |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15.1 (App Router) |
| **Language** | JavaScript (No TypeScript) |
| **Database** | PostgreSQL (Neon Console / Any PostgreSQL) |
| **ORM** | Prisma 5.22 |
| **Authentication** | JWT with refresh token rotation |
| **Email** | Nodemailer (SMTP) |
| **Styling** | Tailwind CSS 3.4 |
| **Icons** | Lucide React |
| **UI Components** | Radix UI (Tooltips) |
| **Notifications** | React Hot Toast |

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ (or Neon account for serverless)
- npm or yarn
- SMTP server (Gmail, SendGrid, etc.)

### One-Command Setup

```bash
git clone https://github.com/yourusername/nemo-hybrid-auth-rbac-nextjs.git
cd nemo-hybrid-auth-rbac-nextjs
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
📦 Installation
Step 1: Clone the Repository
bash
git clone https://github.com/yourusername/nemo-hybrid-auth-rbac-nextjs.git
cd nemo-hybrid-auth-rbac-nextjs
Step 2: Install Dependencies
bash
npm install
Step 3: Configure Environment Variables
bash
cp .env.example .env
Edit .env with your database and email credentials:

env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nemo_auth"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars-different"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@nemo-auth.com"

# Application URL
NEXTAUTH_URL="http://localhost:3000"

# Security Thresholds
MAX_LOGIN_ATTEMPTS="3"
LOCKOUT_DURATION_SECONDS="30"
INACTIVITY_TIMEOUT_SECONDS="60"

# Environment
NODE_ENV="development"
Step 4: Setup Database
bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed database with roles and demo users
npm run db:seed
Step 5: Start Development Server
bash
npm run dev
Visit http://localhost:3000

🔐 Environment Variables
Variable	Description	Required	Default
DATABASE_URL	PostgreSQL connection string	✅	-
JWT_SECRET	Secret for JWT signing (min 32 chars)	✅	-
JWT_REFRESH_SECRET	Secret for refresh tokens (min 32 chars)	✅	-
SMTP_HOST	SMTP server host	✅	-
SMTP_PORT	SMTP server port	✅	587
SMTP_USER	SMTP authentication user	✅	-
SMTP_PASS	SMTP authentication password	✅	-
EMAIL_FROM	Sender email address	✅	-
NEXTAUTH_URL	Application URL	✅	http://localhost:3000
MAX_LOGIN_ATTEMPTS	Failed attempts before lockout	❌	3
LOCKOUT_DURATION_SECONDS	Lockout duration in seconds	❌	30
INACTIVITY_TIMEOUT_SECONDS	Session timeout in seconds	❌	60
NODE_ENV	Environment	❌	development
🗄️ Database Setup
Using Local PostgreSQL
bash
# Create database
createdb nemo_auth

# Push schema
npx prisma db push

# Seed data
npm run db:seed
Using Neon (Serverless PostgreSQL)
Create account at Neon Console

Create a new project

Copy connection string

Add ?sslmode=require to the connection string

Update DATABASE_URL in .env

Database Management Commands
bash
# Push schema changes (preserves data)
npx prisma db push

# Reset database (deletes all data)
npm run db:reset

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
🔄 Authentication Flow
Registration Flow
text
1. User submits registration form
         ↓
2. System validates email format and password strength
         ↓
3. Creates user with `isVerified = false`
         ↓
4. Sends verification email with 24-hour expiry token
         ↓
5. User clicks verification link
         ↓
6. Email verified → User can now login
Login Flow (with 2FA)
text
1. User enters email & password
         ↓
2. System validates credentials
         ↓
3. Checks if 2FA is enabled
         ↓
   YES → Sends OTP to email → User enters OTP → Verified → Login
   NO  → Direct login
         ↓
4. Generates JWT tokens (access + refresh)
         ↓
5. Sets httpOnly cookies
         ↓
6. Redirects to role-specific dashboard
Password Reset Flow
text
1. User requests password reset
         ↓
2. System sends 6-digit OTP to email (10 min expiry)
         ↓
3. User enters OTP
         ↓
4. Verified → User enters new password
         ↓
5. Password updated → All sessions invalidated
🎯 Authorization System
System Roles
Role	Description	Permissions
ADMIN	Full system access	All permissions
MANAGER	Team management	users:read, content:create/edit/delete/publish
EDITOR	Content management	content:create/edit/view
VIEWER	Read-only access	content:view
Permission Categories
Category	Permissions
User	users:read, users:create, users:update, users:delete
Role	roles:read, roles:create, roles:update, roles:delete
Permission	permissions:assign, permissions:direct
Content	content:create, content:edit, content:delete, content:publish, content:view
System	admin:access, audit:read
Hybrid Logic
text
Permission Check Order:
1. Check Direct Deny → If found, DENY
2. Check Direct Grant → If found, ALLOW
3. Check Role Permissions → If found, ALLOW
4. Default → DENY
🔐 Two-Factor Authentication (2FA)
Features
✅ Email-based OTP - 6-digit code sent to registered email

✅ Backup Codes - 10 one-time use backup codes

✅ Trusted Devices - Remember device for 30 days

✅ Rate Limiting - 5 failed attempts = 1 minute lockout

✅ Audit Logging - All 2FA events logged

Setup Flow
text
1. User clicks "Enable 2FA" toggle
         ↓
2. Confirmation modal appears
         ↓
3. User clicks "Continue"
         ↓
4. System sends OTP to email
         ↓
5. User enters OTP
         ↓
6. OTP verified → 2FA enabled
         ↓
7. Backup codes displayed (save them!)
Login with 2FA
text
1. User enters email & password
         ↓
2. System detects 2FA enabled
         ↓
3. Sends OTP to email
         ↓
4. Redirects to /verify-2fa
         ↓
5. User enters OTP (or backup code)
         ↓
6. Option to trust device
         ↓
7. Verified → Login complete
📡 API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/auth/register	Register new user
POST	/api/auth/login	Login user
POST	/api/auth/logout	Logout user
POST	/api/auth/refresh	Refresh access token
GET	/api/auth/me	Get current user
GET	/api/auth/verify/[token]	Verify email
POST	/api/auth/resend-verification	Resend verification email
Password Management
Method	Endpoint	Description
POST	/api/auth/request-password-change	Request OTP for password change
POST	/api/auth/verify-otp	Verify OTP
POST	/api/auth/verify-otp-change-password	Change password with OTP
POST	/api/auth/forgot-password	Request password reset
POST	/api/auth/reset-password	Reset password with token
Two-Factor Authentication
Method	Endpoint	Description
POST	/api/auth/2fa/setup	Initiate 2FA setup
POST	/api/auth/2fa/enable	Enable 2FA with OTP
POST	/api/auth/2fa/disable	Disable 2FA
POST	/api/auth/2fa/verify-login	Verify 2FA during login
POST	/api/auth/2fa/resend	Resend 2FA OTP
Admin Operations
Method	Endpoint	Description
GET	/api/admin/users	Get all users
PUT	/api/admin/users	Update user role/application
GET	/api/admin/roles	Get all roles
POST	/api/admin/roles	Create role
PUT	/api/admin/roles	Update role
DELETE	/api/admin/roles	Delete role
GET	/api/admin/permissions	Get all permissions
POST	/api/admin/permissions	Grant/revoke permission
GET	/api/admin/audit	Get audit logs
GET	/api/admin/security-logs	Get security logs
User Operations
Method	Endpoint	Description
PUT	/api/auth/update-profile	Update user profile
POST	/api/auth/change-password	Change password
GET	/api/user/activity	Get user activity
POST	/api/user/activity	Update activity
POST	/api/user/role-application	Submit role application
GET	/api/user/role-application	Get application status
POST	/api/user/revoke-session	Revoke specific session
POST	/api/user/revoke-all-sessions	Revoke all other sessions
📁 Project Structure
text
nemo-hybrid-auth-rbac-nextjs/
├── app/
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── admin/                # Admin endpoints
│   │   └── user/                 # User endpoints
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── dashboard/                # Role-specific dashboards
│   │   ├── admin/                # Admin dashboard
│   │   ├── manager/              # Manager dashboard
│   │   ├── editor/               # Editor dashboard
│   │   └── viewer/               # Viewer dashboard
│   ├── admin/                    # Admin management pages
│   │   ├── users/                # User management
│   │   ├── roles/                # Role management
│   │   └── permissions/          # Permission management
│   ├── profile/                  # User profile
│   ├── role-request/             # Role request page
│   ├── verify-2fa/               # 2FA verification page
│   └── verify/                   # Email verification pages
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── layout/                   # Layout components (Navbar, Sidebar)
│   ├── admin/                    # Admin components
│   └── profile/                  # Profile components
├── lib/
│   ├── auth/                     # Authentication utilities
│   ├── email/                    # Email services
│   ├── db/                       # Database utilities
│   ├── audit.js                  # Audit logging
│   └── security-log.js           # Security logging
├── hooks/                        # Custom React hooks
├── prisma/                       # Database schema
├── middleware.js                 # Next.js middleware
├── .env.example                  # Environment variables template
└── package.json                  # Dependencies
🔒 Security Features
Implemented Security Measures
Attack Vector	Mitigation Strategy	Implementation
SQL Injection	Prisma ORM parameterized queries	All database queries use Prisma
XSS	React auto-escaping + CSP headers	Content-Security-Policy in middleware
CSRF	SameSite=Strict cookies + token validation	httpOnly cookies with SameSite
Brute Force	Rate limiting + progressive lockout	3 attempts = 30s lockout, tracked in DB
Session Hijacking	Refresh token rotation	New tokens invalidate old ones
MITM	HSTS + Secure cookies	HTTPS enforced in production
DevTools Exploits	Anti-tamper hooks	Disabled shortcuts in production
Weak Passwords	OWASP-compliant validation	8+ chars, upper, lower, number, special
2FA Bypass	OTP verification + backup codes	Email-based 2FA with rate limiting
Security Headers
javascript
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Logging Strategy
Log Type	Purpose	Examples
Security Logs	Critical security events	LOGIN_FAILED, 2FA_ENABLED, PASSWORD_CHANGED
Audit Logs	General user actions	PROFILE_UPDATED, ROLE_CREATED, CONTENT_PUBLISHED
⚙️ Customization Guide
Adjust Security Thresholds
Edit .env:

env
# Change lockout duration (seconds)
LOCKOUT_DURATION_SECONDS=30

# Change max login attempts
MAX_LOGIN_ATTEMPTS=3

# Change inactivity timeout (seconds)
INACTIVITY_TIMEOUT_SECONDS=60
Modify Password Requirements
Edit lib/auth/security.js:

javascript
const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 12,  // Change minimum length
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true
};
Add Custom Permission
Edit prisma/seed.js:

javascript
const permissionList = [
  { name: 'reports:generate', category: 'analytics', description: 'Generate reports' },
];
Then run:

bash
npm run db:seed
Add New Role
Edit prisma/seed.js:

javascript
const roles = {
  ANALYST: { name: 'ANALYST', description: 'Can view analytics', isSystem: false }
};

const rolePermissions = {
  ANALYST: [permissions['reports:read'].id]
};
Customize Email Templates
Email templates are located in:

lib/email/sendVerificationEmail.js - Verification emails

lib/email/sendOtpEmail.js - OTP emails

lib/email/roleDecisionEmail.js - Role decision emails

lib/email/passwordResetEmail.js - Password reset emails

Change Color Palette
Edit app/globals.css:

css
:root {
  --background: #F1F5F9;
  --foreground: #020617;
  --primary: #0EA5E9;
  --secondary: #38BDF8;
  --accent: #EF4444;
}
🚀 Deployment
Deploy to Vercel
bash
npm run build
vercel --prod
Deploy to Railway
Add DATABASE_URL to Railway environment variables

Deploy from GitHub repository

Deploy to Render
Create a new Web Service

Connect your GitHub repository

Add environment variables

Deploy

Production Checklist
Set NODE_ENV=production

Use strong JWT secrets (32+ characters)

Enable HTTPS

Configure proper CORS settings

Set up database backups

Configure monitoring and alerts

Set up rate limiting for production

Use a production-ready email service

🐛 Troubleshooting
Database Connection Issues
bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Reset database
npx prisma db push --force-reset
npm run db:seed
JWT Token Errors
bash
# Clear browser cookies
# Login again to get fresh tokens
Email Not Sending
For Gmail, use App Password:

Enable 2FA on Google account

Generate App Password at https://myaccount.google.com/apppasswords

Use that 16-character password in SMTP_PASS

2FA Issues
bash
# Check if OTP is stored in database
npx prisma studio

# Verify twoFactorEnabled field is true
# Check twoFactorOtp and twoFactorOtpExpiry fields
Build Errors
bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
👥 Demo Accounts
Role	Email	Password	Dashboard
👑 Admin	admin@nemo-auth.com	Admin@123456	/dashboard/admin
✏️ Editor	editor@nemo-auth.com	Editor@123456	/dashboard/editor
📊 Manager	manager@nemo-auth.com	Manager@123456	/dashboard/manager
👁️ Viewer	viewer@nemo-auth.com	Viewer@123456	/dashboard/viewer
⏳ Pending	pending@nemo-auth.com	Pending@123456	/role-request
⚠️ IMPORTANT: Change the admin password immediately after first login!

🤝 Contributing
Fork the repository

Create your feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add some amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Next.js - The React Framework

Prisma - Next-generation ORM

Tailwind CSS - Utility-first CSS framework

Lucide Icons - Beautiful icons

Radix UI - Accessible components

OWASP - Security guidelines

📞 Support
Documentation: docs.nemo-auth.com

Issues: GitHub Issues

Security Issues: security@nemo-auth.com

⭐ Show Your Support
If you found this project helpful, please give it a ⭐ on GitHub!

Built with ❤️ for enterprise security

Report Bug · Request Feature

text

This README file contains all the information from your installation guide, including:
- Complete project overview
- All features (including 2FA)
- Quick start guide
- Detailed installation instructions
- Environment variables
- Database setup
- Authentication flow diagrams
- Authorization system details
- Complete API endpoint documentation
- Project structure
- Security features
- Customization guide
- Deployment instructions
- Troubleshooting section
- Demo accounts
- Contributing guidelines
- License information

You can copy this entire markdown and save it as `README.md` in your project root.