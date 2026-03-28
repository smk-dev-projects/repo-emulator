/**
 * Environment creators index
 */

export { NativeEnvCreator } from './native-creator';
export { DockerEnvCreator } from './docker-creator';
export { RuntimeInstaller } from './runtime-installer';

import { DetectedConfig } from '../types';
import { logger } from '../utils/logger';
import { DockerEnvCreator } from './docker-creator';
import { NativeEnvCreator } from './native-creator';

/**
 * Base interface for environment creators
 */
export interface EnvCreator {
  name: string;
  create(projectPath: string, config: DetectedConfig): Promise<boolean>;
  cleanup(projectPath: string): Promise<void>;
}

/**
 * Factory function to get the appropriate environment creator
 */
export function getEnvCreator(useDocker: boolean, config: DetectedConfig): EnvCreator {
  // If project has Docker and user wants Docker, use Docker creator
  if (useDocker && config.docker?.hasDockerCompose) {
    return new DockerEnvCreator();
  }

  // Otherwise use native creator
  return new NativeEnvCreator();
}
