import { Command } from 'commander';
import path from 'path';
import execa from 'execa';
import { logger } from '../utils/logger';
import { projectDetector } from '../detectors';
import { fileExists, dirExists } from '../utils/file-utils';

/**
 * Run command - runs a project in its isolated environment
 */
export function createRunCommand(program: Command): void {
  program
    .command('run [path]')
    .description('Run a project in its isolated environment')
    .option('-c, --command <cmd>', 'Command to run')
    .option('-d, --docker', 'Use Docker container')
    .option('--env <key=value>', 'Environment variables', collectEnv, {})
    .action(async (path: string | undefined, options: { command?: string; docker?: boolean; env?: Record<string, string> }) => {
      try {
        await handleRun(path || process.cwd(), options);
      } catch (error) {
        logger.error(`Run failed: ${error}`);
        process.exit(1);
      }
    });
}

function collectEnv(val: string, memo: Record<string, string>): Record<string, string> {
  const [key, value] = val.split('=');
  if (key && value) {
    memo[key] = value;
  }
  return memo;
}

async function handleRun(
  projectPath: string,
  options: { command?: string; docker?: boolean; env?: Record<string, string> }
): Promise<void> {
  logger.step(`Running project: ${projectPath}`);

  // Check if project exists
  if (!(await dirExists(projectPath))) {
    logger.error(`Project directory not found: ${projectPath}`);
    return;
  }

  // Detect project configuration
  const config = await projectDetector.detect(projectPath);

  if (config.languages.length === 0) {
    logger.warn('No recognized language detected. Running with default settings.');
  }

  // Determine what to run
  const command = options.command || config.scripts.start || getDefaultRunCommand(config);

  if (!command) {
    logger.error('No start command found. Specify one with -c/--command');
    logger.info('Available scripts:');
    for (const [name, cmd] of Object.entries(config.scripts)) {
      logger.item(`${name}: ${cmd}`);
    }
    return;
  }

  logger.info(`Running: ${command}`);

  // Run based on environment type
  if (options.docker && config.docker?.hasDockerCompose) {
    await runInDocker(projectPath, command, config.docker.composeServices?.[0]);
  } else {
    await runNative(projectPath, command, options.env);
  }
}

async function runNative(
  projectPath: string,
  command: string,
  env?: Record<string, string>
): Promise<void> {
  logger.info('Starting native execution...');

  try {
    // Parse command into executable and args
    const parts = command.split(' ');
    const executable = parts[0];
    const args = parts.slice(1);

    // Set up environment
    const fullEnv = {
      ...process.env,
      ...env,
    };

    // Load .env file if it exists
    const envPath = path.join(projectPath, '.env');
    if (await fileExists(envPath)) {
      const fs = await import('fs-extra');
      const content = await fs.readFile(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (match) {
          fullEnv[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
      }
    }

    // Execute the command
    const result = await execa(executable, args, {
      cwd: projectPath,
      env: fullEnv,
      stdio: 'inherit',
      reject: false,
    });

    if (result.exitCode === 0) {
      logger.success('Process completed successfully');
    } else {
      logger.warn(`Process exited with code ${result.exitCode}`);
    }
  } catch (error) {
    logger.error(`Execution failed: ${error}`);
  }
}

async function runInDocker(
  projectPath: string,
  command: string,
  service?: string
): Promise<void> {
  logger.info('Starting Docker execution...');

  try {
    const args = ['exec'];

    if (service) {
      args.push(service);
    } else {
      args.push('app');
    }

    // Add command
    const shellCommand = command.includes(' ') ? `-c "${command}"` : command;
    if (command.includes(' ')) {
      args.push('sh', '-c', command);
    } else {
      args.push(command);
    }

    await execa('docker-compose', args, {
      cwd: projectPath,
      stdio: 'inherit',
    });

    logger.success('Docker execution completed');
  } catch (error) {
    logger.error(`Docker execution failed: ${error}`);
  }
}

function getDefaultRunCommand(config: Awaited<ReturnType<typeof projectDetector.detect>>): string {
  // Get primary language
  const primaryLang = config.languages[0]?.language;

  switch (primaryLang) {
    case 'nodejs':
      // Check for common start commands
      if (config.scripts.start) return config.scripts.start;
      return 'npm start';
    case 'python':
      // Look for main.py, app.py, or similar
      return 'python main.py';
    case 'rust':
      return 'cargo run';
    case 'go':
      return 'go run .';
    case 'ruby':
      return 'bundle exec ruby app.rb';
    case 'php':
      return 'php index.php';
    default:
      return '';
  }
}
