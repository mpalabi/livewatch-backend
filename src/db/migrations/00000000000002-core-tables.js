'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const uuid = { type: Sequelize.UUID, allowNull: false, primaryKey: true };

    await queryInterface.createTable('Users', {
      id: uuid,
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('NotificationChannels', {
      id: uuid,
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: Sequelize.ENUM('email','sms','slack','webhook'), allowNull: false },
      destination: { type: Sequelize.STRING, allowNull: false },
      settings: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('Monitors', {
      id: uuid,
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING, allowNull: false },
      url: { type: Sequelize.STRING, allowNull: false },
      method: { type: Sequelize.ENUM('GET','POST','PUT','PATCH','DELETE','HEAD'), allowNull: false, defaultValue: 'GET' },
      expectedStatus: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 200 },
      intervalSeconds: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 60 },
      timeoutMs: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10000 },
      headers: { type: Sequelize.JSONB, allowNull: true },
      isPaused: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('MonitorNotifications', {
      id: uuid,
      monitorId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Monitors', key: 'id' }, onDelete: 'CASCADE' },
      channelId: { type: Sequelize.UUID, allowNull: false, references: { model: 'NotificationChannels', key: 'id' }, onDelete: 'CASCADE' },
      notifyOn: { type: Sequelize.ENUM('down','recovery','threshold','always'), allowNull: false, defaultValue: 'down' },
      thresholdMs: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('Checks', {
      id: uuid,
      monitorId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Monitors', key: 'id' }, onDelete: 'CASCADE' },
      status: { type: Sequelize.ENUM('up','down'), allowNull: false },
      httpStatus: { type: Sequelize.INTEGER, allowNull: true },
      responseTimeMs: { type: Sequelize.INTEGER, allowNull: false },
      error: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Monitors', ['userId']);
    await queryInterface.addIndex('NotificationChannels', ['userId']);
    await queryInterface.addIndex('MonitorNotifications', ['monitorId']);
    await queryInterface.addIndex('MonitorNotifications', ['channelId']);
    await queryInterface.addIndex('Checks', ['monitorId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Checks');
    await queryInterface.dropTable('MonitorNotifications');
    await queryInterface.dropTable('Monitors');
    await queryInterface.dropTable('NotificationChannels');
    await queryInterface.dropTable('Users');
  },
};
