import path from 'path';
import { readJsonFile, readTextFile, fileExists } from '../utils/file-utils';
import { DetectorResult, BaseDetector } from './index';
import { Language } from '../types';

interface PyprojectToml {
  project?: {
    name?: string;
    version?: string;
    requiresPython?: string;
    dependencies?: string[];
  };
  tool?: {
    poetry?: {
      name?: string;
      version?: string;
      dependencies?: Record<string, string>;
      'dev-dependencies'?: Record<string, string>;
      scripts?: Record<string, string>;
    };
  };
}

/**
 * Python project detector
 * Detects: requirements.txt, Pipfile, pyproject.toml, .python-version, setup.py
 */
export class PythonDetector extends BaseDetector {
  name = 'PythonDetector';

  supportsLanguage(lang: Language): boolean {
    return lang === 'python';
  }

  async detect(projectPath: string): Promise<DetectorResult> {
    let version: string | undefined;
    let packageManager = 'pip';
    let confidence = 0.3;
    const dependencies: string[] = [];
    const scripts: Record<string, string> = {};
    const warnings: string[] = [];

    // Check for .python-version (pyenv)
    const pythonVersionPath = path.join(projectPath, '.python-version');
    if (await fileExists(pythonVersionPath)) {
      const content = await readTextFile(pythonVersionPath);
      if (content) {
        version = content.trim();
        confidence = 0.9;
      }
    }

    // Check for pyproject.toml
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    const pyproject = await readJsonFile<PyprojectToml>(pyprojectPath);

    if (pyproject) {
      packageManager = 'poetry';
      confidence = Math.max(confidence, 0.8);

      if (pyproject.project?.requiresPython && !version) {
        version = pyproject.project.requiresPython.replace(/[^0-9.]/g, '');
      }

      if (pyproject.project?.dependencies) {
        dependencies.push(...pyproject.project.dependencies);
      }

      if (pyproject.tool?.poetry?.dependencies) {
        dependencies.push(...Object.keys(pyproject.tool.poetry.dependencies));
      }

      // Check for scripts in pyproject.toml
      if (pyproject.tool?.poetry?.scripts) {
        Object.assign(scripts, pyproject.tool.poetry.scripts);
      }
    }

    // Check for Pipfile
    const pipfilePath = path.join(projectPath, 'Pipfile');
    if (await fileExists(pipfilePath)) {
      packageManager = 'pipenv';
      confidence = Math.max(confidence, 0.7);
    }

    // Check for requirements.txt
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (await fileExists(requirementsPath)) {
      const content = await readTextFile(requirementsPath);
      if (content) {
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            // Extract package name (before ==, >=, etc.)
            const match = trimmed.match(/^([a-zA-Z0-9_-]+)/);
            if (match) {
              dependencies.push(match[1]);
            }
          }
        }
        confidence = Math.max(confidence, 0.6);
      }
      packageManager = 'pip';
    }

    // Check for setup.py
    const setupPath = path.join(projectPath, 'setup.py');
    if (await fileExists(setupPath)) {
      confidence = Math.max(confidence, 0.5);
      scripts['install'] = 'python setup.py install';
    }

    // Determine common scripts
    if (packageManager === 'poetry') {
      scripts['install'] = 'poetry install';
      scripts['run'] = 'poetry run python';
      scripts['test'] = 'poetry run pytest';
    } else if (packageManager === 'pipenv') {
      scripts['install'] = 'pipenv install';
      scripts['run'] = 'pipenv run python';
      scripts['test'] = 'pipenv run pytest';
    } else {
      scripts['install'] = 'pip install -r requirements.txt';
      scripts['run'] = 'python';
      scripts['test'] = 'pytest';
    }

    // Warn if no Python version specified
    if (!version) {
      warnings.push('No Python version specified (.python-version or pyproject.toml)');
    }

    return {
      language: {
        language: 'python',
        version,
        packageManager,
        dependencies,
      },
      scripts,
      confidence,
      warnings,
    };
  }
}
