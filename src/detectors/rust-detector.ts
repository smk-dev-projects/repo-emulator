import path from 'path';
import { readJsonFile, readTextFile, fileExists } from '../utils/file-utils';
import { DetectorResult, BaseDetector } from './index';
import { Language } from '../types';

interface CargoToml {
  package?: {
    name?: string;
    version?: string;
    edition?: string;
  };
  dependencies?: Record<string, string | { version?: string }>;
  'dev-dependencies'?: Record<string, string | { version?: string }>;
}

/**
 * Rust project detector
 * Detects: Cargo.toml, rust-toolchain, rust-toolchain.toml
 */
export class RustDetector extends BaseDetector {
  name = 'RustDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'rust';
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const cargoPath = path.join(projectPath, 'Cargo.toml');
    const cargo = await readJsonFile<CargoToml>(cargoPath);

    if (!cargo) {
      return {};
    }

    let version: string | undefined;
    let confidence = 0.5;
    const warnings: string[] = [];

    // Check for rust-toolchain or rust-toolchain.toml
    const rustToolchainPath = path.join(projectPath, 'rust-toolchain');
    const rustToolchainTomlPath = path.join(projectPath, 'rust-toolchain.toml');

    if (await fileExists(rustToolchainTomlPath)) {
      const content = await readTextFile(rustToolchainTomlPath);
      if (content) {
        const match = content.match(/channel\s*=\s*"([^"]+)"/);
        if (match) {
          version = match[1];
          confidence = 0.95;
        }
      }
    } else if (await fileExists(rustToolchainPath)) {
      const content = await readTextFile(rustToolchainPath);
      if (content) {
        version = content.trim();
        confidence = 0.95;
      }
    }

    const dependencies: string[] = [];
    if (cargo.dependencies) {
      dependencies.push(...Object.keys(cargo.dependencies));
    }

    const devDependencies: string[] = [];
    if (cargo['dev-dependencies']) {
      devDependencies.push(...Object.keys(cargo['dev-dependencies']));
    }

    const scripts: Record<string, string> = {
      install: 'cargo build --release',
      run: 'cargo run',
      test: 'cargo test',
      build: 'cargo build',
    };

    if (!version) {
      warnings.push('No Rust toolchain version specified (rust-toolchain)');
    }

    return {
      language: {
        language: 'rust',
        version,
        packageManager: 'cargo',
        dependencies,
        devDependencies,
      },
      scripts,
      confidence,
      warnings,
    };
  }
}
