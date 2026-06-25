import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('caraoke-api', () => {
  const app = createApp();

  it('GET /health returns the uniform envelope', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { status: 'ok', service: 'caraoke-api' },
      error: null,
    });
  });
});
