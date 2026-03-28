import path from 'path';
import { fileExists, readTextFile } from '../utils/file-utils';
import { DetectorResult, BaseDetector, Language } from './index';
import YAML from 'yaml';

/**
 * Docker project detector
 * Detects: Dockerfile, docker-compose.yml, docker-compose.yaml
 */
export class DockerDetector extends BaseDetector {
  name = 'DockerDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'other'; // Docker is language-agnostic
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    const dockerfilePath = path.join(projectPath, 'Dockerfile');
    const dockerComposeYmlPath = path.join(projectPath, 'docker-compose.yml');
    const dockerComposeYamlPath = path.join(projectPath, 'docker-compose.yaml');

    const hasDockerfile = await fileExists(dockerfilePath);
    const hasDockerCompose =
      (await fileExists(dockerComposeYmlPath)) || (await fileExists(dockerComposeYamlPath));

    if (!hasDockerfile && !hasDockerCompose) {
      return {};
    }

    let composeServices: string[] | undefined;
    let dockerfilePathResult: string | undefined;

    if (hasDockerfile) {
      dockerfilePathResult = 'Dockerfile';
    }

    // Parse docker-compose to get services
    const composePath = hasDockerCompose
      ? await fileExists(dockerComposeYmlPath)
        ? dockerComposeYmlPath
        : dockerComposeYamlPath
      : null;

    if (composePath) {
      try {
        const content = await readTextFile(composePath);
        if (content) {
          const parsed = YAML.parse(content);
          if (parsed?.services) {
            composeServices = Object.keys(parsed.services);
          }
        }
      } catch {
        // Failed to parse docker-compose, continue without services
      }
    }

    const scripts: Record<string, string> = {};

    if (hasDockerCompose) {
      scripts['up'] = 'docker-compose up -d';
      scripts['down'] = 'docker-compose down';
      scripts['build'] = 'docker-compose build';
      scripts['logs'] = 'docker-compose logs -f';
    } else if (hasDockerfile) {
      scripts['build'] = 'docker build -t app .';
      scripts['run'] = 'docker run --rm -it app';
    }

    return {
      docker: {
        hasDockerfile,
        hasDockerCompose,
        composeServices,
        dockerfilePath: dockerfilePathResult,
      },
      scripts,
      confidence: hasDockerCompose ? 0.9 : 0.7,
      warnings: [],
    };
  }
}
