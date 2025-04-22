import { Command } from 'commander';
import madge from 'madge';
import { type Context } from './types.js';

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
};