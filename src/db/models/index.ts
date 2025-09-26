import sequelize from '@db/index';
import { initUser, User } from './User';
import { initMonitor, Monitor } from './Monitor';
import { initNotificationChannel, NotificationChannel } from './NotificationChannel';
import { initMonitorNotification, MonitorNotification } from './MonitorNotification';
import { initCheck, Check } from './Check';
export function initModels() {
  initUser(sequelize);
  initMonitor(sequelize);
  initNotificationChannel(sequelize);
  initMonitorNotification(sequelize);
  initCheck(sequelize);
  Monitor.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(Monitor, { foreignKey: 'userId' });
  NotificationChannel.belongsTo(User, { foreignKey: 'userId' });
  User.hasMany(NotificationChannel, { foreignKey: 'userId' });
  MonitorNotification.belongsTo(Monitor, { foreignKey: 'monitorId' });
  Monitor.hasMany(MonitorNotification, { foreignKey: 'monitorId' });
  MonitorNotification.belongsTo(NotificationChannel, { foreignKey: 'channelId' });
  NotificationChannel.hasMany(MonitorNotification, { foreignKey: 'channelId' });
  Check.belongsTo(Monitor, { foreignKey: 'monitorId' });
  Monitor.hasMany(Check, { foreignKey: 'monitorId' });
}
export { sequelize, User, Monitor, NotificationChannel, MonitorNotification, Check };
