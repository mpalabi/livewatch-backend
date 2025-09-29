import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional, Sequelize, ForeignKey } from 'sequelize';
import { Monitor } from './Monitor';
import { User } from './User';

export class MonitorShare extends Model<InferAttributes<MonitorShare>, InferCreationAttributes<MonitorShare>> {
  declare id: CreationOptional<string>;
  declare monitorId: ForeignKey<Monitor['id']>;
  declare userId: ForeignKey<User['id']> | null;
  declare email: string | null;
  declare role: 'viewer';
  declare status: 'invited' | 'accepted';
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initMonitorShare(sequelize: Sequelize) {
  MonitorShare.init({
    id: { type: DataTypes.UUID, allowNull: false, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    monitorId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.ENUM('viewer'), allowNull: false, defaultValue: 'viewer' },
    status: { type: DataTypes.ENUM('invited','accepted'), allowNull: false, defaultValue: 'invited' },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, { sequelize, tableName: 'MonitorShares', modelName: 'MonitorShare' });
}


