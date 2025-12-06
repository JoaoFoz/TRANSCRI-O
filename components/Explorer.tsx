import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ParsedSession, SavedTag, AliasMap } from '../types';

interface ExplorerProps {
  sessions: ParsedSession[];
  onBack: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGetAsset: (session: ParsedSession, type: 'pdf' | 'docx') => Promise<string | null>;
  
  // Persistent State
  savedTags: SavedTag[];
  setSavedTags: React.Dispatch<React.SetStateAction<SavedTag[]>>;
  aliasMap: AliasMap;
  setAliasMap: React.Dispatch<React.SetStateAction<AliasMap>>;
  onSaveProject: () => void;
  
  // Delete Handler
  onDeleteSessions: (sessionIds: string[]) => void;
  onDeleteFiles: (fileNames: string[]) => void;
}

// --- IMPORT DATA MODAL ---
interface ImportModalProps {
    onClose: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    sessions: ParsedSession[];
    onDeleteFiles: (fileNames: string[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, sessions, onDeleteFiles }) => {
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'import' | 'manage'>('import');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    const loadedFiles = useMemo(() => {
        const counts: Record<string, number> = {};
        sessions.forEach(s => {
            const name = s.sourceFileName || 'Desconhecido';
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [sessions]);

    const toggleFile = (name: string) => {
        const newSet = new Set(selectedFiles);
        if (newSet.has(name)) newSet.delete(name);
        else newSet.add(name);
        setSelectedFiles(newSet);
    };

    const toggleAllFiles = () => {
        if (selectedFiles.size === loadedFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(loadedFiles.map(f => f.name)));
        }
    };

    const handleBulkDelete = () => {
        onDeleteFiles(Array.from(selectedFiles));
        setSelectedFiles(new Set());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Gestão de Dados</h3>
                        <p className="text-sm text-slate-500">Adicionar novos dados ou gerir ficheiros existentes.</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 bg-white">
                    <button 
                        onClick={() => setActiveTab('import')}
                        className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === 'import' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-cloud-arrow-up mr-2"></i>Importar
                    </button>
                    <button 
                        onClick={() => setActiveTab('manage')}
                        className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === 'manage' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <i className="fa-regular fa-folder-open mr-2"></i>Ficheiros Carregados
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {activeTab === 'import' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Option 1: PDF Raw */}
                            <label className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50 rounded-xl cursor-pointer transition-all">
                                <input type="file" accept=".pdf" multiple onChange={(e) => { onImport(e); onClose(); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="w-14 h-14 bg-white text-blue-500 rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-file-pdf text-2xl"></i>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">Novos PDFs</h4>
                                <p className="text-xs text-center text-slate-500">Processar documentos originais (Escutas/SMS)</p>
                            </label>

                            {/* Option 2: Folder */}
                            <div 
                                onClick={() => folderInputRef.current?.click()}
                                className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-yellow-200 hover:border-yellow-500 bg-yellow-50/30 hover:bg-yellow-50 rounded-xl cursor-pointer transition-all"
                            >
                                <input ref={folderInputRef} type="file" multiple onChange={(e) => { onImport(e); onClose(); }} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} />
                                <div className="w-14 h-14 bg-white text-yellow-500 rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-regular fa-folder-open text-2xl"></i>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">Pasta Já Tratada</h4>
                                <p className="text-xs text-center text-slate-500">Importar ficheiros JSON e PDFs de uma pasta</p>
                            </div>

                            {/* Option 3: ZIP Project */}
                            <label className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-200 hover:border-purple-500 bg-purple-50/30 hover:bg-purple-50 rounded-xl cursor-pointer transition-all">
                                <input type="file" accept=".zip" multiple onChange={(e) => { onImport(e); onClose(); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="w-14 h-14 bg-white text-purple-500 rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-file-zipper text-2xl"></i>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1">Projeto ZIP</h4>
                                <p className="text-xs text-center text-slate-500">Restaurar um backup completo (Project.json)</p>
                            </label>
                        </div>
                    ) : (
                        // MANAGE FILES TAB
                        <div className="space-y-4">
                             {loadedFiles.length === 0 ? (
                                 <div className="text-center py-10 text-slate-400 italic">Nenhum ficheiro carregado.</div>
                             ) : (
                                 <div className="flex flex-col gap-3">
                                     {/* BULK HEADER */}
                                     <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border border-slate-200">
                                         <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={loadedFiles.length > 0 && selectedFiles.size === loadedFiles.length}
                                                onChange={toggleAllFiles}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className="text-sm font-bold text-slate-700">Selecionar Tudo ({loadedFiles.length})</span>
                                         </label>
                                         
                                         {selectedFiles.size > 0 && (
                                             <button 
                                                 onClick={handleBulkDelete}
                                                 className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                                             >
                                                 <i className="fa-solid fa-trash"></i> Eliminar Selecionados ({selectedFiles.size})
                                             </button>
                                         )}
                                     </div>

                                     {/* FILE LIST */}
                                     <div className="grid grid-cols-1 gap-2">
                                     {loadedFiles.map((f) => {
                                         const isSelected = selectedFiles.has(f.name);
                                         return (
                                         <div key={f.name} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                             <div className="flex items-center gap-3 overflow-hidden">
                                                 <div className="pl-1">
                                                     <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        onChange={() => toggleFile(f.name)}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                     />
                                                 </div>
                                                 <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                                     <i className={`fa-solid ${f.name.endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-lines'} text-lg`}></i>
                                                 </div>
                                                 <div className="min-w-0">
                                                     <div className="font-bold text-slate-700 truncate text-sm" title={f.name}>{f.name}</div>
                                                     <div className="text-xs text-slate-500">{f.count} registos associados</div>
                                                 </div>
                                             </div>
                                             <button 
                                                 onClick={() => onDeleteFiles([f.name])}
                                                 className="w-8 h-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                                                 title="Eliminar este ficheiro"
                                             >
                                                 <i className="fa-solid fa-trash text-sm"></i>
                                             </button>
                                         </div>
                                     )})}
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>

                {activeTab === 'import' && (
                    <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">
                        Os dados importados serão <strong>adicionados</strong> à lista existente sem apagar o que já está visível.
                    </div>
                )}
            </div>
        </div>
    );
};

// --- IDENTITY MERGE MODAL ---

interface IdentityManagerProps {
    rawIdentities: string[];
    aliasMap: AliasMap;
    onSave: (newMap: AliasMap) => void;
    onClose: () => void;
}

const IdentityManager: React.FC<IdentityManagerProps> = ({ rawIdentities, aliasMap, onSave, onClose }) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [targetName, setTargetName] = useState('');
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'names' | 'numbers'>('names');

    const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    
    const handleMerge = () => {
        if (!targetName.trim() || selected.length === 0) return;
        const newMap = { ...aliasMap };
        selected.forEach(id => newMap[id] = targetName);
        onSave(newMap);
        setSelected([]);
        setTargetName('');
    };

    // Helper to detect if string is mostly numeric
    const isNumber = (str: string) => /^[\d\s\-\+\(\).]+$/.test(str);

    const filteredIdentities = useMemo(() => {
        return rawIdentities.filter(id => {
            const matchesFilter = id.toLowerCase().includes(filter.toLowerCase());
            const matchesType = activeTab === 'numbers' ? isNumber(id) : !isNumber(id);
            return matchesFilter && matchesType;
        });
    }, [rawIdentities, filter, activeTab]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Gerir Identidades (Unificar)</h3>
                    <button onClick={onClose}><i className="fa-solid fa-xmark text-slate-400 hover:text-slate-600"></i></button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button 
                        onClick={() => { setActiveTab('names'); setSelected([]); }}
                        className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === 'names' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-user-tag mr-2"></i>Intervenientes
                    </button>
                    <button 
                        onClick={() => { setActiveTab('numbers'); setSelected([]); }}
                        className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === 'numbers' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-hashtag mr-2"></i>Números
                    </button>
                </div>

                <div className="p-4 bg-slate-100 border-b border-slate-200 flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Novo Nome/Número Unificado</label>
                        <input 
                            type="text" 
                            value={targetName} 
                            onChange={e => setTargetName(e.target.value)} 
                            placeholder={activeTab === 'names' ? "Ex: André Magalhães" : "Ex: 910000000"} 
                            className="w-full px-3 py-2 rounded border border-slate-300 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                    </div>
                    <button onClick={handleMerge} disabled={selected.length === 0 || !targetName} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-sm h-[38px]">
                        Unificar ({selected.length})
                    </button>
                </div>
                <div className="p-2 border-b bg-white">
                    <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar lista..." className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded text-slate-700" />
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50">
                    {filteredIdentities.length === 0 && <div className="col-span-2 text-center py-8 text-slate-400 text-sm">Nenhum item encontrado.</div>}
                    {filteredIdentities.map(id => {
                        const alias = aliasMap[id];
                        return (
                        <div key={id} onClick={() => toggle(id)} className={`p-2 rounded border cursor-pointer text-sm flex justify-between items-center ${selected.includes(id) ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            <div className="truncate pr-2">
                                <div className="font-medium text-slate-700">{id}</div>
                                {alias && <div className="text-[10px] text-green-600 font-bold flex items-center gap-1"><i className="fa-solid fa-arrow-right"></i> {alias}</div>}
                            </div>
                            {selected.includes(id) && <i className="fa-solid fa-check text-blue-600"></i>}
                        </div>
                    )})}
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end bg-white rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-medium hover:bg-slate-200">Fechar</button>
                </div>
            </div>
        </div>
    );
};

// --- SEARCH LOGIC HELPERS ---

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, 
        matrix[j - 1][i] + 1, 
        matrix[j - 1][i - 1] + indicator 
      );
    }
  }
  return matrix[b.length][a.length];
};

const matchTerm = (contentNormalized: string, term: string): boolean => {
  const termNorm = normalizeText(term);
  if (contentNormalized.includes(termNorm)) return true;
  if (termNorm.length > 3 && !termNorm.includes(' ')) {
      const words = contentNormalized.split(/\W+/);
      const threshold = termNorm.length <= 5 ? 1 : 2;
      for (const word of words) {
          if (Math.abs(word.length - termNorm.length) > threshold) continue;
          if (getLevenshteinDistance(word, termNorm) <= threshold) return true;
      }
  }
  return false;
};

const evaluateBooleanQuery = (content: string, query: string): boolean => {
  if (!query.trim()) return true;
  const normalizedContent = normalizeText(content);
  const regex = /"([^"]+)"|(\(|\)|OR|AND|NOT|\+|\-)|([^\s\(\)"\+\-]+)/gi;
  const tokens = [];
  let match;
  while ((match = regex.exec(query)) !== null) {
      if (match[1]) tokens.push({ type: 'TERM', value: match[1] });
      else if (match[2]) tokens.push({ type: 'OP', value: match[2].toUpperCase() });
      else if (match[3]) tokens.push({ type: 'TERM', value: match[3] });
  }
  const outputQueue = [];
  const operatorStack = [];
  const precedence: Record<string, number> = { 'NOT': 3, '-': 3, 'AND': 2, '+': 2, 'OR': 1, '(': 0 };

  for (const token of tokens) {
      if (token.type === 'TERM') {
          outputQueue.push(token);
      } else if (token.type === 'OP') {
          if (token.value === '(') {
              operatorStack.push(token.value);
          } else if (token.value === ')') {
              while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
                  outputQueue.push({ type: 'OP', value: operatorStack.pop() });
              }
              operatorStack.pop();
          } else {
              while (
                  operatorStack.length > 0 &&
                  precedence[operatorStack[operatorStack.length - 1]] >= precedence[token.value]
              ) {
                  outputQueue.push({ type: 'OP', value: operatorStack.pop() });
              }
              operatorStack.push(token.value);
          }
      }
  }
  while (operatorStack.length > 0) outputQueue.push({ type: 'OP', value: operatorStack.pop() });

  const evalStack: boolean[] = [];
  for (const token of outputQueue) {
      if (token.type === 'TERM') {
          evalStack.push(matchTerm(normalizedContent, token.value as string));
      } else {
          const op = token.value;
          if (op === 'NOT' || op === '-') {
              const a = evalStack.pop();
              evalStack.push(!a);
          } else {
              const b = evalStack.pop() || false;
              const a = evalStack.pop() || false;
              if (op === 'AND' || op === '+') evalStack.push(a && b);
              else if (op === 'OR') evalStack.push(a || b);
          }
      }
  }
  return evalStack.length > 0 ? evalStack[0] : false;
};

// --- DURATION HELPER ---
const parseDurationToSeconds = (dur: string | undefined): number => {
    if (!dur) return 0;
    // Expected format HH:mm:ss or mm:ss
    const parts = dur.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
};

// --- MULTI-SELECT ---
const MultiSelectDropdown: React.FC<{
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}> = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
    const toggleOption = (opt: string) => selected.includes(opt) ? onChange(selected.filter(s => s !== opt)) : onChange([...selected, opt]);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{label}</label>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 text-slate-700">
                <span className="truncate">{selected.length === 0 ? 'Todos' : `${selected.length} selecionado(s)`}</span>
                <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 flex flex-col">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative"><i className="fa-solid fa-magnifying-glass absolute left-2 top-2 text-slate-300 text-xs"></i>
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar..." className="w-full pl-7 pr-2 py-1 bg-white text-slate-800 border border-slate-200 rounded text-xs focus:outline-none" autoFocus />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                        {filteredOptions.length === 0 && <div className="p-2 text-xs text-slate-400 text-center">Nada encontrado</div>}
                        {filteredOptions.map(opt => (
                            <label key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer group">
                                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} className="rounded border-slate-300 text-blue-600 bg-white accent-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-slate-700 group-hover:text-blue-700 truncate" title={opt}>{opt}</span>
                            </label>
                        ))}
                    </div>
                    {selected.length > 0 && <button onClick={() => onChange([])} className="p-2 text-xs text-center text-red-500 hover:bg-red-50 font-medium border-t border-slate-100">Limpar Seleção</button>}
                </div>
            )}
        </div>
    );
};

// --- MAIN EXPLORER COMPONENT ---

const Explorer: React.FC<ExplorerProps> = ({ sessions, onBack, onImport, onGetAsset, savedTags, setSavedTags, aliasMap, setAliasMap, onSaveProject, onDeleteSessions, onDeleteFiles }) => {
  const [inputSession, setInputSession] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [inputDateStart, setInputDateStart] = useState('');
  const [inputDateEnd, setInputDateEnd] = useState('');
  const [inputTimeStart, setInputTimeStart] = useState('');
  const [inputTimeEnd, setInputTimeEnd] = useState('');
  const [inputMinDuration, setInputMinDuration] = useState(''); // Min seconds
  const [inputMaxDuration, setInputMaxDuration] = useState(''); // Max seconds
  
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  
  // Selection States
  const [manualSelection, setManualSelection] = useState<Set<string>>(new Set());
  const [viewOnlySelected, setViewOnlySelected] = useState(false);

  // Saved Tags System
  const [tagName, setTagName] = useState('');
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  
  // Tag Editing State
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');

  // Modals
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    session: '', content: '', dateStart: '', dateEnd: '', timeStart: '', timeEnd: '', targets: [] as string[], speakers: [] as string[], minDuration: '', maxDuration: ''
  });
  
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null);

  // Helper to resolve alias
  const resolve = (val: string | undefined): string | undefined => {
      if (!val) return undefined;
      return aliasMap[val] || val;
  };

  // --- AGGREGATE DROPDOWN DATA ---
  const { allNumbers, allSpeakers, rawIdentities } = useMemo(() => {
      const numbers = new Set<string>();
      const speakers = new Set<string>();
      const rawSet = new Set<string>();

      sessions.forEach(s => {
          if (s.target) {
              const val = s.target;
              rawSet.add(val);
              numbers.add(resolve(val)!);
          }
          if (s.sourceNumber) {
              rawSet.add(s.sourceNumber);
              numbers.add(resolve(s.sourceNumber)!);
          }
          if (s.destinationNumber) {
              rawSet.add(s.destinationNumber);
              numbers.add(resolve(s.destinationNumber)!);
          }

          if (s.sourceName) {
              rawSet.add(s.sourceName);
              speakers.add(resolve(s.sourceName)!);
          }
          if (s.destinationName) {
              rawSet.add(s.destinationName);
              speakers.add(resolve(s.destinationName)!);
          }
          
          // Fallback regex scan for speakers in text
          const lines = s.content.split('\n');
          lines.forEach(line => {
             const match = line.match(/^([A-ZÀ-Ú][a-zà-ú0-9_\-\s]{1,30}):/);
             if (match) {
                 const name = match[1].trim();
                 rawSet.add(name);
                 speakers.add(resolve(name)!);
             }
          });
      });

      return {
          allNumbers: Array.from(numbers).sort(),
          allSpeakers: Array.from(speakers).sort(),
          rawIdentities: Array.from(rawSet).sort()
      };
  }, [sessions, aliasMap]);


  const handleSearch = () => {
    setActiveFilters({
        session: inputSession, content: inputContent, dateStart: inputDateStart, dateEnd: inputDateEnd, timeStart: inputTimeStart, timeEnd: inputTimeEnd, targets: selectedTargets, speakers: selectedSpeakers, minDuration: inputMinDuration, maxDuration: inputMaxDuration
    });
  };

  const handleClearFilters = () => {
      setInputSession(''); setInputContent(''); setInputDateStart(''); setInputDateEnd(''); setInputTimeStart(''); setInputTimeEnd(''); setInputMinDuration(''); setInputMaxDuration('');
      setSelectedTargets([]); setSelectedSpeakers([]); setManualSelection(new Set()); setViewOnlySelected(false);
      // Clear Active Tags as well
      setActiveTagIds([]);
      setActiveFilters({ session: '', content: '', dateStart: '', dateEnd: '', timeStart: '', timeEnd: '', targets: [], speakers: [], minDuration: '', maxDuration: '' });
  };

  const parseDate = (dateStr: string) => {
    const parts = dateStr.split('.');
    return parts.length === 3 ? new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])) : null;
  };

  const isTimeInRange = (time: string | undefined, start: string, end: string) => {
    if (!time) return false;
    const t = time.substring(0, 5); 
    if (start && end) return start <= end ? (t >= start && t <= end) : (t >= start || t <= end);
    if (start) return t >= start;
    if (end) return t <= end;
    return true;
  };

  const filteredSessions = useMemo(() => {
    const { session: sessionF, content, dateStart, dateEnd, timeStart, timeEnd, targets, speakers, minDuration, maxDuration } = activeFilters;
    let baseSet = sessions;
    
    // 1. Context (Tag) Filter
    if (activeTagIds.length > 0) {
        const allowedIds = new Set<string>();
        savedTags.filter(t => activeTagIds.includes(t.id)).forEach(t => {
            t.sessionIds.forEach(id => allowedIds.add(id));
        });
        baseSet = sessions.filter(s => allowedIds.has(s.sessionId));
    }

    // 2. View Only Selected Filter
    if (viewOnlySelected) {
        baseSet = baseSet.filter(s => manualSelection.has(s.sessionId));
    }

    return baseSet.filter(s => {
      // Duration Filter (Min, Max, or Interval)
      if (minDuration || maxDuration) {
          if (s.type !== 'AUDIO') return false; // Exclude SMS if duration filter is active
          const durationSec = parseDurationToSeconds(s.duration);
          
          if (minDuration) {
             const minS = parseInt(minDuration, 10);
             if (!isNaN(minS) && durationSec < minS) return false;
          }
          if (maxDuration) {
             const maxS = parseInt(maxDuration, 10);
             if (!isNaN(maxS) && durationSec > maxS) return false;
          }
      }

      // Numbers Filter (Checks Target OR Source OR Dest) - Aliased check
      if (targets.length > 0) {
          // We check if the ALIASED value of the session number matches the selected filter
          const matches = [s.target, s.sourceNumber, s.destinationNumber].some(n => {
              if (!n) return false;
              const aliased = resolve(n);
              return aliased && targets.includes(aliased);
          });
          if (!matches) return false;
      }

      // Speakers Filter - Aliased check
      if (speakers.length > 0) {
          const names = [s.sourceName, s.destinationName];
          const metaMatch = names.some(n => {
              if (!n) return false;
              const aliased = resolve(n);
              return aliased && speakers.includes(aliased);
          });
          
          let contentMatch = false;
          if (!metaMatch) {
              // Inverse lookup for speakers
              const rawCandidates = rawIdentities.filter(raw => {
                  const aliased = resolve(raw);
                  return aliased && speakers.includes(aliased);
              });
              contentMatch = rawCandidates.some(raw => s.content.includes(`${raw}:`));
          }
          
          if (!metaMatch && !contentMatch) return false;
      }
      
      if (sessionF && !sessionF.split(',').some(t => s.sessionId.toLowerCase().includes(t.trim().toLowerCase()))) return false;
      if (content && !evaluateBooleanQuery(s.content, content)) return false;

      if (dateStart || dateEnd) {
        const d = parseDate(s.date);
        if (d && ((dateStart && d < new Date(dateStart)) || (dateEnd && d > new Date(dateEnd)))) return false;
      }
      if ((timeStart || timeEnd) && s.startTime && !isTimeInRange(s.startTime, timeStart, timeEnd)) return false;

      return true;
    });
  }, [sessions, activeFilters, activeTagIds, savedTags, viewOnlySelected, manualSelection, aliasMap, rawIdentities]);


  const saveTag = () => {
      if (!tagName.trim()) return alert("Dê um nome à etiqueta.");
      const idsToSave = manualSelection.size > 0 ? Array.from(manualSelection) : filteredSessions.map(s => s.sessionId);
      const desc = manualSelection.size > 0 ? `${idsToSave.length} itens (Seleção)` : `${idsToSave.length} itens (Filtro)`;
      
      const newTag: SavedTag = {
          id: Date.now().toString(),
          name: tagName,
          timestamp: Date.now(),
          sessionIds: idsToSave,
          filterDescription: desc
      };
      setSavedTags(prev => [newTag, ...prev]);
      setTagName(''); 
  };

  const deleteTag = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Tem a certeza que deseja eliminar esta etiqueta?")) {
          setSavedTags(prev => prev.filter(t => t.id !== id));
          if (activeTagIds.includes(id)) {
              setActiveTagIds(prev => prev.filter(tid => tid !== id));
          }
      }
  };

  // --- TAG EDITING HANDLERS ---
  const startEditingTag = (e: React.MouseEvent, tag: SavedTag) => {
      e.stopPropagation();
      setEditingTagId(tag.id);
      setEditTagName(tag.name);
  };

  const saveEditedTag = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!editTagName.trim()) return;
      setSavedTags(prev => prev.map(t => t.id === editingTagId ? { ...t, name: editTagName } : t));
      setEditingTagId(null);
      setEditTagName('');
  };

  const cancelEditingTag = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTagId(null);
      setEditTagName('');
  };

  const toggleTag = (id: string) => {
      if (editingTagId === id) return; // Prevent toggling while editing
      setActiveTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  // --- BULK ACTIONS ---
  const handleSelectAll = () => {
      const allIds = filteredSessions.map(s => s.sessionId);
      setManualSelection(new Set(allIds));
  };
  
  const handleDeselectAll = () => {
      setManualSelection(new Set());
  };
  
  const handleBulkDelete = () => {
      if (manualSelection.size === 0) return;
      onDeleteSessions(Array.from(manualSelection));
      setManualSelection(new Set()); // Clear selection after delete logic triggers
  };

  const handleOpenPdf = async (session: ParsedSession) => {
      if (loadingPdf) return;
      setLoadingPdf(session.sessionId);
      try {
          const url = await onGetAsset(session, 'pdf');
          url ? window.open(url, '_blank') : alert("PDF não encontrado.");
      } catch (e) { alert("Erro ao abrir PDF."); } finally { setLoadingPdf(null); }
  };

  // --- CUSTOM DURATION INPUT RENDERER ---
  const renderDurationInput = (value: string, setValue: (v: string) => void, placeholder: string) => {
    const adjust = (delta: number) => {
        const current = value === '' ? 0 : parseInt(value, 10);
        if (isNaN(current)) {
            setValue(delta > 0 ? delta.toString() : '0');
        } else {
            setValue(Math.max(0, current + delta).toString());
        }
    };

    return (
        <div className="relative">
            <input 
                type="number" 
                min="0"
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder={placeholder}
                className="w-full pl-3 pr-8 py-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            />
            <div className="absolute right-1 top-1 bottom-1 flex flex-col w-5 gap-px">
                <button 
                    onClick={() => adjust(1)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-t-sm flex items-center justify-center transition-colors border border-slate-200"
                >
                    <i className="fa-solid fa-caret-up text-[8px] leading-none"></i>
                </button>
                <button 
                    onClick={() => adjust(-1)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-b-sm flex items-center justify-center transition-colors border border-slate-200"
                >
                     <i className="fa-solid fa-caret-down text-[8px] leading-none"></i>
                </button>
            </div>
        </div>
    );
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 bg-slate-50 min-h-screen font-sans flex flex-col">
      {showAliasModal && (
          <IdentityManager 
              rawIdentities={rawIdentities} 
              aliasMap={aliasMap} 
              onSave={setAliasMap} 
              onClose={() => setShowAliasModal(false)} 
          />
      )}
      {showImportModal && (
          <ImportModal 
            onClose={() => setShowImportModal(false)}
            onImport={onImport}
            sessions={sessions}
            onDeleteFiles={onDeleteFiles}
          />
      )}

      {/* REFINED HEADER */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4 mb-6 flex flex-col xl:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
                  <i className="fa-solid fa-arrow-left"></i>
              </button>
              <div>
                  <h1 className="text-xl font-bold text-slate-800">Explorador de Sessões</h1>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-blue-600">{filteredSessions.length}</span> resultados de <span className="text-slate-700">{sessions.length}</span> totais
                  </p>
              </div>
          </div>

          <div className="flex items-center gap-3">
              <button onClick={() => setShowImportModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg transition-all font-bold text-sm flex items-center gap-2">
                  <i className="fa-solid fa-cloud-arrow-up"></i> Importar / Gerir
              </button>
              <button onClick={onSaveProject} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm flex items-center gap-2">
                  <i className="fa-solid fa-floppy-disk text-green-600"></i> Guardar Projeto
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* LEFT COLUMN: FILTERS */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar space-y-5">
            <h3 className="font-semibold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
                <i className="fa-solid fa-filter text-blue-500"></i> Filtros
            </h3>
            
            <button onClick={() => setShowAliasModal(true)} className="w-full py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-bold text-xs hover:bg-purple-100 mb-2 transition-colors flex items-center justify-center gap-2">
                <i className="fa-solid fa-users-gear"></i> Gerir Identidades
            </button>
            
            <MultiSelectDropdown label="Números (Unificados)" options={allNumbers} selected={selectedTargets} onChange={setSelectedTargets} />
            <MultiSelectDropdown label="Intervenientes (Unificados)" options={allSpeakers} selected={selectedSpeakers} onChange={setSelectedSpeakers} />
            
            <div><label className="text-xs font-bold text-slate-500 uppercase">ID Sessão</label><input type="text" value={inputSession} onChange={(e) => setInputSession(e.target.value)} className="w-full px-3 py-2 bg-white text-slate-800 border rounded-md text-sm" placeholder="Ex: 1450" /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Conteúdo</label><textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} rows={2} className="w-full px-3 py-2 bg-white text-slate-800 border rounded-md text-sm" placeholder="Pesquisa Booleana..." /></div>
            
            <div className="border-t pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Datas</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="date" value={inputDateStart} onChange={(e) => setInputDateStart(e.target.value)} className="bg-white text-slate-800 border rounded text-xs px-2 py-1" />
                    <input type="date" value={inputDateEnd} onChange={(e) => setInputDateEnd(e.target.value)} className="bg-white text-slate-800 border rounded text-xs px-2 py-1" />
                </div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Horário</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <input type="time" value={inputTimeStart} onChange={(e) => setInputTimeStart(e.target.value)} className="bg-white text-slate-800 border rounded text-xs px-2 py-1" />
                    <input type="time" value={inputTimeEnd} onChange={(e) => setInputTimeEnd(e.target.value)} className="bg-white text-slate-800 border rounded text-xs px-2 py-1" />
                </div>
                
                {/* DURATION FILTER (RANGE) */}
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Duração (segundos) [Áudio]</label>
                <div className="grid grid-cols-2 gap-2">
                    {renderDurationInput(inputMinDuration, setInputMinDuration, "Mín")}
                    {renderDurationInput(inputMaxDuration, setInputMaxDuration, "Máx")}
                </div>
            </div>

            <div className="pt-2 flex gap-2">
                <button onClick={handleSearch} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"><i className="fa-solid fa-search"></i> Pesquisar</button>
                <button onClick={handleClearFilters} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors" title="Limpar Filtros e Etiquetas"><i className="fa-solid fa-eraser"></i></button>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: RESULTS */}
        <div className="lg:col-span-6 flex flex-col gap-4">
            
            {/* BULK ACTIONS BAR */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                    >
                        <i className="fa-solid fa-check-double mr-1.5"></i> Selecionar Tudo ({filteredSessions.length})
                    </button>
                    {manualSelection.size > 0 && (
                        <button 
                            onClick={handleDeselectAll}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Limpar
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {manualSelection.size > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                        >
                            <i className="fa-solid fa-trash mr-1.5"></i> Eliminar ({manualSelection.size})
                        </button>
                    )}
                    <div className="text-xs text-slate-400 font-medium ml-1">
                        {manualSelection.size} selecionados
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 content-start">
            {filteredSessions.map((session, idx) => {
                const isSelected = manualSelection.has(session.sessionId);
                
                // Display Names (Resolved)
                const sourceDisplay = resolve(session.sourceName) || resolve(session.sourceNumber) || session.sourceNumber || "?";
                const destDisplay = resolve(session.destinationName) || resolve(session.destinationNumber) || session.destinationNumber || "?";
                
                return (
                <div key={`${session.sessionId}-${idx}`} className={`bg-white rounded-xl border shadow-sm flex flex-col h-[340px] relative group transition-all hover:shadow-md ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                    
                    {/* Checkbox moved to LEFT side */}
                    <div className="absolute top-3 left-3 z-20">
                        <div className="bg-white rounded border border-slate-200 shadow-sm p-1 flex items-center justify-center cursor-pointer hover:border-blue-400">
                            <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => setManualSelection(prev => { const n = new Set(prev); n.has(session.sessionId) ? n.delete(session.sessionId) : n.add(session.sessionId); return n; })} 
                                className="w-4 h-4 cursor-pointer bg-white accent-blue-600" 
                            />
                        </div>
                    </div>

                    {/* DELETE BUTTON (Individual) - Top Right */}
                    <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => onDeleteSessions([session.sessionId])}
                            className="w-7 h-7 bg-white rounded-full border border-slate-200 shadow-sm text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all"
                            title="Eliminar este registo"
                        >
                            <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                    
                    {/* Header */}
                    <div className="bg-slate-50 px-4 pl-10 py-3 border-b border-slate-100 rounded-t-xl">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-6">
                                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${session.type === 'SMS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{session.type}</span>
                                    <span className="font-mono text-xs text-slate-700 font-bold bg-white px-1.5 border border-slate-200 rounded">ID: {session.sessionId}</span>
                                    <span className="text-[10px] text-slate-500 font-medium bg-white px-1.5 border border-slate-200 rounded truncate max-w-[120px]" title={session.target}>Alvo: {session.target}</span>
                                </div>
                                {/* Source -> Dest Display */}
                                <div className="text-xs text-slate-800 leading-tight">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <i className="fa-solid fa-phone-volume text-[10px] text-green-600"></i> 
                                        <span className="font-bold truncate" title={sourceDisplay}>{sourceDisplay}</span> 
                                        {/* Show raw if alias exists and differs */}
                                        {session.sourceName && resolve(session.sourceName) !== session.sourceName && <span className="text-[10px] text-slate-400 truncate hidden sm:inline">({session.sourceName})</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 truncate">
                                        <i className="fa-solid fa-arrow-down text-[10px] text-slate-400 ml-0.5"></i>
                                        <span className="font-bold truncate" title={destDisplay}>{destDisplay}</span>
                                        {session.destinationName && resolve(session.destinationName) !== session.destinationName && <span className="text-[10px] text-slate-400 truncate hidden sm:inline">({session.destinationName})</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right text-xs text-slate-500 pt-0.5 shrink-0">
                                <div className="font-semibold text-slate-700">{session.date}</div>
                                <div className="font-mono bg-slate-100 px-1 rounded inline-block mb-0.5">{session.startTime}</div>
                                {/* DURATION DISPLAY */}
                                {session.duration && (
                                    <div className="font-mono text-[10px] text-slate-400 flex items-center justify-end gap-1" title="Duração">
                                        <i className="fa-regular fa-clock text-[9px]"></i> {session.duration}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 bg-white">
                        {session.content.split('\n').map((line, i) => {
                             const trimmed = line.trim();
                             if (!trimmed) return null;
                             
                             // Detect Speaker pattern: e.g., "Name:" or "Name (Info):"
                             const match = trimmed.match(/^([A-ZÀ-Úa-zà-ú0-9_\-\s\.()]+:)(.*)/);
                             
                             if (match) {
                                 // DO NOT USE ALIAS HERE, keep original text
                                 return (
                                     <div key={i} className="text-xs px-2 py-1 border-b border-slate-50 last:border-0 rounded bg-slate-50/50 text-slate-700">
                                         <span className="font-bold text-slate-900">{match[1]}</span>
                                         <span>{match[2]}</span>
                                     </div>
                                 );
                             } else {
                                 // Regular text
                                 return (
                                    <div key={i} className="text-xs px-2 py-1 border-b border-slate-50 last:border-0 rounded text-slate-600">
                                        {trimmed}
                                    </div>
                                 );
                             }
                        })}
                    </div>

                    <div className="px-4 py-2 bg-white border-t border-slate-100 rounded-b-xl">
                        <button onClick={() => handleOpenPdf(session)} disabled={!session.pdfPath && !session.pdfUrl} className="w-full text-xs font-bold py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                             {loadingPdf === session.sessionId ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-regular fa-file-pdf"></i> Ver Original</>}
                        </button>
                    </div>
                </div>
            )})}
            </div>
        </div>

        {/* RIGHT COLUMN: SAVED TAGS / CONTEXT */}
        <div className="lg:col-span-3 space-y-4">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                    <i className="fa-solid fa-bookmark text-yellow-500"></i> Criar Etiqueta
                </h3>
                
                <div className="flex flex-col gap-2 mb-3">
                    <button 
                        onClick={() => setViewOnlySelected(!viewOnlySelected)}
                        className={`w-full py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${viewOnlySelected ? 'bg-green-100 border-green-300 text-green-700 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                        {viewOnlySelected ? <><i className="fa-solid fa-eye"></i>A ver Seleção</> : <><i className="fa-regular fa-eye"></i>Ver Só Selecionados</>}
                    </button>
                    
                    {manualSelection.size > 0 && (
                        <button 
                            onClick={() => { setManualSelection(new Set()); setViewOnlySelected(false); }}
                            className="w-full py-2 text-xs font-bold rounded-lg border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-trash"></i>Limpar Seleção
                        </button>
                    )}
                </div>

                <div className="text-xs mb-2 text-slate-500 font-medium">
                    {manualSelection.size > 0 ? `Etiquetar ${manualSelection.size} selecionados` : `Etiquetar ${filteredSessions.length} filtrados`}
                </div>
                <div className="flex gap-2">
                    <input type="text" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Nome..." className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white transition-colors" />
                    <button onClick={saveTag} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors">Guardar</button>
                </div>
             </div>
             
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                 <div className="p-3 bg-slate-50 border-b border-slate-100 text-sm font-semibold flex justify-between items-center sticky top-0">
                     <span>Contexto (Etiquetas)</span>
                     {activeTagIds.length > 0 && <button onClick={() => setActiveTagIds([])} className="text-[10px] text-red-500 font-bold hover:underline">Limpar Filtro</button>}
                 </div>
                 {savedTags.length === 0 && <div className="p-8 text-xs text-slate-400 text-center italic">Nenhuma etiqueta guardada.</div>}
                 {savedTags.map(tag => {
                     const isActive = activeTagIds.includes(tag.id);
                     const isEditing = editingTagId === tag.id;
                     
                     return (
                     <div key={tag.id} className={`p-3 border-b border-slate-50 cursor-pointer flex items-center gap-3 hover:bg-blue-50 transition-colors group ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`} onClick={() => toggleTag(tag.id)}>
                         <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                             {isActive && <i className="fa-solid fa-check text-[10px]"></i>}
                         </div>
                         <div className="flex-1 min-w-0">
                             {isEditing ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        type="text" 
                                        value={editTagName} 
                                        onChange={(e) => setEditTagName(e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                                        autoFocus
                                    />
                                    <button onClick={saveEditedTag} className="text-green-600 hover:text-green-800"><i className="fa-solid fa-check"></i></button>
                                    <button onClick={cancelEditingTag} className="text-red-500 hover:text-red-700"><i className="fa-solid fa-xmark"></i></button>
                                </div>
                             ) : (
                                <>
                                    <div className="font-bold text-xs text-slate-700 truncate">{tag.name}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{tag.filterDescription}</div>
                                </>
                             )}
                         </div>
                         {!isEditing && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mr-1">{tag.sessionIds.length}</span>
                                <button 
                                    onClick={(e) => startEditingTag(e, tag)}
                                    className="w-5 h-5 rounded hover:bg-blue-100 text-slate-300 hover:text-blue-500 flex items-center justify-center transition-colors"
                                    title="Renomear Etiqueta"
                                >
                                    <i className="fa-solid fa-pen text-[10px]"></i>
                                </button>
                                <button 
                                    onClick={(e) => deleteTag(e, tag.id)}
                                    className="w-5 h-5 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors"
                                    title="Eliminar Etiqueta"
                                >
                                    <i className="fa-solid fa-trash text-[10px]"></i>
                                </button>
                            </div>
                         )}
                     </div>
                 )})}
             </div>
        </div>
      </div>
    </div>
  );
};

export default Explorer;