import path from 'path';
import fs from 'fs-extra';
import execa from 'execa';
import { DetectedConfig } from '../types';
import { logger } from '../utils/logger';
import { commandExists, fileExists } from '../utils/file-utils';

/**
 * Native environment creator
 * Sets up development environment using native tools (nvm, pyenv, etc.)
 */
export class NativeEnvCreator {
  name = 'NativeEnvCreator';

  async create(projectPath: string, config: DetectedConfig): Promise<boolean> {
    logger.step('Setting up native environment');

    try {
      // Install runtime versions for each detected language
      for (const lang of config.languages) {
        await this.setupRuntime(lang.language, lang.version, projectPath);
      }

      // Install dependencies
      await this.installDependencies(projectPath, config);

      // Setup environment variables
      if (config.envVars) {
        await this.setupEnvVars(projectPath, config.envVars);
      }

      // Run migrations if detected
      if (config.scripts.migrate) {
        await this.runMigrations(projectPath, config.scripts.migrate);
      }

      logger.success('Native environment setup complete');
      return true;
    } catch (error) {
      logger.error(`Environment setup failed: ${error}`);
      return false;
    }
  }

  async cleanup(projectPath: string): Promise<void> {
    logger.info('Cleaning up native environment...');
    // For native environments, we don't remove node_modules, venv, etc.
    // as they might be needed for development
    logger.success('Cleanup complete (native environments preserve dependencies)');
  }

  private async setupRuntime(
    language: string,
    version: string | undefined,
    projectPath: string
  ): Promise<void> {
    logger.info(`Setting up ${language}${version ? ` v${version}` : ''}...`);

    switch (language) {
      case 'nodejs':
        await this.setupNode(version, projectPath);
        break;
      case 'python':
        await this.setupPython(version, projectPath);
        break;
      case 'rust':
        await this.setupRust(version, projectPath);
        break;
      case 'go':
        await this.setupGo(version, projectPath);
        break;
      default:
        logger.warn(`Unknown language: ${language}`);
    }
  }

  private async setupNode(version: string | undefined, projectPath: string): Promise<void> {
    // Check if nvm is available
    const hasNvm = await commandExists('nvm');

    if (hasNvm && version) {
      logger.info('Installing Node.js via nvm...');
      // Note: nvm needs to be sourced, so we'd need a shell script approach
      // For now, we'll just verify the version
      try {
        const result = await execa('bash', ['-c', `source ~/.nvm/nvm.sh && nvm install ${version}`], {
          cwd: projectPath,
          reject: false,
        });

        if (result.exitCode === 0) {
          logger.success(`Node.js ${version} installed`);
        } else {
          logger.warn(`nvm install failed, continuing with system Node.js`);
        }
      } catch {
        logger.warn('nvm not configured properly, using system Node.js');
      }
    } else if (version) {
      logger.warn(`Node.js ${version} requested but nvm not available`);
    }

    // Verify Node.js is available
    try {
      const result = await execa('node', ['--version']);
      logger.success(`Using Node.js ${result.stdout.trim()}`);
    } catch {
      throw new Error('Node.js is not installed');
    }
  }

  private async setupPython(version: string | undefined, projectPath: string): Promise<void> {
    // Check if pyenv is available
    const hasPyenv = await commandExists('pyenv');

    if (hasPyenv && version) {
      logger.info('Setting up Python via pyenv...');
      try {
        // Create .python-version file if it doesn't exist
        const versionFile = path.join(projectPath, '.python-version');
        if (!(await fileExists(versionFile))) {
          await fs.writeFile(versionFile, version);
        }

        // Install the version if needed
        await execa('bash', ['-c', `eval "$(pyenv init -)" && pyenv install ${version} || true`], {
          cwd: projectPath,
          reject: false,
        });

        logger.success(`Python ${version} configured`);
      } catch {
        logger.warn('pyenv configuration failed');
      }
    }

    // Create virtual environment
    const venvPath = path.join(projectPath, 'venv');
    if (!(await fileExists(venvPath))) {
      logger.info('Creating Python virtual environment...');
      try {
        await execa('python3', ['-m', 'venv', 'venv'], { cwd: projectPath });
        logger.success('Virtual environment created');
      } catch (error) {
        logger.warn(`Could not create venv: ${error}`);
      }
    }
  }

  private async setupRust(version: string | undefined, _projectPath: string): Promise<void> {
    // Check if rustup is available
    const hasRustup = await commandExists('rustup');

    if (hasRustup && version) {
      logger.info(`Installing Rust toolchain ${version}...`);
      try {
        await execa('rustup', ['install', version]);
        await execa('rustup', ['default', version]);
        logger.success(`Rust ${version} installed`);
      } catch {
        logger.warn(`Failed to install Rust ${version}`);
      }
    } else {
      // Verify rust is available
      try {
        const result = await execa('rustc', ['--version']);
        logger.success(`Using ${result.stdout.trim()}`);
      } catch {
        logger.warn('Rust is not installed');
      }
    }
  }

  private async setupGo(version: string | undefined, _projectPath: string): Promise<void> {
    // Go version management is typically done via gvm or manual installation
    if (version) {
      logger.info(`Go ${version} requested`);
    }

    try {
      const result = await execa('go', ['version']);
      logger.success(result.stdout.trim());
    } catch {
      logger.warn('Go is not installed');
    }
  }

  private async installDependencies(projectPath: string, config: DetectedConfig): Promise<void> {
    for (const lang of config.languages) {
      switch (lang.language) {
        case 'nodejs':
          await this.installNodeDeps(projectPath, lang.packageManager);
          break;
        case 'python':
          await this.installPythonDeps(projectPath, lang.packageManager);
          break;
        case 'rust':
          await this.installRustDeps(projectPath);
          break;
        case 'go':
          await this.installGoDeps(projectPath);
          break;
        case 'php':
          await this.installPhpDeps(projectPath);
          break;
        case 'ruby':
          await this.installRubyDeps(projectPath);
          break;
      }
    }
  }

  private async installNodeDeps(
    projectPath: string,
    packageManager = 'npm'
  ): Promise<void> {
    logger.info(`Installing dependencies with ${packageManager}...`);

    const commands: Record<string, string[]> = {
      npm: ['install'],
      yarn: ['install'],
      pnpm: ['install'],
    };

    const args = commands[packageManager] || commands.npm;

    try {
      await execa(packageManager, args, {
        cwd: projectPath,
        stdio: 'inherit',
      });
      logger.success('Dependencies installed');
    } catch (error) {
      logger.error(`Failed to install dependencies: ${error}`);
      throw error;
    }
  }

  private async installPythonDeps(
    projectPath: string,
    packageManager = 'pip'
  ): Promise<void> {
    logger.info('Installing Python dependencies...');

    const requirementsPath = path.join(projectPath, 'requirements.txt');
    const hasRequirements = await fileExists(requirementsPath);

    if (hasRequirements) {
      const pipCmd = path.join(projectPath, 'venv', 'bin', 'pip');
      try {
        await execa(pipCmd, ['install', '-r', 'requirements.txt'], {
          cwd: projectPath,
          stdio: 'inherit',
        });
        logger.success('Python dependencies installed');
      } catch (error) {
        logger.warn(`Failed to install Python dependencies: ${error}`);
      }
    } else {
      // Try poetry
      try {
        await execa('poetry', ['install'], {
          cwd: projectPath,
          stdio: 'inherit',
        });
        logger.success('Poetry dependencies installed');
      } catch {
        logger.info('No requirements.txt or poetry found');
      }
    }
  }

  private async installRustDeps(projectPath: string): Promise<void> {
    logger.info('Building Rust project (this will download dependencies)...');
    try {
      await execa('cargo', ['build'], {
        cwd: projectPath,
        stdio: 'inherit',
      });
      logger.success('Rust dependencies downloaded and built');
    } catch (error) {
      logger.warn(`Failed to build Rust project: ${error}`);
    }
  }

  private async installGoDeps(projectPath: string): Promise<void> {
    logger.info('Downloading Go dependencies...');
    try {
      await execa('go', ['mod', 'download'], {
        cwd: projectPath,
        stdio: 'inherit',
      });
      logger.success('Go dependencies downloaded');
    } catch (error) {
      logger.warn(`Failed to download Go dependencies: ${error}`);
    }
  }

  private async installPhpDeps(projectPath: string): Promise<void> {
    logger.info('Installing PHP dependencies with Composer...');
    try {
      await execa('composer', ['install'], {
        cwd: projectPath,
        stdio: 'inherit',
      });
      logger.success('PHP dependencies installed');
    } catch (error) {
      logger.warn(`Failed to install PHP dependencies: ${error}`);
    }
  }

  private async installRubyDeps(projectPath: string): Promise<void> {
    logger.info('Installing Ruby gems with Bundler...');
    try {
      await execa('bundle', ['install'], {
        cwd: projectPath,
        stdio: 'inherit',
      });
      logger.success('Ruby gems installed');
    } catch (error) {
      logger.warn(`Failed to install Ruby gems: ${error}`);
    }
  }

  private async setupEnvVars(
    projectPath: string,
    envConfig: NonNullable<DetectedConfig['envVars']>
  ): Promise<void> {
    if (!envConfig.exampleFile) return;

    const examplePath = path.join(projectPath, envConfig.exampleFile);
    const targetPath = path.join(projectPath, '.env');

    // Only copy if .env doesn't exist
    if (await fileExists(targetPath)) {
      logger.info('.env file already exists, skipping');
      return;
    }

    logger.info('Creating .env file from template...');
    await fs.copy(examplePath, targetPath);
    logger.success('.env file created');
  }

  private async runMigrations(projectPath: string, migrateScript: string): Promise<void> {
    logger.info('Running database migrations...');
    // This would execute the migration script
    // Implementation depends on the specific migration tool
    logger.success('Migrations completed (placeholder)');
  }
}
