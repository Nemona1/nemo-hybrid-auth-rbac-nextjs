#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\x1b[36m╔════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[36m║                                                                ║\x1b[0m');
console.log('\x1b[36m║     🚀 NEMO AUTH - Complete Authentication System             ║\x1b[0m');
console.log('\x1b[36m║     Copying all authentication files to your project          ║\x1b[0m');
console.log('\x1b[36m║                                                                ║\x1b[0m');
console.log('\x1b[36m╚════════════════════════════════════════════════════════════════╝\x1b[0m\n');

const projectRoot = process.cwd();
const packageRoot = path.join(__dirname, '..');

// Function to copy directory recursively
function copyDirectory(src, dest, overwrite = false) {
  if (!fs.existsSync(src)) {
    console.log(`  ⚠️ Source not found: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip node_modules and .next
    if (entry.name === 'node_modules' || entry.name === '.next') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, overwrite);
    } else {
      // Don't overwrite existing .env file
      if (entry.name === '.env' && fs.existsSync(destPath)) {
        console.log(`  ⏭️ Skipped (already exists): ${destPath}`);
        return;
      }
      
      // Don't overwrite existing package.json
      if (entry.name === 'package.json' && fs.existsSync(destPath)) {
        console.log(`  ⏭️ Skipped (already exists): ${destPath}`);
        return;
      }

      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ Copied: ${path.relative(projectRoot, destPath)}`);
    }
  }
}

// Function to merge package.json dependencies
function mergePackageJson() {
  const projectPackagePath = path.join(projectRoot, 'package.json');
  const templatePackagePath = path.join(packageRoot, 'templates/package.json');

  if (!fs.existsSync(projectPackagePath)) {
    console.log('  ⚠️ No package.json found');
    return;
  }

  const projectPackage = JSON.parse(fs.readFileSync(projectPackagePath, 'utf8'));
  const templatePackage = JSON.parse(fs.readFileSync(templatePackagePath, 'utf8'));

  // Merge dependencies
  projectPackage.dependencies = {
    ...projectPackage.dependencies,
    ...templatePackage.dependencies
  };

  projectPackage.devDependencies = {
    ...projectPackage.devDependencies,
    ...templatePackage.devDependencies
  };

  fs.writeFileSync(projectPackagePath, JSON.stringify(projectPackage, null, 2));
  console.log('  ✓ Updated package.json with required dependencies');
}

console.log('\x1b[33m📦 Copying authentication system files...\x1b[0m\n');

// Copy all directories
const itemsToCopy = [
  { src: 'templates/app', dest: 'app', required: true },
  { src: 'templates/components', dest: 'components', required: true },
  { src: 'templates/context', dest: 'context', required: true },
  { src: 'templates/hooks', dest: 'hooks', required: true },
  { src: 'templates/lib', dest: 'lib', required: true },
  { src: 'templates/prisma', dest: 'prisma', required: true },
  { src: 'templates/styles', dest: 'styles', required: false }
];

for (const item of itemsToCopy) {
  const srcPath = path.join(packageRoot, item.src);
  const destPath = path.join(projectRoot, item.dest);
  
  if (fs.existsSync(srcPath)) {
    copyDirectory(srcPath, destPath);
  } else if (item.required) {
    console.log(`  ❌ Required directory not found: ${item.src}`);
  }
}

// Copy root files
const rootFiles = [
  { src: 'templates/middleware.js', dest: 'middleware.js' },
  { src: 'templates/tailwind.config.js', dest: 'tailwind.config.js' },
  { src: 'templates/next.config.mjs', dest: 'next.config.mjs' },
  { src: 'templates/postcss.config.mjs', dest: 'postcss.config.mjs' },
  { src: 'templates/jsconfig.json', dest: 'jsconfig.json' }
];

console.log('\n\x1b[33m📄 Copying configuration files...\x1b[0m\n');

for (const file of rootFiles) {
  const srcPath = path.join(packageRoot, file.src);
  const destPath = path.join(projectRoot, file.dest);
  
  if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copied: ${file.dest}`);
  } else if (fs.existsSync(destPath)) {
    console.log(`  ⏭️ Skipped (already exists): ${file.dest}`);
  }
}

// Create .env file
console.log('\n\x1b[33m🔐 Setting up environment variables...\x1b[0m\n');

const envExample = `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/your_db"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars-different"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@yourapp.com"

# Application URL
NEXTAUTH_URL="http://localhost:3000"

# Security Thresholds
MAX_LOGIN_ATTEMPTS="3"
LOCKOUT_DURATION_SECONDS="30"
INACTIVITY_TIMEOUT_SECONDS="60"

# Environment
NODE_ENV="development"
`;

const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envExample);
  console.log('  ✓ Created: .env');
}

if (!fs.existsSync(envExamplePath)) {
  fs.writeFileSync(envExamplePath, envExample);
  console.log('  ✓ Created: .env.example');
}

// Install dependencies
console.log('\n\x1b[33m📦 Installing dependencies...\x1b[0m\n');

try {
  execSync('npm install @prisma/client bcryptjs jsonwebtoken nodemailer react-hot-toast lucide-react axios zod next-themes @radix-ui/react-tooltip', { stdio: 'inherit' });
  execSync('npm install -D prisma tailwindcss postcss autoprefixer', { stdio: 'inherit' });
  console.log('  ✓ Dependencies installed');
} catch (error) {
  console.log('  ⚠️ Please run: npm install');
}

// Setup database
console.log('\n\x1b[33m🗄️ Setting up database...\x1b[0m\n');

try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('  ✓ Prisma client generated');
} catch (error) {
  console.log('  ⚠️ Please run: npx prisma generate');
}

console.log('\n\x1b[32m╔════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[32m║                                                                ║\x1b[0m');
console.log('\x1b[32m║              ✅ SETUP COMPLETE!                                 ║\x1b[0m');
console.log('\x1b[32m║                                                                ║\x1b[0m');
console.log('\x1b[32m╚════════════════════════════════════════════════════════════════╝\x1b[0m\n');

console.log('\x1b[36m📚 Next Steps:\x1b[0m');
console.log('  1. Update your .env file with your database URL');
console.log('  2. Run: npx prisma db push');
console.log('  3. Run: npm run dev');
console.log('  4. Visit: http://localhost:3000/login\n');

console.log('\x1b[36m🔗 Demo Accounts (run seed first):\x1b[0m');
console.log('  👑 Admin: admin@nemo-auth.com / Admin@123456');
console.log('  👁️ Viewer: viewer@nemo-auth.com / Viewer@123456\n');

console.log('\x1b[36m📖 Documentation:\x1b[0m');
console.log('  https://github.com/Nemona1/nemo-auth-nextjs\n');
