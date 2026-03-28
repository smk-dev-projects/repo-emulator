import path from 'path';
import { fileExists, readTextFile, findFiles } from '../utils/file-utils';
import { DetectorResult, BaseDetector } from './index';
import { Language } from '../types';
import { DatabaseConfig } from '../types';

/**
 * Database configuration detector
 * Detects database configurations from various sources
 */
export class DatabaseDetector extends BaseDetector {
  name = 'DatabaseDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'other'; // Database detection is language-agnostic
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const databases: DatabaseConfig[] = [];

    // Check for database configuration files
    await this.detectPostgreSQL(projectPath, databases);
    await this.detectMySQL(projectPath, databases);
    await this.detectMongoDB(projectPath, databases);
    await this.detectRedis(projectPath, databases);
    await this.detectSQLite(projectPath, databases);

    // Check environment files for database URLs
    await this.detectFromEnv(projectPath, databases);

    if (databases.length === 0) {
      return {};
    }

    return {
      databases,
      confidence: databases.length > 0 ? 0.7 : 0,
      warnings: [],
    };
  }

  private async detectPostgreSQL(
    projectPath: string,
    databases: DatabaseConfig[]
  ): Promise<void> {
    // Check for postgres config in common locations
    const patterns = ['**/*.yml', '**/*.yaml', '**/*.json', '**/.env*'];

    for (const pattern of patterns) {
      const files = await findFiles(projectPath, [pattern.split('/').pop() || '']);
      for (const file of files) {
        try {
          const content = await readTextFile(file);
          if (content) {
            if (
              content.toLowerCase().includes('postgres') ||
              content.toLowerCase().includes('postgresql')
            ) {
              // Extract port if possible
              const portMatch = content.match(/5432/);
              databases.push({
                type: 'postgresql',
                port: portMatch ? 5432 : 5432,
                host: 'localhost',
              });
              return;
            }
          }
        } catch {
          // Continue on error
        }
      }
    }
  }

  private async detectMySQL(projectPath: string, databases: DatabaseConfig[]): Promise<void> {
    const patterns = ['**/*.yml', '**/*.yaml', '**/*.json', '**/.env*'];

    for (const pattern of patterns) {
      const files = await findFiles(projectPath, [pattern.split('/').pop() || '']);
      for (const file of files) {
        try {
          const content = await readTextFile(file);
          if (content) {
            if (content.toLowerCase().includes('mysql') || content.toLowerCase().includes('mariadb')) {
              const portMatch = content.match(/3306/);
              databases.push({
                type: 'mysql',
                port: portMatch ? 3306 : 3306,
                host: 'localhost',
              });
              return;
            }
          }
        } catch {
          // Continue on error
        }
      }
    }
  }

  private async detectMongoDB(projectPath: string, databases: DatabaseConfig[]): Promise<void> {
    const patterns = ['**/*.yml', '**/*.yaml', '**/*.json', '**/.env*'];

    for (const pattern of patterns) {
      const files = await findFiles(projectPath, [pattern.split('/').pop() || '']);
      for (const file of files) {
        try {
          const content = await readTextFile(file);
          if (content) {
            if (content.toLowerCase().includes('mongo') || content.includes('27017')) {
              databases.push({
                type: 'mongodb',
                port: 27017,
                host: 'localhost',
              });
              return;
            }
          }
        } catch {
          // Continue on error
        }
      }
    }
  }

  private async detectRedis(projectPath: string, databases: DatabaseConfig[]): Promise<void> {
    const patterns = ['**/*.yml', '**/*.yaml', '**/*.json', '**/.env*'];

    for (const pattern of patterns) {
      const files = await findFiles(projectPath, [pattern.split('/').pop() || '']);
      for (const file of files) {
        try {
          const content = await readTextFile(file);
          if (content) {
            if (content.toLowerCase().includes('redis') || content.includes('6379')) {
              databases.push({
                type: 'redis',
                port: 6379,
                host: 'localhost',
              });
              return;
            }
          }
        } catch {
          // Continue on error
        }
      }
    }
  }

  private async detectSQLite(projectPath: string, databases: DatabaseConfig[]): Promise<void> {
    // Look for .db or .sqlite files
    const dbFiles = await findFiles(projectPath, ['.db', '.sqlite', '.sqlite3']);

    if (dbFiles.length > 0) {
      databases.push({
        type: 'sqlite',
        name: path.basename(dbFiles[0]),
      });
    }
  }

  private async detectFromEnv(projectPath: string, databases: DatabaseConfig[]): Promise<void> {
    const envFiles = ['.env', '.env.example', '.env.template', '.env.local'];

    for (const envFile of envFiles) {
      const envPath = path.join(projectPath, envFile);
      if (await fileExists(envPath)) {
        try {
          const content = await readTextFile(envPath);
          if (content) {
            // Check for DATABASE_URL
            const dbUrlMatch = content.match(/DATABASE_URL=(.+)/);
            if (dbUrlMatch) {
              const url = dbUrlMatch[1].trim();
              if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
                databases.push({ type: 'postgresql', port: 5432, host: 'localhost' });
              } else if (url.startsWith('mysql://')) {
                databases.push({ type: 'mysql', port: 3306, host: 'localhost' });
              } else if (url.startsWith('mongodb://')) {
                databases.push({ type: 'mongodb', port: 27017, host: 'localhost' });
              } else if (url.startsWith('redis://')) {
                databases.push({ type: 'redis', port: 6379, host: 'localhost' });
              }
            }
          }
        } catch {
          // Continue on error
        }
      }
    }
  }
}
