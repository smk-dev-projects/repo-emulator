/**
 * MCP Generator - Creates MCP server configurations from codebases
 */

export { MCPServerGenerator } from './scanner';
export { MCPConfigBuilder } from './config-builder';

import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { scanProjectForTools } from './scanner';
import { buildMCPConfig } from './config-builder';
import { MCPConfig } from '../types';

/**
 * Generate an MCP server configuration from a project
 */
export async function generateMCPConfig(projectPath: string): Promise<MCPConfig | null> {
  logger.step('Scanning project for MCP tools');

  try {
    // Scan project for potential tools/functions
    const tools = await scanProjectForTools(projectPath);

    if (tools.length === 0) {
      logger.warn('No potential tools found in project');
      return null;
    }

    logger.success(`Found ${tools.length} potential tools`);

    // Build MCP configuration
    const config = await buildMCPConfig(projectPath, tools);

    logger.success('MCP configuration generated');

    return config;
  } catch (error) {
    logger.error(`Failed to generate MCP config: ${error}`);
    return null;
  }
}

/**
 * Save MCP configuration to file
 */
export async function saveMCPConfig(
  config: MCPConfig,
  outputPath?: string
): Promise<string> {
  const defaultPath = path.join(process.cwd(), 'mcp-config.json');
  const targetPath = outputPath || defaultPath;

  await fs.outputJSON(targetPath, config, { spaces: 2 });

  logger.success(`MCP config saved to ${targetPath}`);

  return targetPath;
}

/**
 * Update Claude Desktop configuration to include the MCP server
 */
export async function updateClaudeDesktopConfig(
  config: MCPConfig,
  enabled = true
): Promise<boolean> {
  const claudeConfigPath = path.join(
    process.env.HOME || '~',
    'Library',
    'Application Support',
    'Claude',
    'claude_desktop_config.json'
  );

  try {
    let desktopConfig = {};

    // Try to read existing config
    if (await fs.pathExists(claudeConfigPath)) {
      desktopConfig = await fs.readJSON(claudeConfigPath);
    }

    const mcpKey = `mcpServers.${config.serverName}`;

    if (enabled) {
      // Add or update the MCP server config
      const servers = (desktopConfig as Record<string, unknown>).mcpServers || {};
      servers[config.serverName] = {
        command: config.command,
        args: config.args,
        env: config.env,
      };
      (desktopConfig as Record<string, unknown>).mcpServers = servers;
    } else {
      // Remove the MCP server config
      const servers = (desktopConfig as Record<string, unknown>).mcpServers || {};
      delete servers[config.serverName];
    }

    await fs.outputJSON(claudeConfigPath, desktopConfig, { spaces: 2 });

    logger.success(
      enabled
        ? `Added ${config.serverName} to Claude Desktop config`
        : `Removed ${config.serverName} from Claude Desktop config`
    );

    return true;
  } catch (error) {
    logger.error(`Failed to update Claude Desktop config: ${error}`);
    return false;
  }
}
