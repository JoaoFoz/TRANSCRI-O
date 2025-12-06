import React from 'react';

interface HelpGuideProps {
  onClose: () => void;
}

const HelpGuide: React.FC<HelpGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            <i className="fa-solid fa-circle-info text-blue-500 mr-2"></i>
            Como obter uma API Google Gratuita
          </h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>
        </div>
        
        <div className="p-6 space-y-4 text-slate-600 dark:text-slate-300">
          <p>
            Esta aplicação utiliza inteligência artificial (Google Gemini) para ler e estruturar os seus documentos de transcrição. Para que funcione, é necessária uma <strong>API Key</strong>.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r">
            <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Passo a Passo:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Aceda ao <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-500 dark:hover:text-blue-300">Google AI Studio</a>.</li>
              <li>Faça login com a sua conta Google.</li>
              <li>Clique em <strong>"Create API Key"</strong>.</li>
              <li>Pode selecionar um projeto existente ou criar um novo ("Create API key in new project").</li>
              <li>Copie a chave gerada (começa geralmente por "AIza...").</li>
            </ol>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Nota sobre Privacidade</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Os seus documentos são processados diretamente entre o seu navegador e a Google. 
              <strong>Nenhum dado é guardado nos nossos servidores</strong>, pois esta aplicação corre inteiramente no seu browser.
              Verifique os termos de serviço da Google AI se estiver a tratar de dados altamente confidenciais.
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700/50">
             <h3 className="font-semibold text-yellow-600 dark:text-yellow-500 text-sm mb-1">Configuração Técnica</h3>
             <p className="text-xs text-yellow-700 dark:text-yellow-600">
               Como esta é uma demonstração Web, a API Key deve estar configurada nas variáveis de ambiente (.env) como <code>API_KEY</code>. Se estiver a correr localmente, crie um ficheiro <code>.env</code> na raiz com: <br/>
               <code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded text-yellow-700 dark:text-yellow-200 mt-1 inline-block">API_KEY=a_sua_chave_aqui</code>
             </p>
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpGuide;