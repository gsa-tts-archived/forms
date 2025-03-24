import { promises as fs } from 'fs';
import path from 'path';
import { Command } from 'commander';

import {
  type DeployEnv,
  commands,
  getSecretsVault,
} from '@gsa-tts/forms-infra-core';
import { type Context } from './types.js';
import { createAuthRepository, BaseAuthContext } from '@gsa-tts/forms-auth';
import { randomUUID } from 'crypto';

export const addSecretCommands = (ctx: Context, cli: Command) => {
  const cmd = cli
    .command('secrets')
    .option('-f, --file <path>', 'Source JSON file for secrets.', path => {
      ctx.file = path;
    })
    .description('secrets management commands');

  cmd
    .command('delete')
    .description('delete a secret')
    .argument('<string>', 'secret key name')
    .action(async (key: string) => {
      const vault = await getSecretsVault(ctx.file);
      await commands.deleteSecret(vault, key);
    });

  cmd
    .command('get')
    .description('get a secret value')
    .argument('<string>', 'secret key name')
    .action(async (key: string) => {
      const vault = await getSecretsVault(ctx.file);
      const secret = await commands.getSecret(vault, key);
      console.log(secret);
    });

  cmd
    .command('set')
    .description('set a secret value')
    .argument('<string>', 'secret key name')
    .argument('<string>', 'secret value to set')
    .action(async (key: string, value: string) => {
      const vault = await getSecretsVault(ctx.file);
      await commands.setSecret(vault, key, value);
    });

  cmd
    .command('set-bulk')
    .description('sets secret values from a JSON file')
    .argument('<string>', 'Source JSON file for secrets.')
    .action(async inputFile => {
      const vault = await getSecretsVault(ctx.file);
      const maybeJsonString = (await fs.readFile(inputFile)).toString();
      const secrets = JSON.parse(maybeJsonString);
      await commands.setSecrets(vault, secrets);
    });

  cmd
    .command('list')
    .description('list all secret keys')
    .action(async () => {
      const vault = await getSecretsVault(ctx.file);
      const secretKeys = await commands.getSecretKeyList(vault);
      console.log(JSON.stringify(secretKeys, null, 2));
    });

  cmd
    .command('show')
    .description('show all secrets')
    .action(async () => {
      const vault = await getSecretsVault(ctx.file);
      const allSecrets = await commands.getSecrets(vault);
      console.log(JSON.stringify(allSecrets, null, 2));
    });

  cmd
    .command('set-login-gov-keys')
    .description(
      'generate and save login.gov keypair; if it already exists, it is not ' +
      'updated (future work might include adding key rotation)',
    )
    .argument('<deploy-env>', 'deployment environment (dev, demo)')
    .argument('<app-key>', 'application key')
    .action(async (env: DeployEnv, appKey: string) => {
      const vault = await getSecretsVault(ctx.file);
      const secretsDir = path.resolve(__dirname, '../../../infra/secrets');
      const loginResult = await commands.setLoginGovSecrets(
        { vault, secretsDir },
        env,
        appKey,
      );
      if (loginResult.preexisting) {
        console.log('Keypair already exists.');
      } else {
        console.log('New keypair added');
      }
    });

  cmd
    .command('generate-test-db-session')
    .description('Prepare the database and auth context for testing')
    .requiredOption(
      '-p, --path <string>',
      'Path to the SQLite database file to prepare',
    )
    .action(async (options) => {
      const { createFilesystemDatabaseContext } = await import(
        '@gsa-tts/forms-database/context'
      );
      const dbPath = options.path;

      try {
        console.log('Preparing database at:', dbPath);

        // The login flow is to create fs db context -> feed into base auth context constructor -> feed it into the auth service
        const dbContext = await createFilesystemDatabaseContext(dbPath);
        const authRepository = createAuthRepository(dbContext);
        const authContext = new BaseAuthContext(
          authRepository,
          {
            // Stub or mock a login provider for testing (can be plugged in as needed)
            authorize: () => Promise.resolve(true),
          },
          () => '', // Mock getCookie function
          () => {}, // Mock setCookie function
          () => {}, // Mock setUserSession function
          () => Promise.resolve(true), // Mock isUserAuthorized function
        );

        const testEmail = 'test@example.com';

        const user = await authRepository.createUser(testEmail);
        console.log(`Test user created with id: ${user}`);
        const userId = await authRepository.getUserId(testEmail);

        if(userId) {
          const lucia = await authContext.getLucia();
          const session = await lucia.createSession(userId, {
            session_token: randomUUID(),
          });
          console.log(`Test session created: ${session.id}`);
        }
        console.log('Auth Context & Database Prepared Successfully!');
      } catch (error) {
        console.error('Error preparing the database:', error.message);
      }
    });
};