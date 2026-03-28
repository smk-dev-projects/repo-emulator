/**
 * Core type definitions for repo-emulator
 */

export type Language = 'nodejs' | 'python' | 'rust' | 'go' | 'ruby' | 'php' | 'other';

export interface RuntimeConfig {
  language: Language;
  version?: string;
  packageManager?: string;
  dependencies?: string[];
  devDependencies?: string[];
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
  port?: number;
  name?: string;
  host?: string;
}

export interface DockerConfig {
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  composeServices?: string[];
  dockerfilePath?: string;
}

export interface EnvVarConfig {
  exampleFile?: string;
  templateFile?: string;
  variables: Record<string, string | undefined>;
  required: string[];
  optional: string[];
}

export interface DetectedConfig {
  projectPath: string;
  projectName: string;
  languages: RuntimeConfig[];
  databases: DatabaseConfig[];
  docker?: DockerConfig;
  envVars?: EnvVarConfig;
  scripts: {
    install?: string;
    build?: string;
    start?: string;
    test?: string;
    migrate?: string;
  };
  confidence: number; // 0-1, how confident we are in this detection
  warnings: string[];
}

export interface CacheEntry {
  repoUrl: string;
  commitHash: string;
  config: DetectedConfig;
  cachedAt: Date;
  expiresAt: Date;
}

export interface CloneOptions {
  url: string;
  targetPath?: string;
  useDocker?: boolean;
  skipInstall?: boolean;
  cacheEnabled?: boolean;
  verbose?: boolean;
  output?: string;
  docker?: boolean;
  mcp?: boolean;
}

export interface RunOptions {
  path: string;
  command?: string;
  useDocker?: boolean;
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  filePath: string;
  functionName?: string;
}

export interface MCPConfig {
  serverName: string;
  tools: MCPTool[];
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface GlobalConfig {
  cacheDir: string;
  defaultUseDocker: boolean;
  autoConfirm: boolean;
  preferredPackageManager?: string;
  mcpAutoGenerate: boolean;
}

export interface HealthCheckResult {
  success: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message?: string;
  }>;
  errors: string[];
}
