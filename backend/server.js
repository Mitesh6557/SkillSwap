/**
 * SkillSwap - Server Entry Point
 * Starts HTTP server and initializes MySQL database pool connection test.
 */

const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const { pool } = require('./src/config/database');

const server = http.createServer(app);

/**
 * Verify database connection pool connectivity
 */
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ MySQL Pool connected successfully to '${env.DB_NAME}' on ${env.DB_HOST}:${env.DB_PORT}`);
    connection.release();
  } catch (err) {
    console.warn('⚠️  MySQL Connection Warning:');
    console.warn(`   Unable to connect to database '${env.DB_NAME}' on ${env.DB_HOST}:${env.DB_PORT}.`);
    console.warn(`   Error: ${err.message}`);
    console.warn('   💡 Tip: Ensure MySQL is running and verify DB credentials in backend/.env');
    console.warn('   💡 Run "npm run seed" once MySQL is ready to create tables and seed data.');
  }
}

/**
 * Start Express HTTP Server
 */
function startServer() {
  const PORT = env.PORT;

  server.listen(PORT, async () => {
    console.log('====================================================');
    console.log(`🚀 SkillSwap Backend Server is running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log('====================================================');

    await testDatabaseConnection();
  });
}

// Graceful termination handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down server...');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});

startServer();
