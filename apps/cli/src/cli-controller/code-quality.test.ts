// code-quality.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addCodeQualityCommands } from './code-quality';
import { Command } from 'commander';

describe('addCodeQualityCommands', () => {
  let ctx: any;
  let cli: Command;

  beforeEach(() => {
    ctx = {
      console: {
        log: vi.fn(),
        error: vi.fn(),
      },
      workspaceRoot: '/mock/path',
    };
    cli = new Command();

    vi.mock('madge', () => ({
       __esModule: true,
       default: vi.fn(async () => ({
         circular: vi.fn(() => []),
         image: vi.fn(),
         orphans: vi.fn(() => []),
       })),
     }));

  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add "code-quality" command with the correct description', () => {
    addCodeQualityCommands(ctx, cli);
    const command = cli.commands.find((cmd) => cmd.name() === 'code-quality');
    expect(command).toBeDefined();
    expect(command?.description()).toBe('Code quality commands');
  });

  it('should add "deps" subcommand with correct options and description', () => {
    addCodeQualityCommands(ctx, cli);
    const depsCommand = cli.commands
      .find((cmd) => cmd.name() === 'code-quality')
      ?.commands.find((cmd) => cmd.name() === 'deps');

    expect(depsCommand).toBeDefined();
    expect(depsCommand?.opts).toBeDefined();
    expect(depsCommand?.opts()).toEqual({
      circular: false,
      entry: './index.ts',
      image: undefined,
    });
  });

  it('should add "orphans" subcommand with correct description', () => {
    addCodeQualityCommands(ctx, cli);
    const orphansCommand = cli.commands
      .find((cmd) => cmd.name() === 'code-quality')
      ?.commands.find((cmd) => cmd.name() === 'orphans');

    expect(orphansCommand).toBeDefined();
    orphansCommand?.parse(['--entry', './index.ts']);
    expect(orphansCommand?.opts()).toEqual({ entry: './index.ts' });
  });

  it('should add "log" subcommand with correct options and description', () => {
  addCodeQualityCommands(ctx, cli);
  const logCommand = cli.commands
    .find((cmd) => cmd.name() === 'code-quality')
    ?.commands.find((cmd) => cmd.name() === 'log');

  expect(logCommand).toBeDefined();
  logCommand?.parse(['--output', 'git-logfile.log', '--timeframe', '1 year ago']);
  expect(logCommand?.opts()).toEqual({ output: 'git-logfile.log', timeframe: '1 year ago' });
});

  it('should alias "code-quality" to "cq"', () => {
    addCodeQualityCommands(ctx, cli);
    const aliases = cli.commands.find((cmd) => cmd.name() === 'code-quality')?.aliases() || [];
    expect(aliases).toContain('cq');
  });
});