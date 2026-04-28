// bump-version.js
// This script bumps the patch version in package.json and syncs it to .env

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'package.json');
const envFiles = ['.env', '.env.prod'];

// Read package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Bump patch version
const versionParts = pkg.version.split('.');
versionParts[2] = (+versionParts[2] + 1).toString();
pkg.version = versionParts.join('.');

// Write back to package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');


// Update all env files with new version
envFiles.forEach((envFile) => {
  const envPath = path.join(__dirname, envFile);
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Remove existing VITE_VERSION
    envContent = envContent.replace(/^VITE_VERSION=.*$/m, '');
    envContent = envContent.trim() + '\n';
  }
  // Add new version
  envContent += `VITE_VERSION=${pkg.version}\n`;
  fs.writeFileSync(envPath, envContent);
});

console.log(`Version bumped to ${pkg.version}`);