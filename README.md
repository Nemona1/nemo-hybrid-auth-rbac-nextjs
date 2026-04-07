# Nemo-Hybrid-Auth-RBAC-NextJS

## 🛡️ Enterprise-Grade Authentication & Authorization System

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.6-blue)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://postgresql.org/)
[![Security](https://img.shields.io/badge/Security-A%2B-brightgreen)](https://owasp.org/)

### 🚀 Features

#### Authentication & Security
- **JWT with Refresh Token Rotation** - Short-lived access tokens (15min) + refresh tokens (7d)
- **httpOnly Secure Cookies** - XSS-proof token storage
- **Brute Force Protection** - 3 failed attempts = 30-second lockout across all devices
- **Inactivity Session Killer** - Auto-logout after 1 minute (client + server)
- **Email Verification** - Required before any role application
- **Production Anti-Tamper** - Disables right-click, text selection, and DevTools (F12, Ctrl+Shift+I)

#### Authorization (Hybrid RBAC + PBAC)
- **Role-Based Access Control (RBAC)** - 4 system roles: ADMIN, EDITOR, MANAGER, VIEWER
- **Permission-Based Access Control (PBAC)** - Granular permissions (users:read, content:create, etc.)
- **Direct User Overrides** - Admins can grant/revoke individual permissions that override role permissions
- **Priority Logic**: Direct Deny > Direct Grant > Role Permissions

#### User Management
- **Role Application System** - Users request roles, admin approves/rejects
- **Admin Dashboard** - Full user management, role assignment, permission toggling
- **Audit Logs** - All security-critical actions logged

### 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn
- SMTP server (Gmail, SendGrid, etc.)

### 🛠️ GitHub Codespaces Setup

#### One-Click Setup
Click "Use this template" or clone the repository:

```bash
git clone https://github.com/yourusername/nemo-hybrid-auth-rbac-nextjs.git
cd nemo-hybrid-auth-rbac-nextjs