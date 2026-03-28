import execa from 'execa';
import { logger } from '../utils/logger';
import { commandExists } from '../utils/file-utils';

/**
 * Runtime installer utility
 * Handles installation of version managers (nvm, pyenv, rustup, etc.)
 */
export class RuntimeInstaller {
  /**
   * Install nvm (Node Version Manager)
   */
  async installNvm(): Promise<boolean> {
    logger.info('Installing nvm...');

    try {
      // Check if already installed
      const hasNvm = await commandExists('nvm');
      if (hasNvm) {
        logger.success('nvm is already installed');
        return true;
      }

      // Install nvm using official install script
      const result = await execa('bash', [
        '-c',
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash',
      ]);

      if (result.exitCode === 0) {
        logger.success('nvm installed successfully');
        logger.info('Please restart your terminal or run: source ~/.bashrc');
        return true;
      } else {
        logger.error('Failed to install nvm');
        return false;
      }
    } catch (error) {
      logger.error(`Error installing nvm: ${error}`);
      return false;
    }
  }

  /**
   * Install pyenv (Python Version Manager)
   */
  async installPyenv(): Promise<boolean> {
    logger.info('Installing pyenv...');

    try {
      const hasPyenv = await commandExists('pyenv');
      if (hasPyenv) {
        logger.success('pyenv is already installed');
        return true;
      }

      // Install pyenv using official installer
      const result = await execa('bash', [
        '-c',
        'curl https://pyenv.run | bash',
      ]);

      if (result.exitCode === 0) {
        logger.success('pyenv installed successfully');
        logger.info('Add the following to your shell config:');
        logger.info('  export PYENV_ROOT="$HOME/.pyenv"');
        logger.info('  export PATH="$PYENV_ROOT/bin:$PATH"');
        logger.info('  eval "$(pyenv init --path)"');
        return true;
      } else {
        logger.error('Failed to install pyenv');
        return false;
      }
    } catch (error) {
      logger.error(`Error installing pyenv: ${error}`);
      return false;
    }
  }

  /**
   * Install rustup (Rust Toolchain Manager)
   */
  async installRustup(): Promise<boolean> {
    logger.info('Installing rustup...');

    try {
      const hasRustup = await commandExists('rustup');
      if (hasRustup) {
        logger.success('rustup is already installed');
        return true;
      }

      // Install rustup
      const result = await execa('bash', [
        '-c',
        'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
      ]);

      if (result.exitCode === 0) {
        logger.success('rustup installed successfully');
        logger.info('Please restart your terminal or run: source $HOME/.cargo/env');
        return true;
      } else {
        logger.error('Failed to install rustup');
        return false;
      }
    } catch (error) {
      logger.error(`Error installing rustup: ${error}`);
      return false;
    }
  }

  /**
   * Check if a runtime is available and offer to install it
   */
  async checkAndOfferInstall(runtime: string): Promise<boolean> {
    const runtimeCommands: Record<string, string> = {
      nodejs: 'node',
      python: 'python3',
      rust: 'rustc',
      go: 'go',
      ruby: 'ruby',
      php: 'php',
    };

    const cmd = runtimeCommands[runtime];
    if (!cmd) {
      logger.warn(`Unknown runtime: ${runtime}`);
      return false;
    }

    const exists = await commandExists(cmd);

    if (exists) {
      logger.success(`${runtime} is available`);
      return true;
    }

    logger.warn(`${runtime} is not installed`);

    // Offer to install
    const installers: Record<string, () => Promise<boolean>> = {
      nodejs: () => this.installNvm(),
      python: () => this.installPyenv(),
      rust: () => this.installRustup(),
    };

    const installer = installers[runtime];
    if (installer) {
      logger.info(`Would you like to install ${runtime}?`);
      // In CLI, we'd use prompts here
      // For now, just return false
      return false;
    }

    logger.info(`Please install ${runtime} manually`);
    return false;
  }

  /**
   * Get installation instructions for a runtime
   */
  getInstallationInstructions(runtime: string): string {
    const instructions: Record<string, string> = {
      nodejs: `
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# After installation, restart terminal and run:
nvm install --lts
`,
      python: `
# Install pyenv (Python Version Manager)
curl https://pyenv.run | bash

# Add to your shell config (~/.bashrc or ~/.zshrc):
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"

# Then install Python:
pyenv install 3.11.0
pyenv global 3.11.0
`,
      rust: `
# Install rustup (Rust Toolchain Manager)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# After installation, restart terminal or run:
source $HOME/.cargo/env
`,
      go: `
# Install Go
# Visit https://golang.org/dl/ and download for your platform

# Or use package manager:
# macOS: brew install go
# Ubuntu: sudo apt install golang-go
`,
      ruby: `
# Install rbenv (Ruby Version Manager)
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
source ~/.bashrc

# Install ruby-build plugin
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

# Install Ruby:
rbenv install 3.2.0
rbenv global 3.2.0
`,
      php: `
# Install PHP
# macOS: brew install php
# Ubuntu: sudo apt install php
# Or visit https://www.php.net/manual/en/install.php
`,
    };

    return instructions[runtime] || 'Installation instructions not available';
  }
}

// Export singleton instance
export const runtimeInstaller = new RuntimeInstaller();
