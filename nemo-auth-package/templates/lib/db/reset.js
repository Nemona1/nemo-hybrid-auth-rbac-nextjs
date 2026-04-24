#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    // Step 1: Push schema to database
    console.log('\n📦 Step 1: Pushing schema...');
    await execPromise('npx prisma db push --force-reset');
    console.log('✅ Schema pushed successfully!');
    
    // Step 2: Generate Prisma client
    console.log('\n🔧 Step 2: Generating Prisma client...');
    await execPromise('npx prisma generate');
    console.log('✅ Prisma client generated!');
    
    // Step 3: Run seed
    console.log('\n🌱 Step 3: Seeding database...');
    await execPromise('npm run db:seed');
    console.log('✅ Seed completed!');
    
    console.log('\n🎉 Database reset complete!');
    console.log('\n📋 Demo Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 ADMIN     : admin@nemo-auth.com / Admin@123456');
    console.log('✏️  EDITOR    : editor@nemo-auth.com / Editor@123456');
    console.log('📊 MANAGER   : manager@nemo-auth.com / Manager@123456');
    console.log('👁️  VIEWER    : viewer@nemo-auth.com / Viewer@123456');
    console.log('⏳ PENDING   : pending@nemo-auth.com / Pending@123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };