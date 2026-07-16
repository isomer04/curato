'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('users');

    if (!Object.prototype.hasOwnProperty.call(table, 'mfa_temp_token_hash')) {
      await queryInterface.addColumn('users', 'mfa_temp_token_hash', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(table, 'password_reset_token_hash')) {
      await queryInterface.addColumn('users', 'password_reset_token_hash', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(table, 'password_reset_expires_at')) {
      await queryInterface.addColumn('users', 'password_reset_expires_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(table, 'email_verification_token_hash')) {
      await queryInterface.addColumn('users', 'email_verification_token_hash', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    await queryInterface.addIndex('users', ['password_reset_token_hash'], {
      name: 'idx_users_password_reset_token_hash',
    }).catch(() => undefined);

    await queryInterface.addIndex('users', ['email_verification_token_hash'], {
      name: 'idx_users_email_verification_token_hash',
    }).catch(() => undefined);
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('users');

    await queryInterface
      .removeIndex('users', 'idx_users_password_reset_token_hash')
      .catch(() => undefined);
    await queryInterface
      .removeIndex('users', 'idx_users_email_verification_token_hash')
      .catch(() => undefined);

    if (Object.prototype.hasOwnProperty.call(table, 'email_verification_token_hash')) {
      await queryInterface.removeColumn('users', 'email_verification_token_hash');
    }

    if (Object.prototype.hasOwnProperty.call(table, 'password_reset_expires_at')) {
      await queryInterface.removeColumn('users', 'password_reset_expires_at');
    }

    if (Object.prototype.hasOwnProperty.call(table, 'password_reset_token_hash')) {
      await queryInterface.removeColumn('users', 'password_reset_token_hash');
    }

    if (Object.prototype.hasOwnProperty.call(table, 'mfa_temp_token_hash')) {
      await queryInterface.removeColumn('users', 'mfa_temp_token_hash');
    }
  },
};
