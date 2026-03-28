import path from 'path';
import fs from 'fs-extra';
import { MCPTool } from '../types';
import { findFiles, readTextFile } from '../utils/file-utils';

/**
 * Scan a project for potential MCP tools
 * Looks for functions, API endpoints, and CLI commands that could be exposed as tools
 */
export async function scanProjectForTools(projectPath: string): Promise<MCPTool[]> {
  const tools: MCPTool[] = [];

  // Scan for TypeScript/JavaScript files
  await scanTypeScriptFiles(projectPath, tools);

  // Scan for Python files
  await scanPythonFiles(projectPath, tools);

  // Scan for Rust files
  await scanRustFiles(projectPath, tools);

  // Scan for Go files
  await scanGoFiles(projectPath, tools);

  // Look for API routes
  await scanAPIRoutes(projectPath, tools);

  return tools;
}

/**
 * Scan TypeScript/JavaScript files for exported functions
 */
async function scanTypeScriptFiles(projectPath: string, tools: MCPTool[]): Promise<void> {
  const patterns = ['*.ts', '*.js', '*.tsx', '*.jsx'];
  const tsFiles = await findFiles(projectPath, patterns);

  for (const file of tsFiles.slice(0, 50)) { // Limit to first 50 files
    try {
      const content = await readTextFile(file);
      if (!content) continue;

      // Look for exported functions
      const functionMatches = content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g);

      for (const match of functionMatches) {
        const [, funcName, params] = match;

        // Skip private/internal functions
        if (funcName.startsWith('_') || funcName.startsWith('internal')) {
          continue;
        }

        // Only include functions that look like tools/actions
        if (isToolLikeName(funcName)) {
          tools.push({
            name: funcName,
            description: `Execute ${funcName} function`,
            inputSchema: parseParamsToSchema(params),
            filePath: path.relative(projectPath, file),
            functionName: funcName,
          });
        }
      }

      // Look for class methods that might be tools
      const methodMatches = content.matchAll(/public\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)/g);

      for (const match of methodMatches) {
        const [, methodName, params] = match;

        if (isToolLikeName(methodName)) {
          tools.push({
            name: methodName,
            description: `Execute ${methodName} method`,
            inputSchema: parseParamsToSchema(params),
            filePath: path.relative(projectPath, file),
            functionName: methodName,
          });
        }
      }
    } catch {
      // Continue on error
    }
  }
}

/**
 * Scan Python files for decorated functions or public methods
 */
async function scanPythonFiles(projectPath: string, tools: MCPTool[]): Promise<void> {
  const pyFiles = await findFiles(projectPath, ['*.py']);

  for (const file of pyFiles.slice(0, 50)) {
    try {
      const content = await readTextFile(file);
      if (!content) continue;

      // Look for @tool, @api, @route decorators
      const decoratorMatches = content.matchAll(/@(?:tool|api|route|endpoint)\s*\n(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/g);

      for (const match of decoratorMatches) {
        const [, funcName, params] = match;

        tools.push({
          name: funcName,
          description: `Execute ${funcName} endpoint`,
          inputSchema: parsePythonParamsToSchema(params),
          filePath: path.relative(projectPath, file),
          functionName: funcName,
        });
      }

      // Look for FastAPI-style routes
      const fastapiMatches = content.matchAll(/@(?:app|router)\.(?:get|post|put|delete)\s*\(["']([^"']+)["']/g);

      for (const match of fastapiMatches) {
        const [, routePath] = match;
        const funcName = routePath.replace(/[^a-zA-Z]/g, '_');

        tools.push({
          name: `http_${funcName}`,
          description: `HTTP endpoint: ${routePath}`,
          inputSchema: { type: 'object', properties: {} },
          filePath: path.relative(projectPath, file),
        });
      }
    } catch {
      // Continue on error
    }
  }
}

/**
 * Scan Rust files for public functions
 */
async function scanRustFiles(projectPath: string, tools: MCPTool[]): Promise<void> {
  const rustFiles = await findFiles(projectPath, ['*.rs']);

  for (const file of rustFiles.slice(0, 50)) {
    try {
      const content = await readTextFile(file);
      if (!content) continue;

      // Look for pub fn functions
      const fnMatches = content.matchAll(/pub\s+(?:async\s+)?fn\s+(\w+)\s*\(([^)]*)\)/g);

      for (const match of fnMatches) {
        const [, funcName, params] = match;

        if (isToolLikeName(funcName)) {
          tools.push({
            name: funcName,
            description: `Execute ${funcName} function`,
            inputSchema: parseRustParamsToSchema(params),
            filePath: path.relative(projectPath, file),
            functionName: funcName,
          });
        }
      }
    } catch {
      // Continue on error
    }
  }
}

/**
 * Scan Go files for exported functions
 */
async function scanGoFiles(projectPath: string, tools: MCPTool[]): Promise<void> {
  const goFiles = await findFiles(projectPath, ['*.go']);

  for (const file of goFiles.slice(0, 50)) {
    try {
      const content = await readTextFile(file);
      if (!content) continue;

      // Look for exported functions (start with capital letter)
      const fnMatches = content.matchAll(/func\s+([A-Z]\w*)\s*\(([^)]*)\)/g);

      for (const match of fnMatches) {
        const [, funcName, params] = match;

        if (isToolLikeName(funcName)) {
          tools.push({
            name: funcName,
            description: `Execute ${funcName} function`,
            inputSchema: parseGoParamsToSchema(params),
            filePath: path.relative(projectPath, file),
            functionName: funcName,
          });
        }
      }
    } catch {
      // Continue on error
    }
  }
}

/**
 * Scan for API route definitions
 */
async function scanAPIRoutes(projectPath: string, tools: MCPTool[]): Promise<void> {
  // Look for common API route file patterns
  const routePatterns = [
    '**/routes/*.ts',
    '**/api/**/*.ts',
    '**/controllers/*.ts',
    '**/handlers/*.ts',
  ];

  for (const pattern of routePatterns) {
    const files = await findFiles(projectPath, [pattern.split('/').pop() || '']);

    for (const file of files.slice(0, 20)) {
      try {
        const content = await readTextFile(file);
        if (!content) continue;

        // Look for route definitions
        const routeMatches = content.matchAll(/(?:GET|POST|PUT|DELETE|PATCH)\s*['"]([^'"]+)['"]/g);

        for (const match of routeMatches) {
          const [, routePath] = match;
          const toolName = `api_${routePath.replace(/[^a-zA-Z0-9]/g, '_')}`;

          tools.push({
            name: toolName,
            description: `API endpoint: ${routePath}`,
            inputSchema: { type: 'object', properties: {} },
            filePath: path.relative(projectPath, file),
          });
        }
      } catch {
        // Continue on error
      }
    }
  }
}

/**
 * Check if a function name looks like a tool/action
 */
function isToolLikeName(name: string): boolean {
  const toolKeywords = [
    'create', 'update', 'delete', 'get', 'fetch', 'load', 'save',
    'process', 'transform', 'convert', 'generate', 'build', 'compile',
    'send', 'receive', 'publish', 'subscribe', 'notify', 'trigger',
    'validate', 'parse', 'format', 'calculate', 'compute', 'analyze',
    'search', 'find', 'query', 'filter', 'sort', 'list',
    'upload', 'download', 'export', 'import', 'sync', 'backup',
    'start', 'stop', 'restart', 'deploy', 'run', 'execute',
  ];

  return toolKeywords.some((keyword) =>
    name.toLowerCase().includes(keyword)
  );
}

/**
 * Parse TypeScript/JavaScript parameters to JSON schema
 */
function parseParamsToSchema(params: string): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {},
  };

  if (!params.trim()) {
    return schema;
  }

  const paramList = params.split(',').map((p) => p.trim());

  for (const param of paramList) {
    const match = param.match(/(\w+)(?::\s*(\w+))?/);
    if (match) {
      const [, name, type] = match;
      (schema.properties as Record<string, unknown>)[name] = {
        type: mapTypeToJsonSchema(type || 'any'),
      };
    }
  }

  return schema;
}

/**
 * Parse Python parameters to JSON schema
 */
function parsePythonParamsToSchema(params: string): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {},
  };

  if (!params.trim()) {
    return schema;
  }

  const paramList = params.split(',').map((p) => p.trim());

  for (const param of paramList) {
    const match = param.match(/(\w+)(?::\s*(\w+))?/);
    if (match) {
      const [, name, type] = match;
      (schema.properties as Record<string, unknown>)[name] = {
        type: mapTypeToJsonSchema(type || 'any'),
      };
    }
  }

  return schema;
}

/**
 * Parse Rust parameters to JSON schema
 */
function parseRustParamsToSchema(params: string): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {},
  };

  if (!params.trim()) {
    return schema;
  }

  const paramList = params.split(',').map((p) => p.trim());

  for (const param of paramList) {
    const match = param.match(/(\w+):\s*(\w+)/);
    if (match) {
      const [, name, type] = match;
      (schema.properties as Record<string, unknown>)[name] = {
        type: mapTypeToJsonSchema(type),
      };
    }
  }

  return schema;
}

/**
 * Parse Go parameters to JSON schema
 */
function parseGoParamsToSchema(params: string): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {},
  };

  if (!params.trim()) {
    return schema;
  }

  const paramList = params.split(',').map((p) => p.trim());

  for (const param of paramList) {
    const match = param.match(/(\w+)\s+(\w+)/);
    if (match) {
      const [, name, type] = match;
      (schema.properties as Record<string, unknown>)[name] = {
        type: mapTypeToJsonSchema(type),
      };
    }
  }

  return schema;
}

/**
 * Map programming language types to JSON Schema types
 */
function mapTypeToJsonSchema(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    str: 'string',
    number: 'number',
    int: 'number',
    integer: 'number',
    float: 'number',
    bool: 'boolean',
    boolean: 'boolean',
    array: 'array',
    list: 'array',
    vec: 'array',
    object: 'object',
    dict: 'object',
    map: 'object',
    any: 'string',
    interface: 'object',
    struct: 'object',
  };

  return typeMap[type.toLowerCase()] || 'string';
}

// Export scanner as a class for consistency
export class MCPServerGenerator {
  async scan(projectPath: string): Promise<MCPTool[]> {
    return scanProjectForTools(projectPath);
  }
}
