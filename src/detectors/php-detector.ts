import path from 'path';
import { readJsonFile, fileExists } from '../utils/file-utils';
import { DetectorResult, BaseDetector } from './index';
import { Language } from '../types';

interface ComposerJson {
  name?: string;
  require?: Record<string, string>;
  'require-dev'?: Record<string, string>;
  scripts?: Record<string, string | string[]>;
}

/**
 * PHP project detector
 * Detects: composer.json, composer.lock
 */
export class PHPDetector extends BaseDetector {
  name = 'PHPDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'php';
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const composerPath = path.join(projectPath, 'composer.json');
    const composer = await readJsonFile<ComposerJson>(composerPath);

    if (!composer) {
      return {};
    }

    let version: string | undefined;
    const dependencies: string[] = [];
    const devDependencies: string[] = [];

    // Extract PHP version requirement
    if (composer.require?.php) {
      const phpVersion = composer.require.php.replace(/[^0-9.]/g, '');
      if (phpVersion) {
        version = phpVersion;
      }
    }

    // Extract dependencies
    if (composer.require) {
      for (const [pkg, ver] of Object.entries(composer.require)) {
        if (pkg !== 'php') {
          dependencies.push(pkg);
        }
      }
    }

    // Extract dev dependencies
    if (composer['require-dev']) {
      devDependencies.push(...Object.keys(composer['require-dev']));
    }

    // Check for composer.lock
    const hasComposerLock = await fileExists(path.join(projectPath, 'composer.lock'));

    const scripts: Record<string, string> = {
      install: 'composer install',
      run: 'php',
      test: 'vendor/bin/phpunit',
    };

    // Add custom scripts from composer.json
    if (composer.scripts) {
      for (const [name, cmd] of Object.entries(composer.scripts)) {
        if (typeof cmd === 'string' && !['post-install-cmd', 'post-update-cmd'].includes(name)) {
          scripts[name] = `composer run ${name}`;
        } else if (Array.isArray(cmd) && cmd.length > 0) {
          scripts[name] = `composer run ${name}`;
        }
      }
    }

    return {
      language: {
        language: 'php',
        version,
        packageManager: 'composer',
        dependencies,
        devDependencies,
      },
      scripts,
      confidence: hasComposerLock ? 0.9 : 0.7,
      warnings: [],
    };
  }
}
