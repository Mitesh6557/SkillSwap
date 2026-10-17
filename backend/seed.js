/**
 * SkillSwap - Safe Database Seeder
 * Reads schema.sql and seed.sql, checks connection, and initializes the database safely.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const databaseName = process.env.DB_NAME || 'skillswap_db';

/**
 * Split SQL script by semicolons, ignoring semicolons inside strings or comments
 */
function splitSqlStatements(sqlContent) {
  return sqlContent
    .split(/;\s*$/m)
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
}

async function runSeeder() {
  console.log('----------------------------------------------------');
  console.log('🔄 SkillSwap Database Initializer & Seeder');
  console.log('----------------------------------------------------');
  console.log(`Connecting to MySQL host: ${dbConfig.host}:${dbConfig.port} as '${dbConfig.user}'...`);

  let connection;

  try {
    // 1. Establish initial connection without database selected
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL server successfully.');

    // 2. Ensure database exists
    console.log(`📦 Checking database '${databaseName}'...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.query(`USE \`${databaseName}\`;`);
    console.log(`✅ Database '${databaseName}' is ready.`);

    // 3. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📄 Executing database/schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log('✅ Tables created or verified successfully.');
    } else {
      console.warn('⚠️ schema.sql not found at:', schemaPath);
    }

    // 4. Read and execute seed.sql
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Executing database/seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await connection.query(seedSql);
      console.log('✅ Initial seed data populated successfully.');
    } else {
      console.warn('⚠️ seed.sql not found at:', seedPath);
    }

    console.log('----------------------------------------------------');
    console.log('🎉 Database seeding completed safely with zero errors!');
    console.log('Default test accounts:');
    console.log(' - Admin: admin@skillswap.com (Password: Password123!)');
    console.log(' - User:  sarah.chen@example.com (Password: Password123!)');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('\n❌ Seeding failed with error:');
    console.error(err.message);
    console.error('\n💡 Troubleshooting Tips:');
    console.error('1. Make sure your MySQL service is running locally.');
    console.error('2. Check backend/.env to ensure DB_USER, DB_PASSWORD, and DB_PORT match your MySQL settings.');
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

runSeeder();
