import request from 'supertest';
import { createApp } from '../src/index';

describe('Backend API Integration Tests', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /jobs', () => {
    it('should create a new job and return job ID', async () => {
      const response = await request(app)
        .post('/jobs')
        .send({ type: 'horror_video', prompt: 'A scary story' })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should return 400 if type is missing', async () => {
      const response = await request(app)
        .post('/jobs')
        .send({ prompt: 'A scary story' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /jobs/:id', () => {
    it('should return job status for existing job', async () => {
      // First create a job
      const createResponse = await request(app)
        .post('/jobs')
        .send({ type: 'horror_video' });

      const jobId = createResponse.body.data.jobId;

      // Then get its status
      const response = await request(app)
        .get(`/jobs/${jobId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', jobId);
      expect(response.body.data).toHaveProperty('status');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/jobs/nonexistent_job_id')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Job not found');
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Route not found');
    });
  });
});
