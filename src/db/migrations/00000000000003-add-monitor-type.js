'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Monitors', 'type', {
      type: Sequelize.ENUM('web_app', 'api', 'service'),
      allowNull: false,
      defaultValue: 'web_app',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Monitors', 'type');
    // Drop the enum type if created
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Monitors_type";');
  },
};


