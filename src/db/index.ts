import { Sequelize } from 'sequelize';
import dbConfig from './config';
const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
const config = (dbConfig as any)[env];
export const sequelize = new Sequelize(config.database, config.username, config.password, config);
export default sequelize;
