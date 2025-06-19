#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of things to check before releasing
const checks = [
  {
    name: 'TypeScript Compile',
    run: () => {
      try {
        execSync('npm run build', { stdio: 'inherit' });
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          message: 'TypeScript compilation failed. Fix the errors before releasing.' 
        };
      }
    }
  },
  {
    name: 'Bundle Creation',
    run: () => {
      try {
        execSync('npm run bundle', { stdio: 'inherit' });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: 'Bundle creation failed. Fix the errors before releasing.'
        };
      }
    }
  },
  {
    name: 'Version Command',
    run: () => {
      try {
        execSync('npm run version', { stdio: 'pipe' });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: 'Version command failed. Fix the version display functionality before releasing.'
        };
      }
    }
  },
  {
    name: 'Package.json version',
    run: () => {
      const packageJsonPath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check if version matches semver pattern
      const semverPattern = /^\d+\.\d+\.\d+$/;
      if (!semverPattern.test(packageJson.version)) {
        return { 
          success: false, 
          message: `Version "${packageJson.version}" does not follow semver pattern (x.y.z)` 
        };
      }
      
      return { success: true };
    }
  },  {
    name: 'CHANGELOG.md exists',
    run: () => {
      const changelogPath = path.join(__dirname, '../CHANGELOG.md');
      if (!fs.existsSync(changelogPath)) {
        return { 
          success: false, 
          message: 'CHANGELOG.md file does not exist' 
        };
      }
      
      return { success: true };
    }
  },
  {
    name: 'CHANGELOG.md content',
    run: () => {
      const changelogPath = path.join(__dirname, '../CHANGELOG.md');
      const content = fs.readFileSync(changelogPath, 'utf8');
      
      // Check if CHANGELOG has empty bullet points that need to be filled
      if (content.includes('- \n')) {
        return {
          success: false,
          message: 'CHANGELOG.md has empty entries. Fill them with meaningful changes before releasing.'
        };
      }
      
      return { success: true };
    }
  },
  {
    name: 'README.md exists',
    run: () => {
      const readmePath = path.join(__dirname, '../README.md');
      if (!fs.existsSync(readmePath)) {
        return { 
          success: false, 
          message: 'README.md file does not exist' 
        };
      }
      
      return { success: true };
    }
  },
  {
    name: 'Git status',
    run: () => {
      try {
        const status = execSync('git status --porcelain').toString().trim();
        if (status) {
          return { 
            success: false, 
            message: 'There are uncommitted changes in the repository. Commit or stash them before releasing.'
          };
        }
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          message: 'Failed to check git status: ' + error.message 
        };
      }
    }
  }
];

function runChecks() {
  console.log('Running pre-release checks...\n');
  
  let allPassed = true;
  
  checks.forEach(check => {
    process.stdout.write(`Checking: ${check.name}... `);
    
    const result = check.run();
    
    if (result.success) {
      console.log('✅ Passed');
    } else {
      console.log('❌ Failed');
      console.log(`   ${result.message}`);
      allPassed = false;
    }
  });
  
  console.log('\nPre-release checks completed.');
  
  if (!allPassed) {
    console.log('\n❌ Some checks failed. Fix the issues before releasing.');
    process.exit(1);
  }
  
  console.log('\n✅ All checks passed! Ready for release.');
}

runChecks();
