#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to package.json
const packageJsonPath = path.join(__dirname, '../package.json');

// Version types
const VALID_VERSION_TYPES = ['major', 'minor', 'patch'];

function getPackageJson() {
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  return JSON.parse(content);
}

function writePackageJson(packageJson) {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
}

function updateChangelog(version, type) {
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];
  
  let changelog = fs.readFileSync(changelogPath, 'utf8');
  
  // Prepare the new version entry
  let newVersionEntry = `\n## [${version}] - ${date}\n\n`;
  
  switch (type) {
    case 'major':
      newVersionEntry += `### Breaking Changes\n- \n\n### Added\n- \n\n`;
      break;
    case 'minor':
      newVersionEntry += `### Added\n- \n\n### Changed\n- \n\n`;
      break;
    case 'patch':
      newVersionEntry += `### Fixed\n- \n\n`;
      break;
  }
  
  // Find where to insert the new entry (after the header section)
  const headerEndPos = changelog.indexOf('## [');
  if (headerEndPos === -1) {
    throw new Error('Could not find version section in CHANGELOG.md');
  }
  
  // Insert the new entry
  changelog = 
    changelog.substring(0, headerEndPos) + 
    newVersionEntry + 
    changelog.substring(headerEndPos);
  
  fs.writeFileSync(changelogPath, changelog, 'utf8');
  
  console.log(`Updated CHANGELOG.md with ${version} entry`);
  console.log('Please fill in the details of the changes');
}

function commitAndTagRelease(version) {
  try {
    // Commit version changes
    console.log('Committing version changes...');
    execSync(`git add package.json CHANGELOG.md`, { stdio: 'inherit' });
    execSync(`git commit -m "Release v${version}"`, { stdio: 'inherit' });
    console.log(`Changes committed successfully`);
    
    // Create a git tag
    console.log('Creating git tag...');
    execSync(`git tag -a v${version} -m "Release v${version}"`, { stdio: 'inherit' });
    console.log(`Created git tag v${version}`);
    
    console.log('\nTo push the changes and tag to the repository:');
    console.log(`git push origin main && git push origin v${version}`);
    
    // Provide the option to push directly
    console.log('\nOr push now with:');
    console.log(`git push origin main && git push origin v${version}`);
  } catch (error) {
    console.error('Failed to commit or create git tag:', error.message);
    console.error('You may need to commit and tag manually.');
  }
}

function bumpVersion(type) {
  if (!VALID_VERSION_TYPES.includes(type)) {
    console.error(`Invalid version type: ${type}`);
    console.error(`Valid types: ${VALID_VERSION_TYPES.join(', ')}`);
    process.exit(1);
  }
  
  const packageJson = getPackageJson();
  const currentVersion = packageJson.version;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  console.log(`Bumping version from ${currentVersion} to ${newVersion}`);
  
  // Update package.json
  packageJson.version = newVersion;
  writePackageJson(packageJson);
  console.log(`Updated package.json version to ${newVersion}`);
  
  // Update CHANGELOG.md
  updateChangelog(newVersion, type);
    // Commit and tag the release
  commitAndTagRelease(newVersion);
  
  return newVersion;
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch';
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node release.js [major|minor|patch]');
    process.exit(0);
  }
  
  try {
    bumpVersion(versionType);
  } catch (error) {
    console.error('Error during version bump:', error);
    process.exit(1);
  }
}

main();
