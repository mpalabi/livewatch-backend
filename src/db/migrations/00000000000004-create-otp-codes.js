'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OtpCodes', {
      id: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      code: { type: Sequelize.STRING, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      consumed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('OtpCodes', ['userId']);
    await queryInterface.addIndex('OtpCodes', ['code']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('OtpCodes');
  },
};


