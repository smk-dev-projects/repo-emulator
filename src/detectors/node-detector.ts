import path from 'path';
import { readJsonFile, fileExists } from '../utils/file-utils';
import { RuntimeConfig, DatabaseConfig, DockerConfig, EnvVarConfig, Language } from '../types';

interface PackageJson {
  name?: string;
  version?: string;
  engines?: { node?: string };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface Nvmrc {
  version: string;
}

/**
 * Detector result interface
 */
export interface DetectorResult {
  language?: RuntimeConfig;
  databases?: DatabaseConfig[];
  docker?: DockerConfig;
  envVars?: EnvVarConfig;
  scripts?: Record<string, string>;
  confidence?: number;
  warnings?: string[];
}

/**
 * Base detector interface
 */
export abstract class BaseDetector {
  abstract name: string;
  abstract supportsLanguage(lang: Language): boolean;
  abstract detect(projectPath: string): Promise<DetectorResult>;
}

/**
 * Node.js project detector
 * Detects: package.json, .nvmrc, yarn.lock, pnpm-lock.yaml, npm-shrinkwrap.json
 */
export class NodeDetector extends BaseDetector {
  name = 'NodeDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'nodejs';
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = await readJsonFile<PackageJson>(packageJsonPath);

    if (!packageJson) {
      return {};
    }

    let version: string | undefined;
    let packageManager = 'npm';
    let confidence = 0.5;

    // Check for .nvmrc
    const nvmrcPath = path.join(projectPath, '.nvmrc');
    if (await fileExists(nvmrcPath)) {
      const fs = await import('fs-extra');
      const content = await fs.readFile(nvmrcPath, 'utf-8');
      version = content.trim().replace(/^v/, '');
      confidence = 0.9;
    }

    // Check engines.node in package.json
    if (!version && packageJson.engines?.node) {
      version = packageJson.engines.node.replace(/[^0-9.]/g, '');
      confidence = Math.max(confidence, 0.7);
    }

    // Detect package manager
    if (await fileExists(path.join(projectPath, 'yarn.lock'))) {
      packageManager = 'yarn';
      confidence = Math.max(confidence, 0.8);
    } else if (await fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
      confidence = Math.max(confidence, 0.8);
    } else if (await fileExists(path.join(projectPath, 'package-lock.json'))) {
      packageManager = 'npm';
      confidence = Math.max(confidence, 0.8);
    }

    const dependencies = packageJson.dependencies
      ? Object.keys(packageJson.dependencies)
      : [];
    const devDependencies = packageJson.devDependencies
      ? Object.keys(packageJson.devDependencies)
      : [];

    const result: DetectorResult = {
      language: {
        language: 'nodejs',
        version,
        packageManager,
        dependencies,
        devDependencies,
      },
      scripts: packageJson.scripts,
      confidence,
      warnings: [],
    };

    // Warn if no Node version specified
    if (!version) {
      result.warnings?.push('No Node.js version specified (.nvmrc or engines.node)');
    }

    return result;
  }
}
