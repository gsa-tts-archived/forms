import { Command } from 'commander';
import { exec } from 'child_process';
import { writeFile } from 'fs/promises';
import madge from 'madge';
import { type Context } from './types.js';
import { promisify } from 'util';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

export const addCodeQualityCommands = (ctx: Context, cli: Command) => {
  const cmd = cli
    .command('code-quality')
    .alias('cq')
    .description('Code quality commands');

  cmd
    .command('deps')
    .description('Generate dependency tree with madge')
    .option('--circular', 'Highlight circular dependencies', false)
    .option('--image <file>', 'Output graph as an image with the given file name')
    .option('--entry <file>', 'The entry file or path of the tree (default: ./index.ts)', './index.ts')
    .action(async (options) => {
      try {
        const { circular, image, entry } = options;

        const config = {
          baseDir: process.cwd(),
        };

        const result = await madge(entry, config);

        if (circular) {
          const circularDeps = result.circular();
          if (circularDeps.length) {
            console.log('Circular dependencies found.', circularDeps);
          } else {
            console.log('No circular dependencies found.');
          }
        }

        if (image) {
          await result.image(image, circular);
          console.log(`Dependency graph saved to: ${image}`);
        }
      } catch (err) {
        console.error('Error generating dependency tree:', err);
        process.exit(1);
      }
    });

  cmd
    .command('orphans')
    .description('Find files that no other file is depending on')
    .option('--entry <file>', 'The entry file or path of the tree (default: ./index.ts)', './index.ts')
    .action(async (options) => {
      try {
        const { entry } = options;

        const config = {
          baseDir: process.cwd(),
        };

        const result = await madge(entry, config);
        const orphans = result.orphans();

        if(orphans.length) {
          console.log(`Orphans found: `, orphans);
        } else {
          console.log('No orphans found.');
        }
      } catch (err) {
        console.error('Error generating dependency tree:', err);
        process.exit(1);
      }
    });

  cmd
    .command('log')
    .description('Generate git log for the last 6 months and save to a file')
    .option('--output <file>', 'Output file path', 'git-logfile.log')
    .option('--timeframe <period>', 'Timeframe', '6 months ago')
    .action(async (options) => {
      const { output, timeframe } = options;
      const gitCommand = `git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN' --no-renames --after="${timeframe}"`;

      console.log(`Executing: ${gitCommand}`);
      console.log(`Saving output to: ${output}`);

      try {
        const { stdout, stderr } = await execAsync(gitCommand);

        if (stderr) {
          console.error(`Git command error: ${stderr}`);
        }

        await writeFile(output, stdout);

        console.log(`Git log successfully saved to ${output}`);
      } catch (err: any) {
        console.error(`Error executing git command or writing file: ${err.message}`);
        process.exit(1);
      }
    });
};