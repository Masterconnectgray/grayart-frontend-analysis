import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white px-4">
          <div className="max-w-md w-full">
            <div className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black mb-2">Ops! Algo deu errado</h2>
              <p className="text-sm opacity-60 mb-6">
                Ocorreu um erro inesperado ao carregar esta página.
              </p>
              {this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="text-xs font-bold opacity-40 uppercase cursor-pointer hover:opacity-60 mb-2">
                    Detalhes do erro
                  </summary>
                  <div className="text-xs font-mono bg-black/30 p-3 rounded-lg overflow-auto max-h-32">
                    {this.state.error.message}
                  </div>
                </details>
              )}
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[var(--primary-color)] text-black rounded-xl font-bold hover:brightness-110 transition-all"
              >
                <RefreshCcw className="w-4 h-4" />
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;