import fs from 'fs-extra';
import path from 'path';
import { getCacheDir, ensureDir, readJsonFile, writeJsonFile } from './file-utils';
import { CacheEntry, DetectedConfig } from '../types';
import { logger } from './logger';

/**
 * Cache manager for storing and retrieving environment configurations
 */

const CACHE_TTL_DAYS = 7; // Cache expires after 7 days

/**
 * Generate a cache key from a repo URL
 */
function generateCacheKey(repoUrl: string): string {
  return Buffer.from(repoUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Get the cache file path for a repo
 */
function getCacheFilePath(repoUrl: string): string {
  const cacheDir = getCacheDir();
  const key = generateCacheKey(repoUrl);
  return path.join(cacheDir, `${key}.json`);
}

/**
 * Save a configuration to cache
 */
export async function saveToCache(
  repoUrl: string,
  commitHash: string,
  config: DetectedConfig
): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    await ensureDir(cacheDir);

    const cacheEntry: CacheEntry = {
      repoUrl,
      commitHash,
      config,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000),
    };

    const cacheFile = getCacheFilePath(repoUrl);
    await writeJsonFile(cacheFile, cacheEntry);

    logger.debug(`Saved config to cache for ${repoUrl}`);
  } catch (error) {
    logger.warn(`Failed to save cache: ${error}`);
  }
}

/**
 * Load a configuration from cache
 */
export async function loadFromCache(
  repoUrl: string,
  commitHash?: string
): Promise<DetectedConfig | null> {
  try {
    const cacheFile = getCacheFilePath(repoUrl);
    const entry = await readJsonFile<CacheEntry>(cacheFile);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (new Date(entry.expiresAt) < new Date()) {
      logger.debug('Cache entry expired');
      await fs.remove(cacheFile);
      return null;
    }

    // If commit hash provided, check if it matches
    if (commitHash && entry.commitHash !== commitHash) {
      logger.debug('Commit hash mismatch, cache not applicable');
      return null;
    }

    logger.debug(`Loaded config from cache for ${repoUrl}`);
    return entry.config;
  } catch {
    return null;
  }
}

/**
 * Remove a cached configuration
 */
export async function removeFromCache(repoUrl: string): Promise<boolean> {
  try {
    const cacheFile = getCacheFilePath(repoUrl);
    await fs.remove(cacheFile);
    logger.success(`Removed cache for ${repoUrl}`);
    return true;
  } catch (error) {
    logger.error(`Failed to remove cache: ${error}`);
    return false;
  }
}

/**
 * List all cached configurations
 */
export async function listCachedConfigs(): Promise<Array<{ repoUrl: string; cachedAt: Date; expiresAt: Date }>> {
  try {
    const cacheDir = getCacheDir();

    if (!(await fs.pathExists(cacheDir))) {
      return [];
    }

    const files = await fs.readdir(cacheDir);
    const configs: Array<{ repoUrl: string; cachedAt: Date; expiresAt: Date }> = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(cacheDir, file);
        const entry = await readJsonFile<CacheEntry>(filePath);

        if (entry) {
          configs.push({
            repoUrl: entry.repoUrl,
            cachedAt: new Date(entry.cachedAt),
            expiresAt: new Date(entry.expiresAt),
          });
        }
      }
    }

    // Sort by most recent first
    return configs.sort((a, b) => b.cachedAt.getTime() - a.cachedAt.getTime());
  } catch {
    return [];
  }
}

/**
 * Clear all cached configurations
 */
export async function clearCache(): Promise<number> {
  try {
    const cacheDir = getCacheDir();

    if (!(await fs.pathExists(cacheDir))) {
      return 0;
    }

    const files = await fs.readdir(cacheDir);
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.remove(path.join(cacheDir, file));
        count++;
      }
    }

    logger.success(`Cleared ${count} cached configurations`);
    return count;
  } catch (error) {
    logger.error(`Failed to clear cache: ${error}`);
    return 0;
  }
}

/**
 * Check if a repo has a valid cache entry
 */
export async function hasValidCache(repoUrl: string, commitHash?: string): Promise<boolean> {
  const config = await loadFromCache(repoUrl, commitHash);
  return config !== null;
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const cacheDir = getCacheDir();

    if (!(await fs.pathExists(cacheDir))) {
      return 0;
    }

    const files = await fs.readdir(cacheDir);
    let count = 0;
    const now = new Date();

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(cacheDir, file);
        const entry = await readJsonFile<CacheEntry>(filePath);

        if (entry && new Date(entry.expiresAt) < now) {
          await fs.remove(filePath);
          count++;
        }
      }
    }

    if (count > 0) {
      logger.debug(`Cleaned up ${count} expired cache entries`);
    }

    return count;
  } catch {
    return 0;
  }
}
