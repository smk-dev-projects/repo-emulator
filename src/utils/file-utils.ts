import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';

/**
 * File utility functions for common file operations
 */

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read a JSON file safely
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Write a JSON file with formatting
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.outputJSON(filePath, data, { spaces: 2 });
}

/**
 * Read a text file
 */
export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Find files matching a pattern in a directory (recursive)
 */
export async function findFiles(
  dir: string,
  patterns: string[],
  maxDepth = 3
): Promise<string[]> {
  const results: string[] = [];

  async function search(currentDir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip common ignore directories
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'vendor' ||
          entry.name === '__pycache__' ||
          entry.name === 'target' ||
          entry.name === 'build' ||
          entry.name === 'dist'
        ) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await search(fullPath, depth + 1);
        } else if (patterns.includes(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  await search(dir, 0);
  return results;
}

/**
 * Parse .env file format into key-value pairs
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Match KEY=value or KEY="value" or KEY='value'
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      result[key] = cleanValue;
    }
  }

  return result;
}

/**
 * Get the home directory
 */
export function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || '/tmp';
}

/**
 * Get the cache directory for repo-emulator
 */
export function getCacheDir(): string {
  const baseDir = process.env.REPO_EMULATOR_CACHE || path.join(getHomeDir(), '.repo-emulator');
  return path.join(baseDir, 'cache');
}

/**
 * Get the config directory for repo-emulator
 */
export function getConfigDir(): string {
  const baseDir = process.env.REPO_EMULATOR_CONFIG || path.join(getHomeDir(), '.repo-emulator');
  return path.join(baseDir, 'config');
}

/**
 * Ensure a directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Remove a directory recursively
 */
export async function removeDir(dirPath: string): Promise<void> {
  await fs.remove(dirPath);
}

/**
 * Copy a directory recursively
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.copy(src, dest);
}

/**
 * Execute a command and return the output
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: Record<string, string>; silent?: boolean } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa(command, args, {
      cwd: options.cwd,
      env: options.env,
      reject: false,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; exitCode?: number };
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.exitCode ?? 1,
    };
  }
}

/**
 * Check if a command is available in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    await execa('which', [command]);
    return true;
  } catch {
    // Try Windows 'where' command
    try {
      await execa('where', [command]);
      return true;
    } catch {
      return false;
    }
  }
}
