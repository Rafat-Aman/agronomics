import { StrictMode, Component, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './AuthContext';

// Error boundary to catch silent crashes and show them on screen
interface EBProps { children?: React.ReactNode; }
interface EBState { error: Error | null; }
class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#fff0f0', minHeight: '100vh' }}>
          <h2 style={{ color: '#c00' }}>App crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#333', fontSize: 13 }}>{err.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: 11 }}>{err.stack}</pre>
        </div>
      );
    }
    return this.props.children ?? null;
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
