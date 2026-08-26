import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D12] text-[#F3EEE4] flex flex-col items-center justify-center p-6 font-mono">
          <div className="max-w-xl w-full bg-[#0E121B] border border-red-800/80 rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-red-900/60 pb-3">
              <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <h1 className="text-lg font-bold text-red-400 uppercase tracking-wide">
                  35º BPM // RECUPERAÇÃO DO SISTEMA
                </h1>
                <p className="text-xs text-zinc-400">
                  Ocorreu uma falha na renderização de um componente.
                </p>
              </div>
            </div>

            <div className="bg-black/80 border border-zinc-800 rounded p-3 text-xs text-red-300 font-mono overflow-auto max-h-48">
              {this.state.error?.message || 'Erro desconhecido'}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded transition cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar Sistema
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
