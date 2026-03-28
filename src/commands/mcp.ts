import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { generateMCPConfig, saveMCPConfig, updateClaudeDesktopConfig } from '../mcp-generator';
import { generateMCPServerTemplate, generatePythonMCPServerTemplate } from '../mcp-generator/config-builder';

/**
 * MCP command - generates MCP server configuration from a codebase
 */
export function createMCPCommand(program: Command): void {
  program
    .command('mcp [path]')
    .description('Generate MCP server configuration from a codebase')
    .option('-o, --output <file>', 'Output file for the config')
    .option('--template', 'Generate MCP server template code')
    .option('--lang <language>', 'Language for template (ts|py)', 'ts')
    .option('--add-to-claude', 'Add to Claude Desktop config automatically')
    .action(async (path: string | undefined, options: { output?: string; template?: boolean; lang?: 'ts' | 'py'; addToClaude?: boolean }) => {
      try {
        await handleMCP(path || process.cwd(), options);
      } catch (error) {
        logger.error(`MCP generation failed: ${error}`);
        process.exit(1);
      }
    });
}

async function handleMCP(
  projectPath: string,
  options: { output?: string; template?: boolean; lang?: 'ts' | 'py'; addToClaude?: boolean }
): Promise<void> {
  logger.step(`Generating MCP configuration for: ${projectPath}`);

  // Generate MCP config
  const mcpConfig = await generateMCPConfig(projectPath);

  if (!mcpConfig || mcpConfig.tools.length === 0) {
    logger.warn('No MCP tools found in project');
    logger.info('The project may not have any exportable functions or API endpoints');
    return;
  }

  logger.success(`Generated ${mcpConfig.tools.length} MCP tools`);

  // Display tools
  logger.step('Discovered Tools');
  for (const tool of mcpConfig.tools.slice(0, 10)) {
    logger.item(`${tool.name}: ${tool.description}`);
    if (tool.filePath) {
      logger.kv('Location', tool.filePath);
    }
  }

  if (mcpConfig.tools.length > 10) {
    logger.info(`... and ${mcpConfig.tools.length - 10} more tools`);
  }

  // Save configuration
  const outputPath = options.output || path.join(projectPath, 'mcp-config.json');
  await saveMCPConfig(mcpConfig, outputPath);

  // Generate template if requested
  if (options.template) {
    await generateServerTemplate(projectPath, mcpConfig.serverName, mcpConfig.tools, options.lang || 'ts');
  }

  // Add to Claude Desktop if requested
  if (options.addToClaude) {
    const added = await updateClaudeDesktopConfig(mcpConfig, true);
    if (added) {
      logger.success('Added to Claude Desktop configuration');
      logger.info('Restart Claude Desktop to use the new MCP server');
    }
  } else {
    logger.info('To add to Claude Desktop, run with --add-to-claude flag');
  }

  logger.divider();
  logger.success('MCP configuration complete!');
}

async function generateServerTemplate(
  projectPath: string,
  serverName: string,
  tools: ReturnType<typeof generateMCPConfig> extends Promise<infer T> ? T extends null ? never : T['tools'] : never,
  language: 'ts' | 'py'
): Promise<void> {
  const templateDir = path.join(projectPath, 'mcp-server');
  await fs.ensureDir(templateDir);

  let templateContent: string;
  let fileName: string;

  if (language === 'py') {
    templateContent = generatePythonMCPServerTemplate(serverName, tools as any);
    fileName = 'mcp_server.py';
  } else {
    templateContent = generateMCPServerTemplate(serverName, tools as any);
    fileName = 'mcp_server.ts';
  }

  const templatePath = path.join(templateDir, fileName);
  await fs.writeFile(templatePath, templateContent);

  logger.success(`MCP server template created at ${templatePath}`);

  // Create package.json for TypeScript
  if (language === 'ts') {
    const packageJson = {
      name: `${serverName}-mcp`,
      version: '1.0.0',
      type: 'module',
      scripts: {
        build: 'tsc',
        start: 'node dist/mcp_server.js',
        dev: 'tsx mcp_server.ts',
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^0.5.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        tsx: '^4.0.0',
      },
    };

    await fs.writeJSON(path.join(templateDir, 'package.json'), packageJson, { spaces: 2 });
    logger.info('Created package.json with MCP SDK dependencies');
  }

  logger.info('Next steps:');
  logger.item(`cd ${templateDir}`);
  if (language === 'ts') {
    logger.item('npm install');
    logger.item('npm run dev');
  } else {
    logger.item('pip install mcp');
    logger.item('python mcp_server.py');
  }
}
