import mysql from 'mysql2/promise';
import { env } from '../src/config/env';

async function createDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: env.dbHost,
            port: env.dbPort,
            user: env.dbUser,
            password: env.dbPassword,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.dbName}\`;`);
        console.log(`Database '${env.dbName}' created or already exists.`);
        await connection.end();
    } catch (error) {
        console.error('Error creating database:', error);
        process.exit(1);
    }
}

createDatabase();
