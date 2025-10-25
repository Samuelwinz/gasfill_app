#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up GasFill Backend...\n');

// Check if .env exists, if not copy from .env.example
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📋 Creating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env file created successfully!');
  console.log('⚠️  Please update the .env file with your actual configuration values.\n');
} else {
  console.log('✅ .env file already exists.\n');
}

// Create necessary directories
const dirs = [
  'logs',
  'uploads',
  'uploads/avatars',
  'uploads/documents',
  'uploads/proofs'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

console.log('\n🎉 Backend setup completed successfully!');
console.log('\n📝 Next steps:');
console.log('1. Update .env file with your configuration');
console.log('2. Make sure MongoDB is running');
console.log('3. Run: npm install');
console.log('4. Run: npm run dev');
console.log('\n💡 Quick start commands:');
console.log('cd backend');
console.log('npm install');
console.log('npm run dev');