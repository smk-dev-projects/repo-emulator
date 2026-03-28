import path from 'path';
import { readTextFile, fileExists } from '../utils/file-utils';
import { DetectorResult, BaseDetector, Language } from './index';

/**
 * Ruby project detector
 * Detects: Gemfile, Gemfile.lock, .ruby-version, .ruby-gemset
 */
export class RubyDetector extends BaseDetector {
  name = 'RubyDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'ruby';
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const gemfilePath = path.join(projectPath, 'Gemfile');
    const content = await import('fs-extra').then((fs) => fs.readFile(gemfilePath, 'utf-8').catch(() => null));

    if (!content) {
      return {};
    }

    let version: string | undefined;
    let confidence = 0.5;
    const dependencies: string[] = [];

    // Check for .ruby-version
    const rubyVersionPath = path.join(projectPath, '.ruby-version');
    if (await fileExists(rubyVersionPath)) {
      const versionContent = await import('fs-extra').then((fs) =>
        fs.readFile(rubyVersionPath, 'utf-8').catch(() => null)
      );
      if (versionContent) {
        version = versionContent.trim();
        confidence = 0.9;
      }
    }

    // Parse Gemfile for gems
    const gemMatches = content.match(/^gem\s+['"]([^'"]+)['"]/gm);
    if (gemMatches) {
      for (const match of gemMatches) {
        const gemName = match.match(/['"]([^'"]+)['"]/)?.[1];
        if (gemName) {
          dependencies.push(gemName);
        }
      }
    }

    // Check for Gemfile.lock
    const hasGemfileLock = await fileExists(path.join(projectPath, 'Gemfile.lock'));
    if (hasGemfileLock) {
      confidence = Math.max(confidence, 0.8);
    }

    const scripts: Record<string, string> = {
      install: 'bundle install',
      run: 'bundle exec ruby',
      test: 'bundle exec rspec',
    };

    return {
      language: {
        language: 'ruby',
        version,
        packageManager: 'bundler',
        dependencies,
      },
      scripts,
      confidence,
      warnings: !version ? ['No Ruby version specified (.ruby-version)'] : [],
    };
  }
}
