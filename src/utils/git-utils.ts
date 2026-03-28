import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger';

/**
 * Git utility functions for repository operations
 */

/**
 * Clone a Git repository
 */
export async function cloneRepo(
  url: string,
  targetPath: string,
  options: { depth?: number; branch?: string } = {}
): Promise<boolean> {
  try {
    const args = ['clone', url, targetPath];

    if (options.depth) {
      args.push('--depth', options.depth.toString());
    }

    if (options.branch) {
      args.push('--branch', options.branch);
    }

    await execa('git', args);
    return true;
  } catch (error) {
    logger.error(`Failed to clone repository: ${error}`);
    return false;
  }
}

/**
 * Get the current commit hash of a repository
 */
export async function getCommitHash(repoPath: string): Promise<string | null> {
  try {
    const result = await execa('git', ['rev-parse', 'HEAD'], { cwd: repoPath });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get the remote URL of a repository
 */
export async function getRemoteUrl(repoPath: string): Promise<string | null> {
  try {
    const result = await execa('git', ['remote', 'get-url', 'origin'], { cwd: repoPath });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Check if a directory is a Git repository
 */
export async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    const result = await execa('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dirPath,
      reject: false,
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get the default branch name of a remote repository
 */
export async function getDefaultBranch(url: string): Promise<string | null> {
  try {
    const result = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], {
      env: { GIT_TERMINAL_PROMPT: '0' },
    });
    // Extract branch name from refs/remotes/origin/main
    const match = result.stdout.match(/origin\/(.+)/);
    return match ? match[1] : null;
  } catch {
    // Fallback: try to ls-remote
    try {
      const result = await execa('git', ['ls-remote', '--symref', url, 'HEAD']);
      const match = result.stdout.match(/refs\/heads\/(\S+)/);
      return match ? match[1] : 'main';
    } catch {
      return 'main';
    }
  }
}

/**
 * Fetch latest changes from remote
 */
export async function fetchUpdates(repoPath: string): Promise<boolean> {
  try {
    await execa('git', ['fetch'], { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pull latest changes from remote
 */
export async function pullUpdates(repoPath: string): Promise<boolean> {
  try {
    await execa('git', ['pull'], { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a GitHub/GitLab URL into components
 */
export function parseRepoUrl(url: string): {
  host: string;
  owner: string;
  repo: string;
  branch?: string;
} | null {
  try {
    // Handle SSH URLs: git@github.com:owner/repo.git
    const sshMatch = url.match(/^git@([^:]+):([^/]+)\/([^.]+)(?:\.git)?(?:#(.+))?$/);
    if (sshMatch) {
      return {
        host: sshMatch[1],
        owner: sshMatch[2],
        repo: sshMatch[3],
        branch: sshMatch[4],
      };
    }

    // Handle HTTPS URLs: https://github.com/owner/repo.git
    const httpsMatch = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^.]+)(?:\.git)?(?:#(.+))?$/);
    if (httpsMatch) {
      return {
        host: httpsMatch[1],
        owner: httpsMatch[2],
        repo: httpsMatch[3],
        branch: httpsMatch[4],
      };
    }

    // Handle shorthand: owner/repo
    const shorthandMatch = url.match(/^([^/]+)\/([^#]+)(?:#(.+))?$/);
    if (shorthandMatch) {
      return {
        host: 'github.com',
        owner: shorthandMatch[1],
        repo: shorthandMatch[2].replace('.git', ''),
        branch: shorthandMatch[3],
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a safe directory name from a repo URL
 */
export function generateDirName(url: string): string {
  const parsed = parseRepoUrl(url);
  if (parsed) {
    return `${parsed.owner}-${parsed.repo}`;
  }

  // Fallback: sanitize the URL
  return url
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 100);
}

/**
 * Get list of tags from a repository
 */
export async function getTags(repoPath: string): Promise<string[]> {
  try {
    const result = await execa('git', ['tag', '-l'], { cwd: repoPath });
    return result.stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Checkout a specific branch or tag
 */
export async function checkout(repoPath: string, ref: string): Promise<boolean> {
  try {
    await execa('git', ['checkout', ref], { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}
