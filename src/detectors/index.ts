/**
 * Detector index - exports all language/framework detectors
 */

export { NodeDetector } from './node-detector';
export { PythonDetector } from './python-detector';
export { RustDetector } from './rust-detector';
export { GoDetector } from './go-detector';
export { RubyDetector } from './ruby-detector';
export { PHPDetector } from './php-detector';
export { DockerDetector } from './docker-detector';
export { DatabaseDetector } from './database-detector';
export { EnvDetector } from './env-detector';

import { NodeDetector } from './node-detector';
import { PythonDetector } from './python-detector';
import { RustDetector } from './rust-detector';
import { GoDetector } from './go-detector';
import { RubyDetector } from './ruby-detector';
import { PHPDetector } from './php-detector';
import { DockerDetector } from './docker-detector';
import { DatabaseDetector } from './database-detector';
import { EnvDetector } from './env-detector';
import { DetectedConfig, RuntimeConfig, Language } from '../types';
import path from 'path';

/**
 * Main detector class that orchestrates all individual detectors
 */
export class ProjectDetector {
  private detectors = [
    new NodeDetector(),
    new PythonDetector(),
    new RustDetector(),
    new GoDetector(),
    new RubyDetector(),
    new PHPDetector(),
    new DockerDetector(),
    new DatabaseDetector(),
    new EnvDetector(),
  ];

  /**
   * Detect project configuration from a directory
   */
  async detect(projectPath: string): Promise<DetectedConfig> {
    const projectName = path.basename(projectPath);
    const languages: RuntimeConfig[] = [];
    const databases = [];
    let docker;
    let envVars;
    const scripts: DetectedConfig['scripts'] = {};
    const warnings: string[] = [];
    let totalConfidence = 0;
    let detectionCount = 0;

    // Run each detector
    for (const detector of this.detectors) {
      try {
        const result = await detector.detect(projectPath);

        if (result.language) {
          languages.push(result.language);
          totalConfidence += result.confidence || 0.5;
          detectionCount++;

          // Collect scripts from package.json, pyproject.toml, etc.
          if (result.scripts) {
            Object.assign(scripts, result.scripts);
          }
        }

        if (result.databases) {
          databases.push(...result.databases);
        }

        if (result.docker) {
          docker = result.docker;
        }

        if (result.envVars) {
          envVars = result.envVars;
        }

        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } catch (error) {
        warnings.push(`Detector ${detector.name} failed: ${error}`);
      }
    }

    // Normalize confidence to 0-1 range
    const confidence = detectionCount > 0 ? totalConfidence / detectionCount : 0;

    return {
      projectPath,
      projectName,
      languages,
      databases,
      docker,
      envVars,
      scripts,
      confidence,
      warnings,
    };
  }

  /**
   * Quick check if a specific language is present
   */
  async hasLanguage(projectPath: string, language: Language): Promise<boolean> {
    const detector = this.detectors.find((d) => d.supportsLanguage(language));
    if (!detector) return false;

    const result = await detector.detect(projectPath);
    return !!result.language;
  }

  /**
   * Get primary language of the project
   */
  async getPrimaryLanguage(projectPath: string): Promise<Language | null> {
    const config = await this.detect(projectPath);
    return config.languages[0]?.language || null;
  }
}

// Export singleton instance
export const projectDetector = new ProjectDetector();
