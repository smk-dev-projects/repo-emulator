import path from 'path';
import { fileExists, readTextFile, parseEnvFile } from '../utils/file-utils';
import { DetectorResult, BaseDetector } from './index';
import { Language } from '../types';
import { EnvVarConfig } from '../types';

/**
 * Environment variable detector
 * Detects .env files and templates
 */
export class EnvDetector extends BaseDetector {
  name = 'EnvDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'other'; // Env detection is language-agnostic
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const envFiles = ['.env.example', '.env.template', '.env.sample', '.env.dist'];
    let foundFile: string | undefined;
    let variables: Record<string, string | undefined> = {};
    const required: string[] = [];
    const optional: string[] = [];

    // Look for env example files
    for (const envFile of envFiles) {
      const envPath = path.join(projectPath, envFile);
      if (await fileExists(envPath)) {
        foundFile = envFile;
        try {
          const content = await readTextFile(envPath);
          if (content) {
            variables = parseEnvFile(content);

            // Categorize variables
            for (const [key, value] of Object.entries(variables)) {
              // Consider variables without default values as required
              if (!value || value === '') {
                required.push(key);
              } else {
                optional.push(key);
              }
            }
          }
        } catch {
          // Continue on error
        }
        break;
      }
    }

    // Also check for actual .env file (but don't use it for templates)
    const actualEnvPath = path.join(projectPath, '.env');
    const hasActualEnv = await fileExists(actualEnvPath);

    if (!foundFile && !hasActualEnv) {
      return {};
    }

    const result: EnvVarConfig = {
      exampleFile: foundFile,
      templateFile: foundFile,
      variables,
      required,
      optional,
    };

    return {
      envVars: result,
      confidence: foundFile ? 0.8 : 0.5,
      warnings: hasActualEnv
        ? ['Project has a .env file - ensure it is not committed to version control']
        : [],
    };
  }
}
