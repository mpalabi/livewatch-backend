require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'annotation',
  password: process.env.DB_PASSWORD || 'annotation',
  database: process.env.DB_NAME || 'livewatch_dev',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: { ...base },
  test: { ...base, database: process.env.DB_NAME_TEST || 'livewatch_test' },
  production: { ...base, database: process.env.DB_NAME_PROD || 'livewatch' },
};
