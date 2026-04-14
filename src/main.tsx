import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './AuthContext';

// Error boundary to catch silent crashes and show them on screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#fff0f0', minHeight: '100vh' }}>
          <h2 style={{ color: '#c00' }}>App crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#333', fontSize: 13 }}>{err.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: 11 }}>{err.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
