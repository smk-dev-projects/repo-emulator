import path from 'path';
import { execa } from 'execa';
import { DetectedConfig } from '../types';
import { logger } from '../utils/logger';
import { commandExists, fileExists } from '../utils/file-utils';

/**
 * Docker environment creator
 * Sets up development environment using Docker containers
 */
export class DockerEnvCreator {
  name = 'DockerEnvCreator';

  async create(projectPath: string, config: DetectedConfig): Promise<boolean> {
    logger.step('Setting up Docker environment');

    // Check if Docker is available
    const hasDocker = await commandExists('docker');
    const hasDockerCompose = await commandExists('docker-compose');

    if (!hasDocker) {
      logger.error('Docker is not installed. Please install Docker first.');
      return false;
    }

    try {
      if (config.docker?.hasDockerCompose && hasDockerCompose) {
        await this.setupWithCompose(projectPath, config);
      } else if (config.docker?.hasDockerfile) {
        await this.setupWithDockerfile(projectPath, config);
      } else {
        // Create a temporary Docker setup
        await this.createTemporaryContainer(projectPath, config);
      }

      logger.success('Docker environment setup complete');
      return true;
    } catch (error) {
      logger.error(`Docker setup failed: ${error}`);
      return false;
    }
  }

  async cleanup(projectPath: string): Promise<void> {
    logger.info('Cleaning up Docker containers...');

    try {
      // Stop and remove containers
      await execa('docker-compose', ['down'], {
        cwd: projectPath,
        reject: false,
      });

      logger.success('Docker containers cleaned up');
    } catch (error) {
      logger.warn(`Cleanup failed: ${error}`);
    }
  }

  private async setupWithCompose(projectPath: string, _config: DetectedConfig): Promise<void> {
    logger.info('Starting services with docker-compose...');

    // Build and start all services
    await execa('docker-compose', ['up', '-d', '--build'], {
      cwd: projectPath,
      stdio: 'inherit',
    });

    logger.success('All services started');

    // Show service status
    await execa('docker-compose', ['ps'], {
      cwd: projectPath,
      stdio: 'inherit',
    });
  }

  private async setupWithDockerfile(projectPath: string, config: DetectedConfig): Promise<void> {
    logger.info('Building Docker image...');

    const imageName = `repo-emulator-${path.basename(projectPath).toLowerCase()}`;

    // Build the image
    await execa('docker', ['build', '-t', imageName, '-f', 'Dockerfile', '.'], {
      cwd: projectPath,
      stdio: 'inherit',
    });

    logger.success(`Image ${imageName} built`);

    // Determine port mappings from config
    const ports: string[] = [];
    for (const db of config.databases) {
      if (db.port) {
        ports.push(`${db.port}:${db.port}`);
      }
    }

    // Default web app ports
    if (config.languages.some((l) => l.language === 'nodejs')) {
      ports.push('3000:3000');
    }

    logger.info('Container ready to run');
    logger.info(`Run with: docker run -p ${ports.join(' -p ')} ${imageName}`);
  }

  private async createTemporaryContainer(
    projectPath: string,
    config: DetectedConfig
  ): Promise<void> {
    logger.info('Creating temporary development container...');

    // Generate a basic Dockerfile based on detected languages
    const dockerfile = this.generateDockerfile(config);

    const tempDockerfilePath = path.join(projectPath, 'Dockerfile.repo-emulator');
    const fs = await import('fs-extra');
    await fs.writeFile(tempDockerfilePath, dockerfile);

    const imageName = `repo-emulator-temp-${Date.now()}`;

    logger.info('Building temporary image...');
    await execa('docker', ['build', '-t', imageName, '-f', 'Dockerfile.repo-emulator', '.'], {
      cwd: projectPath,
      stdio: 'inherit',
    });

    logger.success('Temporary container created');
    logger.info(`Image: ${imageName}`);

    // Clean up temp Dockerfile
    await fs.remove(tempDockerfilePath);
  }

  private generateDockerfile(config: DetectedConfig): string {
    const lines: string[] = [];

    // Base image based on primary language
    const primaryLang = config.languages[0];

    if (!primaryLang) {
      lines.push('FROM ubuntu:22.04');
    } else {
      switch (primaryLang.language) {
        case 'nodejs':
          lines.push(`FROM node:${primaryLang.version || '18'}-alpine`);
          break;
        case 'python':
          lines.push(`FROM python:${primaryLang.version || '3.11'}-slim`);
          break;
        case 'rust':
          lines.push(`FROM rust:${primaryLang.version || 'latest'}`);
          break;
        case 'go':
          lines.push(`FROM golang:${primaryLang.version || '1.21'}`);
          break;
        default:
          lines.push('FROM ubuntu:22.04');
      }
    }

    lines.push('WORKDIR /app');
    lines.push('COPY . .');

    // Add installation commands based on language
    for (const lang of config.languages) {
      switch (lang.language) {
        case 'nodejs':
          if (lang.packageManager === 'yarn') {
            lines.push('RUN yarn install');
          } else if (lang.packageManager === 'pnpm') {
            lines.push('RUN npm install -g pnpm && pnpm install');
          } else {
            lines.push('RUN npm install');
          }
          break;
        case 'python':
          lines.push('RUN pip install --no-cache-dir -r requirements.txt || true');
          break;
        case 'rust':
          lines.push('RUN cargo build --release');
          break;
        case 'go':
          lines.push('RUN go mod download && go build');
          break;
      }
    }

    // Expose common ports
    lines.push('EXPOSE 3000 8000 8080');

    // Default command
    lines.push('CMD ["sh", "-c", "echo \'Container ready. Use docker run -it to execute commands.\'"]');

    return lines.join('\n');
  }

  /**
   * Run a command inside the Docker container
   */
  async runInContainer(
    projectPath: string,
    command: string,
    args: string[]
  ): Promise<{ stdout: string; exitCode: number }> {
    try {
      const result = await execa('docker-compose', ['exec', '-T', 'app', command, ...args], {
        cwd: projectPath,
      });

      return {
        stdout: result.stdout,
        exitCode: result.exitCode,
      };
    } catch (error) {
      const err = error as { stdout?: string; exitCode?: number };
      return {
        stdout: err.stdout || '',
        exitCode: err.exitCode ?? 1,
      };
    }
  }
}
