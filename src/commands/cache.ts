import { Command } from 'commander';
import { logger } from '../utils/logger';
import { listCachedConfigs, clearCache, removeFromCache } from '../utils/cache-manager';

/**
 * Cache command - manages cached environment configurations
 */
export function createCacheCommand(program: Command): void {
  const cacheCmd = program
    .command('cache')
    .description('Manage cached environment configurations');

  cacheCmd
    .command('list')
    .description('List all cached configurations')
    .action(async () => {
      try {
        await handleCacheList();
      } catch (error) {
        logger.error(`Failed to list cache: ${error}`);
        process.exit(1);
      }
    });

  cacheCmd
    .command('clear')
    .description('Clear all cached configurations')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options: { force?: boolean }) => {
      try {
        await handleCacheClear(options.force);
      } catch (error) {
        logger.error(`Failed to clear cache: ${error}`);
        process.exit(1);
      }
    });

  cacheCmd
    .command('remove <url>')
    .description('Remove a specific cached configuration')
    .action(async (url: string) => {
      try {
        await handleCacheRemove(url);
      } catch (error) {
        logger.error(`Failed to remove cache: ${error}`);
        process.exit(1);
      }
    });

  cacheCmd
    .command('stats')
    .description('Show cache statistics')
    .action(async () => {
      try {
        await handleCacheStats();
      } catch (error) {
        logger.error(`Failed to get stats: ${error}`);
        process.exit(1);
      }
    });
}

async function handleCacheList(): Promise<void> {
  logger.step('Cached Configurations');

  const configs = await listCachedConfigs();

  if (configs.length === 0) {
    logger.info('No cached configurations found');
    return;
  }

  for (const config of configs) {
    logger.item(config.repoUrl);
    logger.kv('Cached', new Date(config.cachedAt).toLocaleDateString());
    logger.kv('Expires', new Date(config.expiresAt).toLocaleDateString());
    logger.divider('-', 40);
  }

  logger.info(`Total: ${configs.length} cached configurations`);
}

async function handleCacheClear(force?: boolean): Promise<void> {
  if (!force) {
    const prompts = await import('@clack/prompts');
    const confirmed = await prompts.confirm({
      message: 'Are you sure you want to clear all cached configurations?',
    });

    if (!confirmed) {
      logger.info('Aborted');
      return;
    }
  }

  const count = await clearCache();
  logger.success(`Cleared ${count} cached configurations`);
}

async function handleCacheRemove(url: string): Promise<void> {
  const success = await removeFromCache(url);

  if (success) {
    logger.success(`Removed cache for ${url}`);
  } else {
    logger.warn(`No cache found for ${url}`);
  }
}

async function handleCacheStats(): Promise<void> {
  const configs = await listCachedConfigs();

  logger.step('Cache Statistics');
  logger.kv('Total entries', configs.length.toString());

  if (configs.length > 0) {
    const now = new Date();
    const expired = configs.filter((c) => new Date(c.expiresAt) < now).length;
    const valid = configs.length - expired;

    logger.kv('Valid entries', valid.toString());
    logger.kv('Expired entries', expired.toString());

    // Find oldest and newest
    const sorted = [...configs].sort((a, b) => a.cachedAt.getTime() - b.cachedAt.getTime());
    logger.kv('Oldest cache', new Date(sorted[0].cachedAt).toLocaleDateString());
    logger.kv('Newest cache', new Date(sorted[sorted.length - 1].cachedAt).toLocaleDateString());
  }

  // Calculate disk usage (approximate)
  const fs = await import('fs-extra');
  const { getCacheDir } = await import('../utils/file-utils');
  const cacheDir = getCacheDir();

  if (await fs.pathExists(cacheDir)) {
    const stats = await fs.stat(cacheDir);
    logger.kv('Cache directory size', `${(stats.size / 1024).toFixed(2)} KB`);
  }
}
