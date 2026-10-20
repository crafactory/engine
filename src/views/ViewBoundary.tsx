import {Component,type ReactNode} from 'react';

interface Props {resetKey?: string; children: ReactNode}
interface State {failed: boolean}

/** Contain a failing view so the rest of the workspace stays usable. */
export class ViewBoundary extends Component<Props,State> {
  state: State = {failed: false};
  static getDerivedStateFromError(): State { return {failed: true}; }
  componentDidCatch(error: Error) { console.error('View failed to render', error); }
  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({failed: false});
  }
  render() {
    if (this.state.failed) return <div className="empty workspace-empty"><h1>View unavailable</h1><p>This view failed to load. Switch to source mode or reopen the note.</p></div>;
    return this.props.children;
  }
}
