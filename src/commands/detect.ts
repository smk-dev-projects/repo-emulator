import { Command } from 'commander';
import { logger } from '../utils/logger';
import { projectDetector } from '../detectors';

/**
 * Detect command - analyzes a project and shows detected configuration
 */
export function createDetectCommand(program: Command): void {
  program
    .command('detect [path]')
    .description('Analyze an existing project and show detected configuration')
    .option('-j, --json', 'Output as JSON')
    .action(async (path: string | undefined, options: { json?: boolean }) => {
      try {
        await handleDetect(path || process.cwd(), options);
      } catch (error) {
        logger.error(`Detection failed: ${error}`);
        process.exit(1);
      }
    });
}

async function handleDetect(projectPath: string, options: { json?: boolean }): Promise<void> {
  logger.step(`Analyzing project: ${projectPath}`);

  const config = await projectDetector.detect(projectPath);

  if (options.json) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  displayDetectedConfig(config);
}

function displayDetectedConfig(config: Awaited<ReturnType<typeof projectDetector.detect>>): void {
  logger.divider();
  logger.info(`Project: ${config.projectName}`);
  logger.info(`Path: ${config.projectPath}`);
  logger.info(`Confidence: ${(config.confidence * 100).toFixed(1)}%`);

  logger.divider();

  if (config.languages.length > 0) {
    logger.step('Languages Detected');
    for (const lang of config.languages) {
      logger.item(`${lang.language}`);
      logger.kv('Version', lang.version || 'Any');
      logger.kv('Package Manager', lang.packageManager || 'Default');
      if (lang.dependencies?.length) {
        logger.kv('Dependencies', `${lang.dependencies.length} packages`);
      }
    }
  } else {
    logger.warn('No languages detected');
  }

  if (config.databases.length > 0) {
    logger.step('Databases');
    for (const db of config.databases) {
      logger.item(db.type);
      if (db.port) logger.kv('Port', db.port.toString());
      if (db.host) logger.kv('Host', db.host);
    }
  }

  if (config.docker) {
    logger.step('Docker Configuration');
    if (config.docker.hasDockerfile) {
      logger.success('Dockerfile found');
    }
    if (config.docker.hasDockerCompose) {
      logger.success('docker-compose.yml found');
      if (config.docker.composeServices) {
        logger.info('Services:');
        for (const service of config.docker.composeServices) {
          logger.item(service);
        }
      }
    }
  }

  if (config.envVars) {
    logger.step('Environment Variables');
    if (config.envVars.exampleFile) {
      logger.kv('Template', config.envVars.exampleFile);
    }
    logger.kv('Required', config.envVars.required.length.toString());
    logger.kv('Optional', config.envVars.optional.length.toString());
  }

  if (Object.keys(config.scripts).length > 0) {
    logger.step('Available Scripts');
    for (const [name, cmd] of Object.entries(config.scripts)) {
      logger.item(`${name}: ${cmd}`);
    }
  }

  if (config.warnings.length > 0) {
    logger.step('Warnings');
    for (const warning of config.warnings) {
      logger.item(warning);
    }
  }

  logger.divider();
}
