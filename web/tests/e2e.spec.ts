import { test, expect } from '@playwright/test';

const healthFixture = {
  status: 'ok',
  version: '0.2.0',
  timestamp: new Date().toISOString(),
  ffmpeg: { available: true, version: 'ffmpeg mock' },
  jobs: { total: 1, completed: 1, failed: 0, running: 0 }
};

const nichesFixture = {
  success: true,
  data: {
    niches: [
      { id: 'horror', name: 'Horror', description: 'Scary stories' },
      { id: 'reddit_stories', name: 'Reddit Stories', description: 'Casual narrations' }
    ]
  }
};

test('home screen renders with mocked API', async ({ page }) => {
  await page.route('**/health', route => route.fulfill({ json: healthFixture }));
  await page.route('**/niches', route => route.fulfill({ json: nichesFixture }));
  await page.route('**/jobs', route =>
    route.fulfill({ json: { success: true, data: { jobId: 'job_123', status: 'pending', nicheId: 'horror', createdAt: new Date().toISOString() } } })
  );

  await page.goto('/login');
  await page.getByRole('button', { name: 'Enter console' }).click();
  await expect(page.getByText('TikTok Automation')).toBeVisible();
  await page.getByRole('button', { name: 'Queue job' }).click();
  await expect(page.getByText(/Job queued/)).toBeVisible();
});
