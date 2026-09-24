import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const isTest = process.env.NODE_ENV === 'test';
  const dbName = isTest ? process.env.DB_NAME_TEST : process.env.DB_NAME;
  
  if (!dbName) {
    console.error('DB_NAME or DB_NAME_TEST is not set in environment.');
    process.exit(1);
  }

  // Connect without a specific database to create it if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true, // Needed to execute multiple statements in schema.sql
  });

  try {
    console.log(`Ensuring database '${dbName}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log(`Applying schema from ${schemaPath} to '${dbName}'...`);
    await connection.query(schema);

    console.log(`Migration completed successfully for database '${dbName}'.`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
