#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

/**
 * Extract version entry from the changelog
 */
function extractVersionEntry(version) {
  const content = fs.readFileSync(changelogPath, 'utf8');
  const versionHeader = `## [${version}]`;
  
  const versionStart = content.indexOf(versionHeader);
  if (versionStart === -1) {
    throw new Error(`Version ${version} not found in CHANGELOG.md`);
  }
  
  let versionEnd = content.indexOf('## [', versionStart + 1);
  if (versionEnd === -1) {
    versionEnd = content.length;
  }
  
  return content.substring(versionStart, versionEnd).trim();
}

/**
 * Create a GitHub release using the GitHub CLI
 */
async function createGitHubRelease(version, isDraft = true) {
  try {
    // Check if gh CLI is installed
    try {
      execSync('gh --version', { stdio: 'pipe' });
    } catch (error) {
      console.error('GitHub CLI (gh) is not installed or not in PATH.');
      console.error('Please install it from: https://cli.github.com/');
      process.exit(1);
    }
    
    // Get changelog entry for this version
    const changelogEntry = extractVersionEntry(version);
    
    // Create a temporary file with the release notes
    const releaseNotesPath = path.join(__dirname, '../.release-notes-temp.md');
    fs.writeFileSync(releaseNotesPath, changelogEntry, 'utf8');
    
    const draftFlag = isDraft ? '--draft' : '';
    
    // Create the GitHub release
    execSync(`gh release create v${version} ${draftFlag} --title "Release v${version}" --notes-file ${releaseNotesPath}`, { 
      stdio: 'inherit' 
    });
    
    // Remove the temporary file
    fs.unlinkSync(releaseNotesPath);
    
    console.log(`\nGitHub release for v${version} created successfully!`);
    if (isDraft) {
      console.log('The release is currently in draft state. Review it and publish when ready.');
    }
  } catch (error) {
    console.error('Failed to create GitHub release:', error.message);
  }
}

/**
 * Ask a yes/no question
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.toLowerCase().startsWith('y'));
  }));
}

async function main() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;
    
    console.log(`Current version: ${version}`);
    
    const isDraft = await askQuestion('Create as draft release? (Y/n): ');
    
    await createGitHubRelease(version, isDraft);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
