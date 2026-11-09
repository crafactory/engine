import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import 'katex/dist/katex.min.css';
import '@xyflow/react/dist/style.css';
import './ui/theme.css';
import './components/ui/ui.css';
import './style.css';
import './ui/overlays.css';
class Boundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="crash">
        <h1>Unable to open the workspace</h1>
        <p>{this.state.error}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const root = createRoot(document.getElementById('root')!);
root.render(
  <main className="crash">
    <h1>Opening workspace…</h1>
  </main>,
);
async function launch() {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { bootstrapAndroid } = await import('./mobile/bootstrap');
    window.engine = await bootstrapAndroid();
  }
  // Do not move this import above native bootstrap: bridge.ts captures window.engine.
  const { App } = await import('./App');
  root.render(
    <Boundary>
      <App />
    </Boundary>,
  );
}
void launch().catch((error) =>
  root.render(
    <main className="crash">
      <h1>Unable to open the workspace</h1>
      <p>{String(error)}</p>
      <p>Your stored files have not been reset.</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </main>,
  ),
);
