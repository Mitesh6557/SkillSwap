/**
 * SkillSwap - Automated Integration Test Suite
 * Tests end-to-end API workflows including Auth, Profiles, Skills, Swaps, Admin, and CSV Exports.
 */

const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');

let server;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const data = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.write(data);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting SkillSwap Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health check
  try {
    const health = await request('/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'GET /api/health responds with 200 OK and healthy status');
  } catch (err) {
    assert(false, `GET /api/health error: ${err.message}`);
  }

  // 2. User login
  let userToken = '';
  try {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'sarah.chen@example.com', password: 'Password123!' },
    });
    userToken = login.body.data ? login.body.data.token : null;
    assert(login.status === 200 && !!userToken, 'POST /api/auth/login succeeds with valid JWT');
  } catch (err) {
    assert(false, `POST /api/auth/login error: ${err.message}`);
  }

  // 3. Admin login
  let adminToken = '';
  try {
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@skillswap.com', password: 'Password123!' },
    });
    adminToken = adminLogin.body.data ? adminLogin.body.data.token : null;
    assert(adminLogin.status === 200 && !!adminToken, 'POST /api/auth/login succeeds for admin user');
  } catch (err) {
    assert(false, `Admin login error: ${err.message}`);
  }

  // 4. Authenticated profile (/api/auth/me)
  try {
    const me = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(me.status === 200 && me.body.data.email === 'sarah.chen@example.com', 'GET /api/auth/me returns current user');
  } catch (err) {
    assert(false, `GET /api/auth/me error: ${err.message}`);
  }

  // 5. User discovery list
  try {
    const users = await request('/api/users');
    assert(users.status === 200 && Array.isArray(users.body.data), 'GET /api/users returns public profile directory');
  } catch (err) {
    assert(false, `GET /api/users error: ${err.message}`);
  }

  // 6. Skills catalog
  try {
    const skills = await request('/api/skills');
    assert(skills.status === 200 && Array.isArray(skills.body.data), 'GET /api/skills returns global skill catalog');
  } catch (err) {
    assert(false, `GET /api/skills error: ${err.message}`);
  }

  // 7. Swaps listing
  try {
    const swaps = await request('/api/swaps', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(swaps.status === 200 && Array.isArray(swaps.body.data), 'GET /api/swaps returns user swap exchanges');
  } catch (err) {
    assert(false, `GET /api/swaps error: ${err.message}`);
  }

  // 8. Notifications
  try {
    const notifs = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(notifs.status === 200 && Array.isArray(notifs.body.data), 'GET /api/notifications returns user alerts');
  } catch (err) {
    assert(false, `GET /api/notifications error: ${err.message}`);
  }

  // 9. Admin Stats
  try {
    const stats = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(stats.status === 200 && stats.body.data.totalUsers >= 1, 'GET /api/admin/stats returns platform metrics');
  } catch (err) {
    assert(false, `GET /api/admin/stats error: ${err.message}`);
  }

  // 10. Admin CSV Export
  try {
    const csv = await request('/api/admin/export/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(csv.status === 200 && typeof csv.body === 'string' && csv.body.includes('User ID'), 'GET /api/admin/export/users streams valid CSV data');
  } catch (err) {
    assert(false, `CSV export error: ${err.message}`);
  }

  // 11. Smart Skill Matches
  try {
    const matches = await request('/api/matches', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(matches.status === 200 && Array.isArray(matches.body.data) && matches.body.data.length > 0, 'GET /api/matches calculates ranked smart skill matches');
  } catch (err) {
    assert(false, `GET /api/matches error: ${err.message}`);
  }

  // 12. Session Management
  try {
    const sessions = await request('/api/sessions', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(sessions.status === 200 && Array.isArray(sessions.body.data), 'GET /api/sessions returns user scheduled sessions');
  } catch (err) {
    assert(false, `GET /api/sessions error: ${err.message}`);
  }

  // 13. Trust & Safety Reports Reasons & Submission
  try {
    const reasons = await request('/api/reports/reasons');
    assert(reasons.status === 200 && Array.isArray(reasons.body.data), 'GET /api/reports/reasons returns safety report categories');
  } catch (err) {
    assert(false, `GET /api/reports/reasons error: ${err.message}`);
  }

  // 14. Admin Reports Queue
  try {
    const reports = await request('/api/admin/reports', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(reports.status === 200 && Array.isArray(reports.body.data), 'GET /api/admin/reports returns moderation reports queue');
  } catch (err) {
    assert(false, `GET /api/admin/reports error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  server.close();
  await pool.end();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Start ephemeral server and run tests
server = app.listen(0, async () => {
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  await runTests();
});
