import { useMutation, useQuery } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { createJob, fetchHealth, fetchNiches } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import TextField from '../components/TextField';
import { useAuth } from '../state/useAuth';

const LoadingRow = () => <span aria-busy="true">Loading…</span>;
const EmptyState = ({ message }: { message: string }) => <p role="status">{message}</p>;

const HomePage = () => {
  const { logout } = useAuth();
  const [prompt, setPrompt] = useState('Vanishing livestream signal');
  const [nicheId, setNicheId] = useState('');

  const healthQuery = useQuery({ queryKey: ['health'], queryFn: fetchHealth });
  const nicheQuery = useQuery({ queryKey: ['niches'], queryFn: fetchNiches });

  const jobMutation = useMutation({
    mutationFn: createJob
  });

  const niches = useMemo(() => nicheQuery.data || [], [nicheQuery.data]);

  const submit = (evt: FormEvent) => {
    evt.preventDefault();
    jobMutation.mutate({ prompt, nicheId: nicheId || niches[0]?.id, type: 'video' });
  };

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 16px', display: 'grid', gap: '16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--color-muted)', margin: 0 }}>Creator console</p>
          <h1 style={{ margin: '4px 0 0' }}>TikTok Automation</h1>
        </div>
        <Button variant="ghost" onClick={logout} aria-label="Log out">
          Log out
        </Button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <Card title="Create job" subtitle="Draft and send a render request">
          <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
            <TextField
              label="Prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Something unsettling that fits 60 seconds"
              required
            />
            <label className="text-field">
              <span className="text-field__label">Niche</span>
              {nicheQuery.isLoading ? (
                <LoadingRow />
              ) : nicheQuery.isError ? (
                <EmptyState message="Failed to load niches" />
              ) : (
                <select
                  value={nicheId}
                  onChange={e => setNicheId(e.target.value)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)'
                  }}
                  aria-label="Select a niche"
                >
                  {niches.map(niche => (
                    <option key={niche.id} value={niche.id}>
                      {niche.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <Button type="submit" disabled={jobMutation.isPending} aria-label="Create job">
              {jobMutation.isPending ? 'Sending…' : 'Queue job'}
            </Button>
            {jobMutation.isSuccess && jobMutation.data && (
              <p role="status">Job queued: {jobMutation.data.data.jobId}</p>
            )}
            {jobMutation.isError && <p role="alert">{(jobMutation.error as Error).message}</p>}
          </form>
        </Card>

        <Card title="Service health" subtitle="ffmpeg & queue status">
          {healthQuery.isLoading && <LoadingRow />}
          {healthQuery.isError && <EmptyState message="Health check failed" />}
          {healthQuery.data && (
            <dl style={{ display: 'grid', gap: 8, margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt>Status</dt>
                <dd>{healthQuery.data.status}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt>ffmpeg</dt>
                <dd>{healthQuery.data.ffmpeg.available ? 'Available' : 'Missing'}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt>Jobs running</dt>
                <dd>{healthQuery.data.jobs.running}</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      <Card title="Available niches" subtitle="Map backend profiles to UI">
        {nicheQuery.isLoading && <LoadingRow />}
        {nicheQuery.isError && <EmptyState message="Cannot load niches" />}
        {nicheQuery.data && nicheQuery.data.length === 0 && <EmptyState message="No niches configured" />}
        <div style={{ display: 'grid', gap: '12px' }}>
          {niches.map(niche => (
            <article
              key={niche.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px'
              }}
            >
              <strong>{niche.name}</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--color-muted)' }}>{niche.description}</p>
            </article>
          ))}
        </div>
      </Card>
    </main>
  );
};

export default HomePage;
