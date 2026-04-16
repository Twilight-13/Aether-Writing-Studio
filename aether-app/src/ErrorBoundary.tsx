import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorStr: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorStr: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorStr: error.toString() + '\\n' + error.stack };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: '#220000', borderRadius: '8px', overflow: 'auto', maxHeight: '100%' }}>
          <h2>Oops, there was an error!</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>{this.state.errorStr}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
