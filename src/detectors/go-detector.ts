import path from 'path';
import { readJsonFile, fileExists } from '../utils/file-utils';
import { DetectorResult, BaseDetector, Language } from './index';

interface GoMod {
  module: string;
  go: string;
  require?: Array<[string, string]>;
}

/**
 * Go project detector
 * Detects: go.mod, go.sum
 */
export class GoDetector extends BaseDetector {
  name = 'GoDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'go';
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const goModPath = path.join(projectPath, 'go.mod');
    const content = await import('fs-extra').then((fs) => fs.readFile(goModPath, 'utf-8').catch(() => null));

    if (!content) {
      return {};
    }

    let version: string | undefined;
    const dependencies: string[] = [];

    // Parse go.mod
    const goVersionMatch = content.match(/^go\s+(\d+\.\d+)/m);
    if (goVersionMatch) {
      version = goVersionMatch[1];
    }

    // Extract dependencies
    const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireBlock) {
      const lines = requireBlock[1].split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('//')) {
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            dependencies.push(parts[0]);
          }
        }
      }
    }

    // Check for go.sum
    const hasGoSum = await fileExists(path.join(projectPath, 'go.sum'));

    const scripts: Record<string, string> = {
      install: 'go mod download',
      run: 'go run .',
      test: 'go test ./...',
      build: 'go build -o bin/',
    };

    return {
      language: {
        language: 'go',
        version,
        packageManager: 'go',
        dependencies,
      },
      scripts,
      confidence: hasGoSum ? 0.9 : 0.7,
      warnings: [],
    };
  }
}
