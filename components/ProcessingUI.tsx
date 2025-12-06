import React from 'react';
import { ProcessingStatus } from '../types';

interface ProcessingUIProps {
  status: ProcessingStatus;
}

const ProcessingUI: React.FC<ProcessingUIProps> = ({ status }) => {
  if (status.step === 'IDLE') return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {status.step === 'ERROR' ? 'Erro no Processamento' : 'A Processar Documentos'}
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            status.step === 'COMPLETED' ? 'bg-green-100 text-green-700' :
            status.step === 'ERROR' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700 animate-pulse'
          }`}>
            {status.step}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${
              status.step === 'ERROR' ? 'bg-red-500' : 'bg-blue-600'
            }`}
            style={{ width: `${status.progress}%` }}
          ></div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 font-mono text-sm text-slate-600 h-32 overflow-y-auto">
          <p className="flex items-center gap-2">
            <span className="text-blue-500">➜</span>
            {status.message}
          </p>
          {status.error && (
            <p className="mt-2 text-red-600 font-bold">
              Erro: {status.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingUI;
