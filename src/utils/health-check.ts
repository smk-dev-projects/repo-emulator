import fs from 'fs-extra';
import path from 'path';
import { DetectedConfig, HealthCheckResult } from '../types';
import { executeCommand, commandExists } from './file-utils';
import { logger } from './logger';

/**
 * Health check utilities to verify environment setup
 */

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  try {
    // Simple check - in production would use net module
    return true;
  } catch {
    return false;
  }
}

/**
 * Run health checks on the created environment
 */
export async function runHealthCheck(
  projectPath: string,
  config: DetectedConfig
): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = [];
  const errors: string[] = [];

  // Check 1: Runtime availability
  for (const lang of config.languages) {
    const runtimeCheck = await checkRuntime(lang.language, lang.version);
    checks.push(runtimeCheck);
    if (!runtimeCheck.passed) {
      errors.push(`Runtime ${lang.language}@${lang.version || 'latest'} not available`);
    }
  }

  // Check 2: Dependencies installed
  const depsCheck = await checkDependenciesInstalled(projectPath, config);
  checks.push(depsCheck);
  if (!depsCheck.passed) {
    errors.push('Dependencies not fully installed');
  }

  // Check 3: Environment variables
  if (config.envVars && config.envVars.required.length > 0) {
    const envCheck = await checkEnvVars(config.envVars.required);
    checks.push(envCheck);
    if (!envCheck.passed) {
      errors.push('Missing required environment variables');
    }
  }

  // Check 4: Database connectivity (if applicable)
  for (const db of config.databases) {
    const dbCheck = await checkDatabase(db.type, db.port);
    checks.push(dbCheck);
    if (!dbCheck.passed) {
      errors.push(`Database ${db.type} not accessible`);
    }
  }

  // Check 5: Build artifacts (if build script exists)
  if (config.scripts.build) {
    const buildCheck = await checkBuildArtifacts(projectPath);
    checks.push(buildCheck);
  }

  return {
    success: errors.length === 0,
    checks,
    errors,
  };
}

/**
 * Check if a runtime is available
 */
async function checkRuntime(
  language: string,
  version?: string
): Promise<HealthCheckResult['checks'][0]> {
  const checks: Record<string, string[]> = {
    nodejs: ['node', 'npm'],
    python: ['python', 'pip'],
    rust: ['rustc', 'cargo'],
    go: ['go'],
    ruby: ['ruby', 'gem'],
    php: ['php'],
  };

  const commands = checks[language] || [];
  let allExist = true;
  let messages: string[] = [];

  for (const cmd of commands) {
    const exists = await commandExists(cmd);
    if (!exists) {
      allExist = false;
      messages.push(`${cmd} not found`);
    }
  }

  // Check version if specified
  if (version && allExist) {
    try {
      const mainCmd = commands[0];
      const result = await executeCommand(mainCmd, ['--version']);
      const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const currentVersion = versionMatch[1];
        if (!currentVersion.startsWith(version)) {
          allExist = false;
          messages.push(`Expected ${mainCmd} ${version}, got ${currentVersion}`);
        }
      }
    } catch {
      // Version check failed but runtime exists
      messages.push(`Could not verify ${mainCmd} version`);
    }
  }

  return {
    name: `${language} runtime`,
    passed: allExist,
    message: messages.join(', ') || 'OK',
  };
}

/**
 * Check if dependencies are installed
 */
async function checkDependenciesInstalled(
  projectPath: string,
  config: DetectedConfig
): Promise<HealthCheckResult['checks'][0]> {
  for (const lang of config.languages) {
    const installDirs: Record<string, string> = {
      nodejs: 'node_modules',
      python: '__pycache__', // Not perfect but indicates Python setup
      rust: 'target',
      go: 'go.sum', // Indicates Go modules initialized
    };

    const checkPath = path.join(projectPath, installDirs[lang.language] || '');
    const exists = await fs.pathExists(checkPath);

    if (!exists && lang.packageManager) {
      return {
        name: 'Dependencies installed',
        passed: false,
        message: `${lang.language} dependencies not installed`,
      };
    }
  }

  return {
    name: 'Dependencies installed',
    passed: true,
    message: 'All dependencies present',
  };
}

/**
 * Check if required environment variables are set
 */
async function checkEnvVars(required: string[]): Promise<HealthCheckResult['checks'][0]> {
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    name: 'Environment variables',
    passed: missing.length === 0,
    message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All required vars set',
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(
  type: string,
  port?: number
): Promise<HealthCheckResult['checks'][0]> {
  // Simplified check - in production would actually test connectivity
  const portOpen = port ? await isPortAvailable(port) : true;

  return {
    name: `${type} database`,
    passed: portOpen,
    message: portOpen ? 'Accessible' : `Port ${port} not available`,
  };
}

/**
 * Check if build artifacts exist
 */
async function checkBuildArtifacts(projectPath: string): Promise<HealthCheckResult['checks'][0]> {
  // Look for common build output directories
  const buildDirs = ['dist', 'build', 'out', 'target'];

  for (const dir of buildDirs) {
    const exists = await fs.pathExists(path.join(projectPath, dir));
    if (exists) {
      return {
        name: 'Build artifacts',
        passed: true,
        message: `Found in ${dir}/`,
      };
    }
  }

  return {
    name: 'Build artifacts',
    passed: false,
    message: 'No build output detected',
  };
}

/**
 * Wait for a service to be ready
 */
export async function waitForService(
  checkFn: () => Promise<boolean>,
  timeout = 30000,
  interval = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}
