import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as prompts from '@clack/prompts';
import { logger } from '../utils/logger';
import { getConfigDir, ensureDir, readJsonFile, writeJsonFile } from '../utils/file-utils';
import { GlobalConfig } from '../types';

const DEFAULT_CONFIG: GlobalConfig = {
  cacheDir: path.join(process.env.HOME || '~', '.repo-emulator', 'cache'),
  defaultUseDocker: false,
  autoConfirm: false,
  mcpAutoGenerate: true,
};

/**
 * Config command - manages global configuration
 */
export function createConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage global configuration');

  configCmd
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      try {
        await handleConfigShow();
      } catch (error) {
        logger.error(`Failed to show config: ${error}`);
        process.exit(1);
      }
    });

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string) => {
      try {
        await handleConfigSet(key, value);
      } catch (error) {
        logger.error(`Failed to set config: ${error}`);
        process.exit(1);
      }
    });

  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key: string) => {
      try {
        await handleConfigGet(key);
      } catch (error) {
        logger.error(`Failed to get config: ${error}`);
        process.exit(1);
      }
    });

  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options: { force?: boolean }) => {
      try {
        await handleConfigReset(options.force);
      } catch (error) {
        logger.error(`Failed to reset config: ${error}`);
        process.exit(1);
      }
    });

  configCmd
    .command('init')
    .description('Initialize configuration file')
    .action(async () => {
      try {
        await handleConfigInit();
      } catch (error) {
        logger.error(`Failed to init config: ${error}`);
        process.exit(1);
      }
    });
}

async function getConfigPath(): Promise<string> {
  const configDir = getConfigDir();
  await ensureDir(configDir);
  return path.join(configDir, 'config.json');
}

async function loadConfig(): Promise<GlobalConfig> {
  const configPath = await getConfigPath();
  const config = await readJsonFile<GlobalConfig>(configPath);
  return config || { ...DEFAULT_CONFIG };
}

async function saveConfig(config: GlobalConfig): Promise<void> {
  const configPath = await getConfigPath();
  await writeJsonFile(configPath, config);
}

async function handleConfigShow(): Promise<void> {
  const config = await loadConfig();

  logger.step('Current Configuration');
  logger.kv('Cache Directory', config.cacheDir);
  logger.kv('Default Use Docker', config.defaultUseDocker.toString());
  logger.kv('Auto Confirm', config.autoConfirm.toString());
  logger.kv('MCP Auto Generate', config.mcpAutoGenerate.toString());
  if (config.preferredPackageManager) {
    logger.kv('Preferred Package Manager', config.preferredPackageManager);
  }
}

async function handleConfigSet(key: string, value: string): Promise<void> {
  const config = await loadConfig();

  // Validate and set the key
  switch (key) {
    case 'cacheDir':
      config.cacheDir = value;
      break;
    case 'defaultUseDocker':
      config.defaultUseDocker = value === 'true';
      break;
    case 'autoConfirm':
      config.autoConfirm = value === 'true';
      break;
    case 'mcpAutoGenerate':
      config.mcpAutoGenerate = value === 'true';
      break;
    case 'preferredPackageManager':
      if (!['npm', 'yarn', 'pnpm'].includes(value)) {
        logger.error('Invalid package manager. Must be npm, yarn, or pnpm');
        return;
      }
      config.preferredPackageManager = value;
      break;
    default:
      logger.error(`Unknown configuration key: ${key}`);
      logger.info('Available keys: cacheDir, defaultUseDocker, autoConfirm, mcpAutoGenerate, preferredPackageManager');
      return;
  }

  await saveConfig(config);
  logger.success(`Set ${key} = ${value}`);
}

async function handleConfigGet(key: string): Promise<void> {
  const config = await loadConfig();

  let value: unknown;
  switch (key) {
    case 'cacheDir':
      value = config.cacheDir;
      break;
    case 'defaultUseDocker':
      value = config.defaultUseDocker;
      break;
    case 'autoConfirm':
      value = config.autoConfirm;
      break;
    case 'mcpAutoGenerate':
      value = config.mcpAutoGenerate;
      break;
    case 'preferredPackageManager':
      value = config.preferredPackageManager;
      break;
    default:
      logger.error(`Unknown configuration key: ${key}`);
      return;
  }

  logger.info(`${key}: ${value}`);
}

async function handleConfigReset(force?: boolean): Promise<void> {
  if (!force) {
    const confirmed = await prompts.confirm({
      message: 'Are you sure you want to reset all configuration to defaults?',
    });

    if (!confirmed) {
      logger.info('Aborted');
      return;
    }
  }

  await saveConfig(DEFAULT_CONFIG);
  logger.success('Configuration reset to defaults');
}

async function handleConfigInit(): Promise<void> {
  const configPath = await getConfigPath();

  if (await fs.pathExists(configPath)) {
    const shouldOverwrite = await prompts.confirm({
      message: 'Configuration file already exists. Overwrite?',
    });

    if (!shouldOverwrite) {
      logger.info('Aborted');
      return;
    }
  }

  await saveConfig(DEFAULT_CONFIG);
  logger.success(`Configuration initialized at ${configPath}`);

  logger.info('Edit the configuration file directly or use:');
  logger.item('repo-emulator config set <key> <value>');
}
