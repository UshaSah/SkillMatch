// Route test for the health endpoints using supertest.
// Mounts the router on a fresh app so no server/DB side effects occur.
const express = require('express');
const request = require('supertest');
const healthRoutes = require('../src/routes/health');

const app = express();
app.use('/api/health', healthRoutes);

describe('GET /api/health', () => {
  test('returns 200 and a healthy status payload', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('detailed endpoint returns 200 with memory info', async () => {
    const res = await request(app).get('/api/health/detailed');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('memory');
  });
});
