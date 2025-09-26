import { exec } from 'child_process';
import { promisify } from 'util';
import sequelize from '../db/index';

const pexec = promisify(exec);

export async function ensureExtensions() {
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
}

export async function runMigrationsOnStartup() {
  try {
    await ensureExtensions();
    // Run sequelize-cli migrations idempotently
    await pexec('npx sequelize-cli db:migrate', { env: process.env, cwd: process.cwd() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db:init] migration failed', err);
    throw err;
  }
}


