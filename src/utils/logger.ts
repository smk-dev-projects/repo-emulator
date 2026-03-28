import chalk from 'chalk';

/**
 * Logger utility for consistent output formatting
 * Uses different levels with appropriate colors and icons
 */

export const logger = {
  /**
   * Log an info message (blue)
   */
  info(message: string): void {
    console.log(`${chalk.blue('ℹ')} ${message}`);
  },

  /**
   * Log a success message (green)
   */
  success(message: string): void {
    console.log(`${chalk.green('✓')} ${message}`);
  },

  /**
   * Log a warning message (yellow)
   */
  warn(message: string): void {
    console.log(`${chalk.yellow('⚠')} ${message}`);
  },

  /**
   * Log an error message (red)
   */
  error(message: string): void {
    console.log(`${chalk.red('✗')} ${message}`);
  },

  /**
   * Log a debug message (gray, only in verbose mode)
   */
  debug(message: string, verbose = false): void {
    if (verbose) {
      console.log(`${chalk.gray('DEBUG')} ${message}`);
    }
  },

  /**
   * Log a step/section header (cyan, bold)
   */
  step(message: string): void {
    console.log(`\n${chalk.cyan.bold('➤')} ${chalk.bold(message)}`);
  },

  /**
   * Log a list item
   */
  item(message: string, indent = 2): void {
    console.log(`${' '.repeat(indent)}${chalk.gray('•')} ${message}`);
  },

  /**
   * Log a key-value pair
   */
  kv(key: string, value: string, indent = 2): void {
    console.log(`${' '.repeat(indent)}${chalk.gray(key)}: ${chalk.white(value)}`);
  },

  /**
   * Create a visual divider
   */
  divider(char = '─', length = 60): void {
    console.log(chalk.gray(char.repeat(length)));
  },

  /**
   * Format text with background color for emphasis
   */
  highlight(text: string, color: 'bgBlue' | 'bgGreen' | 'bgYellow' | 'bgRed' = 'bgBlue'): string {
    return chalk[color].black(` ${text} `);
  },

  /**
   * Format a command for display
   */
  command(cmd: string): string {
    return chalk.bgBlack.white(` $ ${cmd} `);
  },

  /**
   * Format a file path
   */
  path(filePath: string): string {
    return chalk.dim(filePath);
  },

  /**
   * Format a URL
   */
  url(link: string): string {
    return chalk.blue.underline(link);
  },
};

export default logger;
