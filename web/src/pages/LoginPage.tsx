import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../state/useAuth';

const LoginPage = () => {
  const { login } = useAuth();

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: '0 16px' }}>
      <Card title="Welcome" subtitle="Demo guard before using the console">
        <p>
          This placeholder screen represents an authenticated creator workspace. Replace with your real session
          handling once OAuth or email magic links are wired.
        </p>
        <Button onClick={login} aria-label="Enter console">
          Enter console
        </Button>
      </Card>
    </main>
  );
};

export default LoginPage;
