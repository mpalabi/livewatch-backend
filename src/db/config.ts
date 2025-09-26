import { Dialect } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();
export type DbConfig = { username: string; password: string | undefined | null; database: string; host: string; port: number; dialect: Dialect; logging: boolean | ((sql: string) => void); };
const base = { username: process.env.DB_USER || 'annotation', password: process.env.DB_PASSWORD || 'annotation', database: process.env.DB_NAME || 'livewatch_dev', host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 5432), dialect: 'postgres' as Dialect, logging: false };
export const development: DbConfig = { ...base, logging: process.env.DB_LOG_SQL === '1' ? console.log : false };
export const test: DbConfig = { ...base, database: process.env.DB_NAME_TEST || 'livewatch_test', logging: false };
export const production: DbConfig = { ...base, database: process.env.DB_NAME_PROD || 'livewatch', logging: false };
export default { development, test, production };
