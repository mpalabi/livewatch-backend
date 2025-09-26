import { Sequelize } from 'sequelize';
import dbConfig from './config';

function getDialectOptions() {
  const sslRequired = String(process.env.PGSSLMODE || '').toLowerCase() === 'require' ||
    (typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.includes('sslmode='));
  return sslRequired ? { ssl: { require: true, rejectUnauthorized: false } } : undefined;
}

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
const config = (dbConfig as any)[env];

let sequelize: Sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: 'postgres',
    logging: config.logging,
    dialectOptions: getDialectOptions(),
  } as any);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    dialectOptions: getDialectOptions(),
  } as any);
}

export { sequelize };
export default sequelize;
