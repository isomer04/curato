'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');

    if (!Object.prototype.hasOwnProperty.call(table, 'email_verification_expires_at')) {
      await queryInterface.addColumn('users', 'email_verification_expires_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    await queryInterface
      .addIndex('users', ['email_verification_expires_at'], {
        name: 'idx_users_email_verification_expires_at',
      })
      .catch(() => undefined);
  },

  async down(queryInterface) {
    await queryInterface
      .removeIndex('users', 'idx_users_email_verification_expires_at')
      .catch(() => undefined);

    const table = await queryInterface.describeTable('users');
    if (Object.prototype.hasOwnProperty.call(table, 'email_verification_expires_at')) {
      await queryInterface.removeColumn('users', 'email_verification_expires_at');
    }
  },
};
