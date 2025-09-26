require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'annotation',
  password: process.env.DB_PASSWORD || 'annotation',
  database: process.env.DB_NAME || 'livewatch_dev',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging: false,
  dialectOptions: (process.env.PGSSLMODE === 'require' || (process.env.DATABASE_URL || '').includes('sslmode='))
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : undefined,
};

module.exports = {
  development: { ...base },
  test: { ...base, database: process.env.DB_NAME_TEST || 'livewatch_test' },
  production: process.env.DATABASE_URL
    ? { use_env_variable: 'DATABASE_URL', dialect: 'postgres', logging: false, dialectOptions: base.dialectOptions }
    : { ...base, database: process.env.DB_NAME_PROD || 'livewatch' },
};
