import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = Number(process.env.PORT || 4000);
export const DB_USER = process.env.DB_USER || 'postgres';
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const DB_NAME = process.env.DB_NAME || 'livewatch_dev';
export const DB_HOST = process.env.DB_HOST || '127.0.0.1';
export const DB_PORT = Number(process.env.DB_PORT || 5432);
