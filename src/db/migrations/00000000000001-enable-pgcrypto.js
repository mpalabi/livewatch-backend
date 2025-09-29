'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    } catch (_) {
      // ignore on hosted providers where extensions cannot be created
    }
  },
  async down(queryInterface) {
    try {
      await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS pgcrypto;');
    } catch (_) {}
  },
};
