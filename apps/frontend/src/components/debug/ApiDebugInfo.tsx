import { useState } from 'react';
import { debugAPI } from '../../utils/apiDebug';

export default function ApiDebugInfo() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const results = await debugAPI.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="card-dark rounded-lg border border-dark-border p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-dark-text-primary">API Diagnostics</h2>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="btn-primary-dark px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>

      {diagnostics && (
        <div className="space-y-4">
          <div className="bg-dark-secondary/20 rounded p-4">
            <h3 className="font-medium text-dark-text-primary mb-2">Summary</h3>
            <pre className="text-sm text-dark-text-secondary whitespace-pre-wrap">
              {diagnostics.summary}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-dark-secondary/20 rounded p-4">
              <h4 className="font-medium text-dark-text-primary mb-2">Server Health</h4>
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${diagnostics.serverHealth.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-dark-text-secondary">{diagnostics.serverHealth.message}</span>
                </div>
              </div>
            </div>

            <div className="bg-dark-secondary/20 rounded p-4">
              <h4 className="font-medium text-dark-text-primary mb-2">Authentication</h4>
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${diagnostics.authStatus.hasToken ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-dark-text-secondary">
                    {diagnostics.authStatus.hasToken ? 'Token found' : 'No token'}
                  </span>
                </div>
                {diagnostics.authStatus.tokenInfo && (
                  <div className="mt-1 text-xs text-dark-text-muted">
                    Source: {diagnostics.authStatus.tokenInfo.source}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-dark-secondary/20 rounded p-4">
              <h4 className="font-medium text-dark-text-primary mb-2">Job Applications API</h4>
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${diagnostics.jobApplicationsEndpoint.working ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-dark-text-secondary">{diagnostics.jobApplicationsEndpoint.message}</span>
                </div>
              </div>
            </div>

            <div className="bg-dark-secondary/20 rounded p-4">
              <h4 className="font-medium text-dark-text-primary mb-2">Authenticated Request</h4>
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${diagnostics.authenticatedRequest.working ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-dark-text-secondary">{diagnostics.authenticatedRequest.message}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-dark-text-muted">
        <p>
          💡 You can also run diagnostics from the browser console by typing: <br />
          <code className="bg-dark-secondary/20 px-2 py-1 rounded">window.debugAPI.runDiagnostics()</code>
        </p>
      </div>
    </div>
  );
}