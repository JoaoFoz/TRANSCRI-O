import React, { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { ProcessingStatus, ParsedSession, SavedTag, AliasMap, ProjectData } from './types';
import { parseDocumentWithGemini } from './services/geminiService';
import { generateOutputPackage } from './services/fileGenerator';
import HelpGuide from './components/HelpGuide';
import ProcessingUI from './components/ProcessingUI';
import Explorer from './components/Explorer';

// Helper to convert File to Base64 (for Gemini)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URI prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

type AppMode = 'HOME' | 'PROCESSOR' | 'EXPLORER';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('HOME');
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'IDLE', message: '', progress: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<{ sessions: number, fileName: string } | null>(null);
  
  // Data for Explorer
  const [sessions, setSessions] = useState<ParsedSession[]>([]);
  
  // --- PERSISTENT STATE ---
  // Lifted from Explorer to allow saving/loading project state
  const [savedTags, setSavedTags] = useState<SavedTag[]>([]);
  const [aliasMap, setAliasMap] = useState<AliasMap>({});

  // Refs for custom file inputs
  const folderInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // LAZY LOADING REGISTRIES
  // Stores raw JSZip instances or Files to avoid loading everything into Blob URLs at once
  // -------------------------------------------------------------------------
  const zipRegistry = useRef<Map<string, JSZip>>(new Map());
  const fileRegistry = useRef<Map<string, File>>(new Map());
  // We also need to store the original PDF array buffers to regenerate the project zip
  // This registry maps "FileName" -> ArrayBuffer
  const sourceBufferRegistry = useRef<Map<string, ArrayBuffer>>(new Map());

  // Helper to append sessions without duplicates
  const appendSessions = useCallback((newSessions: ParsedSession[]) => {
    setSessions(prev => {
        const existingKeys = new Set(prev.map(s => `${s.target}-${s.sessionId}-${s.date}`));
        const uniqueNew = newSessions.filter(s => !existingKeys.has(`${s.target}-${s.sessionId}-${s.date}`));
        return [...prev, ...uniqueNew];
    });
  }, []);

  // ------------------------------------------------------
  // DELETE SESSIONS HANDLER
  // ------------------------------------------------------
  const handleDeleteSessions = useCallback((idsToRemove: string[]) => {
      if (idsToRemove.length === 0) return;
      
      const confirmMessage = idsToRemove.length === 1 
        ? "Tem a certeza que deseja eliminar este registo? Esta ação remove-o da visualização atual."
        : `Tem a certeza que deseja eliminar ${idsToRemove.length} registos? Esta ação remove-os da visualização atual.`;

      if (window.confirm(confirmMessage)) {
          setSessions(prev => prev.filter(s => !idsToRemove.includes(s.sessionId)));
      }
  }, []);

  // ------------------------------------------------------
  // DELETE FILES HANDLER (Bulk)
  // ------------------------------------------------------
  const handleDeleteFiles = useCallback((fileNames: string[]) => {
      if (fileNames.length === 0) return;

      // Filter sessions belonging to these files
      const sessionsToDelete = sessions.filter(s => fileNames.includes(s.sourceFileName));
      const count = sessionsToDelete.length;

      const confirmMessage = fileNames.length === 1
          ? `Tem a certeza que deseja eliminar o ficheiro "${fileNames[0]}" e todos os seus ${count} registos?`
          : `Tem a certeza que deseja eliminar ${fileNames.length} ficheiros e um total de ${count} registos associados?`;

      if (window.confirm(confirmMessage)) {
          setSessions(prev => prev.filter(s => !fileNames.includes(s.sourceFileName)));
          
          // Cleanup registries to free memory
          fileNames.forEach(fileName => {
              if (fileRegistry.current.has(fileName)) fileRegistry.current.delete(fileName);
              if (sourceBufferRegistry.current.has(fileName)) sourceBufferRegistry.current.delete(fileName);
          });
      }
  }, [sessions]);

  // ------------------------------------------------------
  // ASSET RETRIEVAL (Lazy)
  // ------------------------------------------------------
  const handleGetAsset = useCallback(async (session: ParsedSession, type: 'pdf' | 'docx'): Promise<string | null> => {
      // 1. If URL already exists, return it
      if (type === 'pdf' && session.pdfUrl) return session.pdfUrl;
      if (type === 'docx' && session.docxUrl) return session.docxUrl;

      const path = type === 'pdf' ? session.pdfPath : session.docxPath;
      if (!path) return null;

      try {
          // 2. Check ZIP Registry
          if (session.zipSourceId && zipRegistry.current.has(session.zipSourceId)) {
              const zip = zipRegistry.current.get(session.zipSourceId);
              if (zip) {
                  // Try exact path
                  let file = zip.file(path);
                  // Try case-insensitive fallback
                  if (!file) {
                      const simpleName = path.split('/').pop();
                      if (simpleName) {
                          const matches = zip.file(new RegExp(simpleName.replace('.', '\\.'), 'i'));
                          if (matches.length) file = matches[0];
                      }
                  }

                  if (file) {
                      const rawBlob = await file.async('blob');
                      // CRITICAL FIX: Explicitly set MIME type for the Blob. 
                      // Without this, browsers treat it as 'application/octet-stream' and won't render inside iframe.
                      const mimeType = type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                      const blob = new Blob([rawBlob], { type: mimeType });

                      const url = URL.createObjectURL(blob);
                      
                      // Cache it locally in the session object (mutation is okay here for cache)
                      if (type === 'pdf') session.pdfUrl = url;
                      if (type === 'docx') session.docxUrl = url;
                      return url;
                  }
              }
          }

          // 3. Check File Registry (for Folder uploads)
          // Try to match the path or filename in the file registry
          const simpleName = path.split('/').pop() || "";
          
          // Search strategies
          let foundFile: File | undefined;
          
          // Exact path match
          if (fileRegistry.current.has(path)) foundFile = fileRegistry.current.get(path);
          // Simple name match
          if (!foundFile && fileRegistry.current.has(simpleName)) foundFile = fileRegistry.current.get(simpleName);
          
          if (foundFile) {
              const url = URL.createObjectURL(foundFile);
               if (type === 'pdf') session.pdfUrl = url;
               if (type === 'docx') session.docxUrl = url;
              return url;
          }

      } catch (e) {
          console.error("Error retrieving asset lazy:", e);
      }
      return null;
  }, []);

  // ------------------------------------------------------
  // SAVE PROJECT (Full Export)
  // ------------------------------------------------------
  const handleSaveProject = useCallback(async () => {
      setStatus({ step: 'GENERATING', message: 'A guardar Projeto Completo...', progress: 10 });
      try {
          const blob = await generateOutputPackage(sessions, sourceBufferRegistry.current, { savedTags, aliasMap });
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Projeto_LegalTranscript_${new Date().toISOString().slice(0,10)}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          setStatus({ step: 'IDLE', message: '', progress: 0 });
      } catch (e: any) {
          console.error(e);
          setStatus({ step: 'ERROR', message: 'Erro ao guardar projeto', error: e.message, progress: 0 });
      }
  }, [sessions, savedTags, aliasMap]);


  // ------------------------------------------------------
  // UNIFIED UPLOAD HANDLER
  // ------------------------------------------------------
  const handleUniversalUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setDownloadUrl(null);
    setStats(null);
    
    const pdfFiles: File[] = [];
    const zipFiles: File[] = [];
    const manifestFiles: File[] = [];

    // Register raw files immediately for folder uploads
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const nameLower = file.name.toLowerCase();
        
        // Add to registry for potential lookup
        fileRegistry.current.set(file.name, file);
        if (file.webkitRelativePath) {
             fileRegistry.current.set(file.webkitRelativePath, file);
        }

        if (nameLower.endsWith('.pdf')) {
            pdfFiles.push(file);
            // Store buffer for potential re-export
            const buff = await file.arrayBuffer();
            sourceBufferRegistry.current.set(file.name, buff);
        } else if (nameLower.endsWith('.zip')) {
            zipFiles.push(file);
        } else if (nameLower.endsWith('manifest.json')) {
            manifestFiles.push(file);
        }
    }

    try {
        let newLoadedSessions: ParsedSession[] = [];
        let projectLoaded = false;

        // 1. HANDLE ZIPS (Lazy Load)
        if (zipFiles.length > 0) {
            setStatus({ step: 'LOADING_ZIP', message: 'A ler estrutura do ZIP (Metadados)...', progress: 10 });
            
            for (const zipFile of zipFiles) {
                try {
                    // Unique ID for this zip instance
                    const zipId = `zip_${Date.now()}_${zipFile.name}`;
                    
                    // Load ZIP structure (this is fast, doesn't decompress content yet)
                    const zip = await JSZip.loadAsync(zipFile);
                    
                    // Store in registry
                    zipRegistry.current.set(zipId, zip);

                    // Check for PROJECT.JSON (Full State)
                    let projectFile = zip.file('project.json');
                    if (projectFile) {
                        const jsonStr = await projectFile.async('string');
                        const projectData: ProjectData = JSON.parse(jsonStr);
                        
                        // Restore State
                        setSavedTags(prev => [...prev, ...projectData.savedTags]);
                        setAliasMap(prev => ({ ...prev, ...projectData.aliasMap }));
                        
                        const taggedSessions = projectData.sessions.map(s => ({
                            ...s,
                            zipSourceId: zipId
                        }));
                        newLoadedSessions.push(...taggedSessions);
                        projectLoaded = true;

                    } else {
                        // Fallback to MANIFEST.JSON
                        let manifestFile = zip.file('manifest.json');
                        if (!manifestFile) {
                            const foundFiles = zip.file(/manifest\.json$/i);
                            if (foundFiles.length > 0) manifestFile = foundFiles[0];
                        }

                        if (manifestFile) {
                            const jsonStr = await manifestFile.async('string');
                            const zipSessions: ParsedSession[] = JSON.parse(jsonStr);

                            const taggedSessions = zipSessions.map(s => ({
                                ...s,
                                zipSourceId: zipId
                            }));
                            
                            newLoadedSessions.push(...taggedSessions);
                        }
                    }
                } catch (e) {
                    console.error("Error reading zip", e);
                }
            }
        }

        // 2. HANDLE MANIFESTS (Folder Uploads)
        if (manifestFiles.length > 0) {
             for (const mFile of manifestFiles) {
                try {
                    const jsonStr = await mFile.text();
                    const folderSessions: ParsedSession[] = JSON.parse(jsonStr);
                    // No specific tag needed, handleGetAsset will look in fileRegistry
                    newLoadedSessions.push(...folderSessions);
                } catch (e) {
                    console.error("Error reading manifest", e);
                }
            }
        }

        // 3. HANDLE RAW PDFS (Processing)
        if (newLoadedSessions.length > 0) {
            appendSessions(newLoadedSessions);
            setStatus({ step: 'IDLE', message: '', progress: 0 });
            setMode('EXPLORER');
        } 
        
        // If processing new PDFs
        if (pdfFiles.length > 0 && newLoadedSessions.length === 0) {
             const totalFiles = pdfFiles.length;
             // sourceBuffers already populated in loop above
             const processedSessions: ParsedSession[] = [];

             for (let i = 0; i < totalFiles; i++) {
                const file = pdfFiles[i];
                const currentProgressBase = (i / totalFiles) * 70;
                setStatus({ step: 'READING', message: `[${i+1}/${totalFiles}] A ler PDF: ${file.name}...`, progress: currentProgressBase + 2 });

                const base64Data = await fileToBase64(file);
                
                setStatus({ step: 'ANALYZING', message: `[${i+1}/${totalFiles}] A analisar com IA: ${file.name}...`, progress: currentProgressBase + 5 });

                const parsed = await parseDocumentWithGemini(base64Data, file.name);
                processedSessions.push(...parsed);
             }

             if (processedSessions.length > 0) {
                 setStatus({ step: 'GENERATING', message: `A gerar pacote inicial...`, progress: 80 });

                 // Initial Generation (without custom aliases yet)
                 const zipBlob = await generateOutputPackage(processedSessions, sourceBufferRegistry.current);
                 const url = URL.createObjectURL(zipBlob);
                 setDownloadUrl(url);
                 setStats({ 
                    sessions: processedSessions.length, 
                    fileName: totalFiles > 1 ? `Pacote_Multiplo_${totalFiles}_Ficheiros` : pdfFiles[0].name 
                 });

                 // For the newly processed batch, we can register the result ZIP for lazy loading too
                 const newZip = await JSZip.loadAsync(zipBlob);
                 const newZipId = `generated_${Date.now()}`;
                 zipRegistry.current.set(newZipId, newZip);

                 const hydrated = processedSessions.map(s => {
                     const sanitize = (str: string) => str.replace(/[^a-z0-9à-úÀ-Ú\s\-_.]/gi, '_').trim();
                     const base = `${sanitize(s.target)}-${sanitize(s.sessionId)}-${sanitize(s.date)}`;
                     return {
                        ...s,
                        fileNameBase: base,
                        zipSourceId: newZipId, // Tag with new zip
                        pdfPath: `Original-${sanitize(s.target)}/${base}.pdf`,
                        docxPath: `Editavel-${sanitize(s.target)}/${base}.docx`
                     };
                 });

                 appendSessions(hydrated);
                 setStatus({ step: 'COMPLETED', message: 'Concluído!', progress: 100 });
                 
                 if (mode === 'EXPLORER') {
                     setTimeout(() => setStatus({ step: 'IDLE', message: '', progress: 0 }), 2000);
                 } else {
                     setMode('PROCESSOR');
                 }
             }
        }

    } catch (error: any) {
        console.error(error);
        setStatus({ step: 'ERROR', message: 'Erro no carregamento.', error: error.message, progress: 0 });
    }
  }, [appendSessions, mode]);

  const handleNewProcess = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMode('PROCESSOR');
      handleUniversalUpload(e);
  };

  const handleExplorerLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleUniversalUpload(e);
  };


  // -- RENDERERS --

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
        <div className="text-center max-w-2xl mx-auto mb-4">
            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Legal<span className="text-blue-600">Transcript</span> AI
            </h1>
            <p className="text-xl text-slate-600">
            A ferramenta inteligente para gestão de escutas e transcrições.
            </p>
        </div>

        {/* RESUME BUTTON IF DATA EXISTS */}
        {sessions.length > 0 && (
            <button 
                onClick={() => setMode('EXPLORER')}
                className="group relative px-8 py-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all transform hover:-translate-y-1 w-full max-w-md flex items-center justify-between border border-slate-700"
            >
                <div className="text-left">
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Trabalho em Curso</div>
                    <div className="text-xl font-bold">Retomar Explorador</div>
                    <div className="text-sm text-slate-400">{sessions.length} registos carregados</div>
                </div>
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <i className="fa-solid fa-arrow-right text-xl"></i>
                </div>
            </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
            {/* New Process Card */}
            <div className="group bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 cursor-pointer transition-all transform hover:-translate-y-1 flex flex-col items-center text-center relative">
                <input type="file" accept=".pdf" multiple onChange={handleNewProcess} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-wand-magic-sparkles text-3xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Novo Processo</h3>
                <p className="text-slate-500">
                    Carregar PDFs "brutos". <br/>
                    <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded mt-2 inline-block">Suporta Múltiplos Ficheiros</span>
                </p>
            </div>

            {/* Load Project Card */}
            <div className="relative group bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 transition-all transform hover:-translate-y-1 flex flex-col items-center text-center overflow-hidden">
                <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-folder-open text-3xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Explorar / Carregar</h3>
                <p className="text-slate-500 mb-6">Carregue Projetos ZIP, pastas ou PDFs.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full z-20">
                    <label className="flex flex-col items-center justify-center px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg cursor-pointer transition-colors border border-purple-200">
                         <span className="text-sm font-bold"><i className="fa-solid fa-file-zipper mr-2"></i>Projeto ZIP</span>
                         <input type="file" accept=".zip,.pdf" multiple onChange={handleExplorerLoad} className="hidden"/>
                    </label>
                    <label 
                        className="flex flex-col items-center justify-center px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors border border-slate-200"
                        onClick={() => folderInputRef.current?.click()}
                    >
                         <span className="text-sm font-bold"><i className="fa-regular fa-folder-open mr-2"></i>Pasta</span>
                         <input ref={folderInputRef} type="file" multiple onChange={handleExplorerLoad} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} />
                    </label>
                </div>
            </div>
        </div>
        
         <button onClick={() => setShowHelp(true)} className="mt-4 text-sm text-slate-400 hover:text-blue-600 font-medium flex items-center gap-2">
          <i className="fa-solid fa-gear"></i> Configurar API Key
        </button>

         <div className="w-full max-w-xl">
             <ProcessingUI status={status} />
        </div>
    </div>
  );

  const renderProcessor = () => (
     <div className="w-full max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <button onClick={() => setMode('HOME')} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
                <i className="fa-solid fa-arrow-left"></i> Voltar
            </button>
            <h2 className="text-2xl font-bold text-slate-800">Processamento de PDF</h2>
            <div className="w-20"></div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 sm:p-12 text-center bg-slate-50/50">
          {!downloadUrl ? (
            <div className="space-y-6">
               {status.step !== 'IDLE' && status.step !== 'ERROR' ? (
                   <div className="text-slate-500">A processar...</div>
               ) : (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 hover:bg-blue-50 hover:border-blue-400 transition-all group cursor-pointer relative">
                    <input type="file" accept=".pdf" multiple onChange={handleNewProcess} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-file-pdf text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Carregar PDF(s) Original(ais)</h3>
                </div>
               )}
            </div>
          ) : (
            <div className="py-8 animate-fade-in">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-check text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Processamento Concluído!</h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <a href={downloadUrl} download={`${stats?.fileName}.zip`} className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">
                    <i className="fa-solid fa-file-zipper"></i> Descarregar ZIP
                </a>
                <button onClick={() => setMode('EXPLORER')} className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold shadow-sm transition-all">
                    <i className="fa-solid fa-magnifying-glass"></i> Explorar Resultados
                </button>
              </div>
              <button onClick={() => { setDownloadUrl(null); setStatus({ step: 'IDLE', message: '', progress: 0 }); }} className="block mx-auto mt-6 text-slate-400 hover:text-slate-600 text-sm font-medium">Processar outros ficheiros</button>
            </div>
          )}
        </div>
      </div>
      <ProcessingUI status={status} />
     </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {mode === 'HOME' && renderHome()}
      {mode === 'PROCESSOR' && renderProcessor()}
      {mode === 'EXPLORER' && (
        <Explorer 
            sessions={sessions} 
            onBack={() => setMode('HOME')} 
            onImport={handleExplorerLoad} 
            onGetAsset={handleGetAsset}
            // State passed down
            savedTags={savedTags}
            setSavedTags={setSavedTags}
            aliasMap={aliasMap}
            setAliasMap={setAliasMap}
            onSaveProject={handleSaveProject}
            onDeleteSessions={handleDeleteSessions}
            onDeleteFiles={handleDeleteFiles}
        />
      )}
      {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default App;