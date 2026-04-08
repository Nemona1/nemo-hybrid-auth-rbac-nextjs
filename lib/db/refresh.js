#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function refreshDatabase() {
  try {
    console.log('🔄 Refreshing database...');
    
    // Push schema with force reset
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    await execPromise('npx prisma db push --force-reset');
    
    console.log('✅ Database refresh complete!');
    console.log('\n📋 Next steps:');
    console.log('   npm run db:seed     - to insert seed data');

  } catch (error) {
    console.error('❌ Refresh failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  refreshDatabase();
}

module.exports = { refreshDatabase };