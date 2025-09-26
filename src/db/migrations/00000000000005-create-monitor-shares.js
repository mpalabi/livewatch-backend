'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MonitorShares', {
      id: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      monitorId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Monitors', key: 'id' }, onDelete: 'CASCADE' },
      userId: { type: Sequelize.UUID, allowNull: true, references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL' },
      email: { type: Sequelize.STRING, allowNull: true },
      role: { type: Sequelize.ENUM('viewer'), allowNull: false, defaultValue: 'viewer' },
      status: { type: Sequelize.ENUM('invited','accepted'), allowNull: false, defaultValue: 'invited' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('MonitorShares', ['monitorId']);
    await queryInterface.addIndex('MonitorShares', ['userId']);
    await queryInterface.addIndex('MonitorShares', ['email']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('MonitorShares');
  },
};


