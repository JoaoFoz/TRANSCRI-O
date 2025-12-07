import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ParsedSession, SavedTag, AliasMap, LegalReference, LegalReferenceType } from '../types';

// --- LEGAL MATTER MODAL ---

interface LegalMatterModalProps {
    legalReferences: LegalReference[];
    onSave: (refs: LegalReference[]) => void;
    onClose: () => void;
}

const LegalMatterModal: React.FC<LegalMatterModalProps> = ({ legalReferences, onSave, onClose }) => {
    const [activeTab, setActiveTab] = useState<LegalReferenceType>('ARTICLE');
    const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
    
    const [newItemLabel, setNewItemLabel] = useState('');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    
    // Checkbox Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const idCounter = useRef(0);

    // Derived List of items to display
    const visibleItems = useMemo(() => {
        return legalReferences.filter(r => {
            const rStatus = r.status || 'ACTIVE'; // Default to ACTIVE
            if (r.type !== activeTab) return false;
            if (viewMode === 'ACTIVE') return rStatus === 'ACTIVE';
            if (viewMode === 'ARCHIVED') return rStatus === 'ARCHIVED';
            return false;
        });
    }, [legalReferences, activeTab, viewMode]);

    // Clear selection when changing view contexts
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeTab, viewMode]);

    const generateId = () => {
        idCounter.current += 1;
        return `ref_${Date.now()}_${idCounter.current}_${Math.floor(Math.random() * 1000)}`;
    };

    const handleAddSingle = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newItemLabel.trim()) return;
        
        const labels = newItemLabel.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        const newRefs: LegalReference[] = labels.map((label) => ({
            id: generateId(), 
            type: activeTab,
            label: label,
            description: newItemDesc.trim(),
            status: 'ACTIVE'
        }));

        const updatedList = [...legalReferences, ...newRefs];
        onSave(updatedList);
        
        setNewItemLabel('');
        setNewItemDesc('');
    };

    const handleBulkImport = () => {
        if (!bulkText.trim()) return;
        const lines = bulkText.split(/[\n,]/).filter(l => l.trim().length > 0);
        
        const newRefs: LegalReference[] = lines.map((line) => ({
            id: generateId(),
            type: activeTab,
            label: line.trim().substring(0, 30) + (line.length > 30 ? '...' : ''), 
            description: line.trim(),
            status: 'ACTIVE'
        }));
        
        const updatedList = [...legalReferences, ...newRefs];
        onSave(updatedList);

        setBulkText('');
        setIsBulkMode(false);
    };

    const toggleSelection = (id: string) => {
        if (viewMode === 'ACTIVE') return; // Disable selection in active mode
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (viewMode === 'ACTIVE') return;
        if (selectedIds.size === visibleItems.length) {
            setSelectedIds(new Set()); 
        } else {
            setSelectedIds(new Set(visibleItems.map(r => r.id)));
        }
    };

    // --- ACTIONS ---

    // Direct Archive Single Item (Button on row)
    const handleArchiveSingle = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updatedList = legalReferences.map(r => 
            r.id === id ? { ...r, status: 'ARCHIVED' as const } : r
        );
        onSave(updatedList);
    };

    // Restore Selected (Archive View)
    const handleRestoreSelected = () => {
        if (selectedIds.size === 0) return;
        
        const updatedList = legalReferences.map(r => {
            if (selectedIds.has(r.id)) {
                return { ...r, status: 'ACTIVE' as const };
            }
            return r;
        });
        onSave(updatedList);
        setSelectedIds(new Set());
    };

    // Hard Delete Selected (Archive View)
    const handleHardDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        
        if (window.confirm(`Eliminar permanentemente ${selectedIds.size} itens?`)) {
            const updatedList = legalReferences.filter(r => !selectedIds.has(r.id));
            onSave(updatedList);
            setSelectedIds(new Set());
        }
    };

    const getTabColor = (type: LegalReferenceType, isActive: boolean) => {
        if (type === 'ARTICLE') {
            return isActive 
                ? 'border-b-2 border-red-500 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800';
        }
        if (type === 'FACT') {
            return isActive 
                ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800';
        }
        if (type === 'TAG') {
            return isActive 
                ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800';
        }
        return '';
    };

    const getLabelColor = (type: LegalReferenceType) => {
        if (type === 'ARTICLE') return 'text-red-700 dark:text-red-400';
        if (type === 'FACT') return 'text-amber-700 dark:text-amber-400';
        if (type === 'TAG') return 'text-emerald-700 dark:text-emerald-400';
        return '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-transparent dark:border-slate-800">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gestão de Matéria Legal</h3>
                    <button onClick={onClose}><i className="fa-solid fa-xmark text-xl text-slate-400"></i></button>
                </div>

                {/* MAIN TABS */}
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    <button type="button" onClick={() => setActiveTab('ARTICLE')} className={`flex-1 py-3 text-sm font-bold ${getTabColor('ARTICLE', activeTab === 'ARTICLE')}`}>
                        Artigo
                    </button>
                    <button type="button" onClick={() => setActiveTab('FACT')} className={`flex-1 py-3 text-sm font-bold ${getTabColor('FACT', activeTab === 'FACT')}`}>
                        Facto
                    </button>
                    <button type="button" onClick={() => setActiveTab('TAG')} className={`flex-1 py-3 text-sm font-bold ${getTabColor('TAG', activeTab === 'TAG')}`}>
                        Etiqueta
                    </button>
                </div>

                {/* VIEW MODE TOGGLE */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 flex justify-end items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase mr-2">Modo:</span>
                    <button 
                        onClick={() => setViewMode('ACTIVE')} 
                        className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${viewMode === 'ACTIVE' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                    >
                        Ativos
                    </button>
                    <button 
                        onClick={() => setViewMode('ARCHIVED')} 
                        className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${viewMode === 'ARCHIVED' ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                    >
                        Arquivo
                    </button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900/50 [&::-webkit-scrollbar-track]:bg-white dark:[&::-webkit-scrollbar-track]:bg-slate-900">
                    
                    {/* ADD NEW (Only Active) */}
                    {viewMode === 'ACTIVE' && (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Novo Registo</h4>
                                <button type="button" onClick={() => setIsBulkMode(!isBulkMode)} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                    {isBulkMode ? "Voltar ao Normal" : "Colar Lista (Bulk)"}
                                </button>
                            </div>
                            
                            {isBulkMode ? (
                                <div className="space-y-2">
                                    <textarea 
                                        value={bulkText} 
                                        onChange={e => setBulkText(e.target.value)} 
                                        placeholder="Cole aqui a sua lista (separada por ENTER ou vírgula)..."
                                        className="w-full h-32 p-3 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white custom-scrollbar"
                                    />
                                    <button type="button" onClick={handleBulkImport} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Importar Lista</button>
                                </div>
                            ) : (
                                <form onSubmit={handleAddSingle} className="space-y-2">
                                    <input 
                                        type="text" 
                                        value={newItemLabel} 
                                        onChange={e => setNewItemLabel(e.target.value)} 
                                        placeholder={activeTab === 'ARTICLE' ? "Ex: Artigo 14" : activeTab === 'FACT' ? "Ex: Facto 3" : "Ex: Relevante"} 
                                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    <textarea 
                                        value={newItemDesc} 
                                        onChange={e => setNewItemDesc(e.target.value)} 
                                        placeholder="Descrição (Opcional)"
                                        className="w-full h-12 p-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-white custom-scrollbar"
                                    />
                                    <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                                        <i className="fa-solid fa-plus"></i> Adicionar
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* TOOLBAR */}
                    {viewMode === 'ARCHIVED' && visibleItems.length > 0 && (
                        <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 sticky top-0 z-10 shadow-sm border border-slate-200 dark:border-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300 pl-1">
                                <input 
                                    type="checkbox" 
                                    checked={visibleItems.length > 0 && selectedIds.size === visibleItems.length} 
                                    onChange={toggleAll}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" 
                                />
                                Selecionar Todos
                            </label>
                            
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={handleRestoreSelected}
                                    disabled={selectedIds.size === 0}
                                    className="px-3 py-1 bg-white border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-xs font-bold rounded disabled:opacity-50"
                                >
                                    <i className="fa-solid fa-rotate-left"></i> Restaurar
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleHardDeleteSelected}
                                    disabled={selectedIds.size === 0}
                                    className="px-3 py-1 bg-white border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold rounded disabled:opacity-50"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* EMPTY STATE */}
                    {visibleItems.length === 0 && (
                        <div className="text-center text-slate-400 dark:text-slate-500 text-sm italic py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            {viewMode === 'ACTIVE' ? "Lista vazia." : "Arquivo vazio."}
                        </div>
                    )}
                    
                    {/* LIST */}
                    {visibleItems.map((ref) => {
                        const isSelected = selectedIds.has(ref.id);
                        
                        let rowClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-90';
                        if (viewMode === 'ARCHIVED') {
                             rowClass += ' cursor-pointer hover:border-slate-300 dark:hover:border-slate-600';
                             if (isSelected) rowClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500 shadow-sm cursor-pointer';
                        } else {
                             rowClass += ' cursor-default';
                        }

                        return (
                            <div 
                                key={ref.id} 
                                className={`p-3 rounded-lg border flex justify-between items-center transition-all ${rowClass}`}
                                onClick={() => viewMode === 'ARCHIVED' && toggleSelection(ref.id)}
                            >
                                <div className="flex items-start gap-3 w-full">
                                    {viewMode === 'ARCHIVED' && (
                                        <div className="pt-0.5">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => toggleSelection(ref.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 rounded cursor-pointer text-blue-600 focus:ring-blue-500" 
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm ${getLabelColor(ref.type)}`}>
                                                    {ref.label} 
                                                </span>
                                            </div>
                                            
                                            {/* Explicit Archive Action per Item */}
                                            {viewMode === 'ACTIVE' && (
                                                <button 
                                                    onClick={(e) => handleArchiveSingle(e, ref.id)}
                                                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                                                    title="Arquivar este item"
                                                >
                                                    <i className="fa-solid fa-box-archive text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                        {ref.description && <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{ref.description}</div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- HELPERS & SUB-COMPONENTS ---

// MultiSelectDropdown
interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, placeholder, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
              setIsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
      if (selected.includes(option)) {
          onChange(selected.filter(s => s !== option));
      } else {
          onChange([...selected, option]);
      }
  };

  return (
    <div className="relative" ref={wrapperRef}>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">{label}</label>
        <div 
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm cursor-pointer flex justify-between items-center"
            onClick={() => setIsOpen(!isOpen)}
        >
            <span className={`truncate ${selected.length === 0 ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {selected.length === 0 ? placeholder : `${selected.length} selecionado(s)`}
            </span>
            <i className={`fa-solid fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
        {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                {options.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Sem opções</div>
                ) : (
                    options.map(opt => (
                        <div 
                            key={opt} 
                            className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleOption(opt)}
                        >
                            <input 
                                type="checkbox" 
                                checked={selected.includes(opt)} 
                                readOnly 
                                className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 break-all">{opt}</span>
                        </div>
                    ))
                )}
            </div>
        )}
    </div>
  );
};

// IdentityManager
interface IdentityManagerProps {
    rawIdentities: string[];
    aliasMap: AliasMap;
    onSave: (newMap: AliasMap) => void;
    onClose: () => void;
}

const IdentityManager: React.FC<IdentityManagerProps> = ({ rawIdentities, aliasMap, onSave, onClose }) => {
    const [localMap, setLocalMap] = useState<AliasMap>({...aliasMap});
    const [filter, setFilter] = useState('');

    const handleChange = (original: string, alias: string) => {
        setLocalMap(prev => ({...prev, [original]: alias}));
    };

    const handleSave = () => {
        onSave(localMap);
        onClose();
    };

    const filteredIdentities = rawIdentities.filter(id => id.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-transparent dark:border-slate-800">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gestão de Identidades</h3>
                    <button onClick={onClose}><i className="fa-solid fa-xmark text-xl text-slate-400"></i></button>
                </div>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <input 
                        type="text" 
                        placeholder="Filtrar identidades..." 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {filteredIdentities.map(original => (
                        <div key={original} className="flex items-center gap-3">
                            <div className="w-1/2 text-sm font-mono text-slate-600 dark:text-slate-400 truncate" title={original}>{original}</div>
                            <div className="w-1/2">
                                <input 
                                    type="text" 
                                    value={localMap[original] || ''} 
                                    placeholder="Alias / Nome Real" 
                                    onChange={e => handleChange(original, e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Guardar Alterações</button>
                </div>
             </div>
        </div>
    );
};

// ImportModal
interface ImportModalProps {
    onClose: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    sessions: ParsedSession[];
    onDeleteFiles: (fileNames: string[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, sessions, onDeleteFiles }) => {
    // Unique source files
    const uniqueFiles = useMemo(() => Array.from(new Set(sessions.map(s => s.sourceFileName))), [sessions]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-transparent dark:border-slate-800">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Importar / Gerir Ficheiros</h3>
                    <button onClick={onClose}><i className="fa-solid fa-xmark text-xl text-slate-400"></i></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">Adicionar Novos Ficheiros</h4>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-3"></i>
                                <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Clique para carregar</span> ou arraste</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF, ZIP, ou Pasta</p>
                            </div>
                            <input type="file" className="hidden" multiple accept=".pdf,.zip" onChange={(e) => { onImport(e); onClose(); }} />
                        </label>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">Ficheiros Carregados ({uniqueFiles.length})</h4>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-lg">
                            {uniqueFiles.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">Nenhum ficheiro carregado.</div>
                            ) : (
                                uniqueFiles.map(file => (
                                    <div key={file} className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <div className="flex items-center gap-2 truncate">
                                            <i className="fa-regular fa-file-pdf text-red-500"></i>
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={file}>{file}</span>
                                        </div>
                                        <button onClick={() => onDeleteFiles([file])} className="text-slate-400 hover:text-red-500 transition-colors">
                                            <i className="fa-solid fa-trash text-xs"></i>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
};

// --- MAIN EXPLORER COMPONENT ---

interface ExplorerProps {
  sessions: ParsedSession[];
  setSessions: React.Dispatch<React.SetStateAction<ParsedSession[]>>;
  onBack: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGetAsset: (session: ParsedSession, type: 'pdf' | 'docx') => Promise<string | null>;
  
  savedTags: SavedTag[];
  setSavedTags: React.Dispatch<React.SetStateAction<SavedTag[]>>;
  aliasMap: AliasMap;
  setAliasMap: React.Dispatch<React.SetStateAction<AliasMap>>;
  legalReferences: LegalReference[];
  setLegalReferences: React.Dispatch<React.SetStateAction<LegalReference[]>>;
  
  onSaveProject: () => void;
  onDeleteSessions: (sessionIds: string[]) => void;
  onDeleteFiles: (fileNames: string[]) => void;
  onExportSessions?: (sessions: ParsedSession[]) => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'duration_desc' | 'source_num' | 'dest_num' | 'source_name' | 'dest_name';

const Explorer: React.FC<ExplorerProps> = ({ 
    sessions, setSessions, onBack, onImport, onGetAsset, 
    savedTags, setSavedTags, aliasMap, setAliasMap, 
    legalReferences, setLegalReferences, 
    onSaveProject, onDeleteSessions, onDeleteFiles, onExportSessions 
}) => {
    // --- STATE ---
    // UI Toggles
    const [showAliasModal, setShowAliasModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showLegalModal, setShowLegalModal] = useState(false);
    const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filter Inputs
    const [inputSession, setInputSession] = useState('');
    const [inputContent, setInputContent] = useState('');
    const [inputDateStart, setInputDateStart] = useState('');
    const [inputDateEnd, setInputDateEnd] = useState('');
    const [inputTimeStart, setInputTimeStart] = useState('');
    const [inputTimeEnd, setInputTimeEnd] = useState('');
    
    // MultiSelect Filter Inputs
    const [filterSourceNumbers, setFilterSourceNumbers] = useState<string[]>([]);
    const [filterDestNumbers, setFilterDestNumbers] = useState<string[]>([]);
    const [filterSourceSpeakers, setFilterSourceSpeakers] = useState<string[]>([]);
    const [filterDestSpeakers, setFilterDestSpeakers] = useState<string[]>([]);
    const [filterLegalArticle, setFilterLegalArticle] = useState<string[]>([]);
    const [filterLegalFact, setFilterLegalFact] = useState<string[]>([]);
    const [filterLegalTag, setFilterLegalTag] = useState<string[]>([]);

    const [inputMinDuration, setInputMinDuration] = useState('');
    const [inputMaxDuration, setInputMaxDuration] = useState('');

    // Active Filters (Applied on Search Click)
    const [activeFilters, setActiveFilters] = useState({
        session: '', content: '', dateStart: '', dateEnd: '', timeStart: '', timeEnd: '',
        sourceNumbers: [] as string[], destNumbers: [] as string[],
        sourceSpeakers: [] as string[], destSpeakers: [] as string[],
        minDuration: '', maxDuration: '',
        legalArticle: [] as string[], legalFact: [] as string[], legalTag: [] as string[]
    });

    // Selection & Tags
    const [manualSelection, setManualSelection] = useState<Set<string>>(new Set());
    const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
    const [tagName, setTagName] = useState('');
    const [viewOnlySelected, setViewOnlySelected] = useState(false);
    
    // Tag Editing
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editTagName, setEditTagName] = useState('');

    // Sorting
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');

    // Legal Linking (Temporary Selection in Widget)
    const [selectedArticlesToLink, setSelectedArticlesToLink] = useState<string[]>([]);
    const [selectedFactsToLink, setSelectedFactsToLink] = useState<string[]>([]);
    const [selectedTagsToLink, setSelectedTagsToLink] = useState<string[]>([]);

    // Exporting Loading State
    const [isExporting, setIsExporting] = useState(false);

    // Helper: Resolve Alias
    const resolve = useCallback((val: string | undefined): string | undefined => {
        if (!val) return undefined;
        return aliasMap[val] || val;
    }, [aliasMap]);

    // --- AGGREGATE DATA FOR DROPDOWNS ---
    const { allNumbers, allSpeakers, rawIdentities, availableArticles, availableFacts, availableTags } = useMemo(() => {
        const numbers = new Set<string>();
        const speakers = new Set<string>();
        const rawSet = new Set<string>();
  
        sessions.forEach(s => {
            if (s.target) { const val = s.target; rawSet.add(val); numbers.add(resolve(val)!); }
            if (s.sourceNumber) { rawSet.add(s.sourceNumber); numbers.add(resolve(s.sourceNumber)!); }
            if (s.destinationNumber) { rawSet.add(s.destinationNumber); numbers.add(resolve(s.destinationNumber)!); }
            if (s.sourceName) { rawSet.add(s.sourceName); speakers.add(resolve(s.sourceName)!); }
            if (s.destinationName) { rawSet.add(s.destinationName); speakers.add(resolve(s.destinationName)!); }
            // Fallback regex scan for speakers in content
            const lines = s.content.split('\n');
            lines.forEach(line => {
               const match = line.match(/^([A-ZÀ-Ú][a-zà-ú0-9_\-\s]{1,30}):/);
               if (match) { const name = match[1].trim(); rawSet.add(name); speakers.add(resolve(name)!); }
            });
        });
        
        // Filter out ARCHIVED items from search filters
        const articles = legalReferences
          .filter(r => r.type === 'ARTICLE' && (r.status === 'ACTIVE' || !r.status))
          .map(r => r.label);
        
        const facts = legalReferences
          .filter(r => r.type === 'FACT' && (r.status === 'ACTIVE' || !r.status))
          .map(r => r.label);

        const tags = legalReferences
          .filter(r => r.type === 'TAG' && (r.status === 'ACTIVE' || !r.status))
          .map(r => r.label);
  
        return {
            allNumbers: Array.from(numbers).sort(),
            allSpeakers: Array.from(speakers).sort(),
            rawIdentities: Array.from(rawSet).sort(),
            availableArticles: articles,
            availableFacts: facts,
            availableTags: tags
        };
    }, [sessions, resolve, legalReferences]);

    // --- FILTER LOGIC ---
    const filteredSessions = useMemo(() => {
        return sessions.filter(session => {
            // 1. Tag Filter
            if (activeTagIds.length > 0) {
                const matchesTag = savedTags.some(tag => 
                    activeTagIds.includes(tag.id) && tag.sessionIds.includes(session.sessionId)
                );
                if (!matchesTag) return false;
            }

            // 2. View Only Selected
            if (viewOnlySelected) {
                if (!manualSelection.has(session.sessionId)) return false;
            }

            // 3. Search Criteria
            const f = activeFilters;
            if (f.session && !session.sessionId.includes(f.session)) return false;
            if (f.content) {
                 const terms = f.content.toLowerCase().split(/\s+/);
                 const contentLower = session.content.toLowerCase();
                 // Simple AND logic
                 if (!terms.every(term => contentLower.includes(term))) return false;
            }
            
            // Date Range (YYYY-MM-DD) vs DD.MM.YYYY
            if (f.dateStart || f.dateEnd) {
                const parts = session.date.split('.'); // DD, MM, YYYY
                if (parts.length === 3) {
                    const sessDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // YYYY-MM-DD
                    if (f.dateStart) {
                        const start = new Date(f.dateStart);
                        if (sessDate < start) return false;
                    }
                    if (f.dateEnd) {
                        const end = new Date(f.dateEnd);
                        if (sessDate > end) return false;
                    }
                }
            }

            // Time Range
            if (f.timeStart || f.timeEnd) {
                if (session.startTime) {
                    if (f.timeStart && session.startTime < f.timeStart) return false;
                    if (f.timeEnd && session.startTime > f.timeEnd) return false;
                }
            }
            
            // Duration
            const getSeconds = (dur: string) => {
                const p = dur.split(':').map(Number);
                if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
                if (p.length === 2) return p[0]*60 + p[1];
                return 0;
            };
            if (f.minDuration || f.maxDuration) {
                if (session.type !== 'AUDIO' || !session.duration) return false;
                const sec = getSeconds(session.duration);
                if (f.minDuration && sec < parseInt(f.minDuration)) return false;
                if (f.maxDuration && sec > parseInt(f.maxDuration)) return false;
            }

            // Relations: Source Numbers
            if (f.sourceNumbers.length > 0) {
                const sNum = resolve(session.sourceNumber);
                if (!sNum || !f.sourceNumbers.includes(sNum)) return false;
            }
            // Relations: Dest Numbers
            if (f.destNumbers.length > 0) {
                const dNum = resolve(session.destinationNumber);
                if (!dNum || !f.destNumbers.includes(dNum)) return false;
            }
            // Relations: Source Speakers
            if (f.sourceSpeakers.length > 0) {
                const sName = resolve(session.sourceName);
                if (!sName || !f.sourceSpeakers.includes(sName)) return false;
            }
            // Relations: Dest Speakers
            if (f.destSpeakers.length > 0) {
                const dName = resolve(session.destinationName);
                if (!dName || !f.destSpeakers.includes(dName)) return false;
            }

            // Legal Matters
            if (f.legalArticle.length > 0) {
                if (!session.legalReferenceIds) return false;
                const sessionLabels = session.legalReferenceIds.map(id => legalReferences.find(r => r.id === id)?.label);
                if (!f.legalArticle.some(label => sessionLabels.includes(label))) return false;
            }
            if (f.legalFact.length > 0) {
                if (!session.legalReferenceIds) return false;
                const sessionLabels = session.legalReferenceIds.map(id => legalReferences.find(r => r.id === id)?.label);
                if (!f.legalFact.some(label => sessionLabels.includes(label))) return false;
            }
            if (f.legalTag.length > 0) {
                if (!session.legalReferenceIds) return false;
                const sessionLabels = session.legalReferenceIds.map(id => legalReferences.find(r => r.id === id)?.label);
                if (!f.legalTag.some(label => sessionLabels.includes(label))) return false;
            }

            return true;
        });
    }, [sessions, activeFilters, activeTagIds, savedTags, viewOnlySelected, manualSelection, resolve, legalReferences]);

    // --- SORTING ---
    const sortedSessions = useMemo(() => {
        return [...filteredSessions].sort((a, b) => {
             if (sortOption === 'date_desc' || sortOption === 'date_asc') {
                 // DD.MM.YYYY
                 const parseDate = (d: string) => {
                     const p = d.split('.');
                     return new Date(`${p[2]}-${p[1]}-${p[0]}T${a.startTime || '00:00:00'}`);
                 };
                 const dateA = parseDate(a.date).getTime();
                 const dateB = parseDate(b.date).getTime();
                 return sortOption === 'date_desc' ? dateB - dateA : dateA - dateB;
             }
             if (sortOption === 'duration_desc') {
                 return (b.duration || '').localeCompare(a.duration || '');
             }
             if (sortOption === 'source_num') return (resolve(a.sourceNumber) || '').localeCompare(resolve(b.sourceNumber) || '');
             if (sortOption === 'dest_num') return (resolve(a.destinationNumber) || '').localeCompare(resolve(b.destinationNumber) || '');
             if (sortOption === 'source_name') return (resolve(a.sourceName) || '').localeCompare(resolve(b.sourceName) || '');
             if (sortOption === 'dest_name') return (resolve(a.destinationName) || '').localeCompare(resolve(b.destinationName) || '');
             return 0;
        });
    }, [filteredSessions, sortOption, resolve]);

    // --- HANDLERS ---

    const handleSearch = () => {
        setActiveFilters({
            session: inputSession, content: inputContent, dateStart: inputDateStart, dateEnd: inputDateEnd, timeStart: inputTimeStart, timeEnd: inputTimeEnd, 
            sourceNumbers: filterSourceNumbers, destNumbers: filterDestNumbers,
            sourceSpeakers: filterSourceSpeakers, destSpeakers: filterDestSpeakers,
            minDuration: inputMinDuration, maxDuration: inputMaxDuration,
            legalArticle: filterLegalArticle, legalFact: filterLegalFact, legalTag: filterLegalTag
        });
    };

    const handleClearFilters = () => {
        setInputSession(''); setInputContent(''); setInputDateStart(''); setInputDateEnd(''); setInputTimeStart(''); setInputTimeEnd('');
        setFilterSourceNumbers([]); setFilterDestNumbers([]); setFilterSourceSpeakers([]); setFilterDestSpeakers([]);
        setInputMinDuration(''); setInputMaxDuration('');
        setFilterLegalArticle([]); setFilterLegalFact([]); setFilterLegalTag([]);
        
        setActiveFilters({
            session: '', content: '', dateStart: '', dateEnd: '', timeStart: '', timeEnd: '',
            sourceNumbers: [], destNumbers: [], sourceSpeakers: [], destSpeakers: [],
            minDuration: '', maxDuration: '', legalArticle: [], legalFact: [], legalTag: []
        });
        setActiveTagIds([]);
        setManualSelection(new Set());
        setViewOnlySelected(false);
    };

    const handleSelectAll = () => {
        const ids = new Set(manualSelection);
        sortedSessions.forEach(s => ids.add(s.sessionId));
        setManualSelection(ids);
    };

    const handleDeselectAll = () => {
        setManualSelection(new Set());
    };

    const handleBulkDelete = () => {
        onDeleteSessions(Array.from(manualSelection));
        setManualSelection(new Set());
    };

    // Tags
    const saveTag = () => {
        if (!tagName.trim() || manualSelection.size === 0) return;
        const newTag: SavedTag = {
            id: Date.now().toString(),
            name: tagName,
            timestamp: Date.now(),
            sessionIds: Array.from(manualSelection),
            filterDescription: `${manualSelection.size} itens`
        };
        setSavedTags(prev => [...prev, newTag]);
        setTagName('');
    };

    const toggleTag = (id: string) => {
        setActiveTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const deleteTag = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Eliminar etiqueta?")) {
            setSavedTags(prev => prev.filter(t => t.id !== id));
            setActiveTagIds(prev => prev.filter(t => t !== id));
        }
    };

    const startEditingTag = (e: React.MouseEvent, tag: SavedTag) => {
        e.stopPropagation();
        setEditingTagId(tag.id);
        setEditTagName(tag.name);
    };

    const cancelEditingTag = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTagId(null);
    };

    const saveEditedTag = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingTagId && editTagName.trim()) {
            setSavedTags(prev => prev.map(t => t.id === editingTagId ? { ...t, name: editTagName } : t));
            setEditingTagId(null);
        }
    };

    // Asset Opening
    const handleOpenPdf = async (session: ParsedSession) => {
        setLoadingPdf(session.sessionId);
        try {
            const url = await onGetAsset(session, 'pdf');
            if (url) window.open(url, '_blank');
            else alert("PDF Original não encontrado.");
        } finally {
            setLoadingPdf(null);
        }
    };

    // Copy Content
    const handleCopySession = (session: ParsedSession) => {
        const text = `Sessão: ${session.sessionId}\nData: ${session.date} ${session.startTime}\nDe: ${session.sourceNumber || '?'} -> Para: ${session.destinationNumber || '?'}\n\n${session.content}`;
        navigator.clipboard.writeText(text);
        setCopiedId(session.sessionId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Legal Linking
    const linkLegalReference = () => {
        if (manualSelection.size === 0) return;
        
        // Find IDs for selected labels
        const articleIds = legalReferences.filter(r => r.type === 'ARTICLE' && selectedArticlesToLink.includes(r.label)).map(r => r.id);
        const factIds = legalReferences.filter(r => r.type === 'FACT' && selectedFactsToLink.includes(r.label)).map(r => r.id);
        const tagIds = legalReferences.filter(r => r.type === 'TAG' && selectedTagsToLink.includes(r.label)).map(r => r.id);
        const idsToLink = [...articleIds, ...factIds, ...tagIds];

        if (idsToLink.length === 0) return;

        setSessions(prev => prev.map(s => {
            if (manualSelection.has(s.sessionId)) {
                const existing = new Set(s.legalReferenceIds || []);
                idsToLink.forEach(id => existing.add(id));
                return { ...s, legalReferenceIds: Array.from(existing) };
            }
            return s;
        }));
        
        // Clear temp selection
        setSelectedArticlesToLink([]);
        setSelectedFactsToLink([]);
        setSelectedTagsToLink([]);
    };

    const unlinkLegalReference = (sessionId: string, refId: string) => {
        setSessions(prev => prev.map(s => {
            if (s.sessionId === sessionId && s.legalReferenceIds) {
                return { ...s, legalReferenceIds: s.legalReferenceIds.filter(id => id !== refId) };
            }
            return s;
        }));
    };

    // EXPORT
    const handleExportResultsDocx = async () => {
        if (sortedSessions.length === 0) return;
        if (onExportSessions) {
            onExportSessions(sortedSessions);
        }
    };

    const handleExportSelectedDocx = async () => {
        const selected = sessions.filter(s => manualSelection.has(s.sessionId));
        if (selected.length === 0) return;
        if (onExportSessions) {
            onExportSessions(selected);
        }
    };

    const renderDurationInput = (val: string, setVal: (v: string) => void, placeholder: string) => (
        <input 
            type="number" 
            value={val} 
            onChange={e => setVal(e.target.value)} 
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs px-2 py-1 w-full" 
            placeholder={placeholder}
        />
    );

    const getRefStyle = (ref: LegalReference) => {
        if (ref.status === 'ARCHIVED') return 'opacity-50';
        if (ref.type === 'ARTICLE') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
        if (ref.type === 'FACT') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30';
        if (ref.type === 'TAG') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30';
        return '';
    };

    return (
        <div className="w-full max-w-[1500px] mx-auto p-4 min-h-screen font-sans flex flex-col relative z-10">
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
          {showLegalModal && (
              <LegalMatterModal 
                legalReferences={legalReferences}
                onSave={setLegalReferences}
                onClose={() => setShowLegalModal(false)}
              />
          )}
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 px-6 py-4 mb-6 flex flex-col xl:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                  <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                      <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <div>
                      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Explorador de Sessões</h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-600 dark:text-blue-500">{filteredSessions.length}</span> resultados de <span className="text-slate-700 dark:text-slate-300">{sessions.length}</span> totais
                      </p>
                  </div>
              </div>
    
              <div className="flex items-center gap-3">
                  <button onClick={() => setShowImportModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200 dark:shadow-blue-900/50 hover:bg-blue-700 hover:shadow-lg transition-all font-bold text-sm flex items-center gap-2">
                      <i className="fa-solid fa-cloud-arrow-up"></i> Importar / Gerir
                  </button>
                  <button onClick={onSaveProject} className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all font-bold text-sm flex items-center gap-2">
                      <i className="fa-solid fa-floppy-disk text-green-600 dark:text-green-500"></i> Guardar Projeto
                  </button>
              </div>
          </div>
    
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            
            {/* LEFT COLUMN: FILTERS */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar flex flex-col gap-4">
                
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                    <i className="fa-solid fa-filter text-blue-500"></i> Critérios de Pesquisa
                </h3>
    
                <div className="space-y-3">
                    <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">ID Sessão</label><input type="text" value={inputSession} onChange={(e) => setInputSession(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Ex: 1450" /></div>
                    
                    <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Conteúdo</label><textarea value={inputContent} onChange={(e) => setInputContent(e.target.value)} rows={2} className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Pesquisa Booleana..." /></div>
                    
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                         <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Matéria Legal</label>
                         <div className="space-y-2">
                             <MultiSelectDropdown label="Artigo" placeholder="Todos" options={availableArticles} selected={filterLegalArticle} onChange={setFilterLegalArticle} />
                             <MultiSelectDropdown label="Facto" placeholder="Todos" options={availableFacts} selected={filterLegalFact} onChange={setFilterLegalFact} />
                             <MultiSelectDropdown label="Etiqueta" placeholder="Todas" options={availableTags} selected={filterLegalTag} onChange={setFilterLegalTag} />
                         </div>
                    </div>
    
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Datas</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={inputDateStart} onChange={(e) => setInputDateStart(e.target.value)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs px-2 py-1" />
                            <input type="date" value={inputDateEnd} onChange={(e) => setInputDateEnd(e.target.value)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs px-2 py-1" />
                        </div>
                    </div>
                </div>
    
                <button 
                    onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    {isAdvancedSearchOpen ? <i className="fa-solid fa-chevron-up"></i> : <i className="fa-solid fa-chevron-down"></i>}
                    Pesquisa Avançada
                </button>
    
                {isAdvancedSearchOpen && (
                    <div className="space-y-4 animate-fade-in">
                        
                        <button onClick={() => setShowAliasModal(true)} className="w-full py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded-lg font-bold text-xs dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-users-gear"></i> Gerir Identidades
                        </button>
                        
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">
                                <i className="fa-solid fa-arrow-right-arrow-left"></i> Relação entre Números
                            </div>
                            <MultiSelectDropdown label="De (Origem)" placeholder="Qualquer" options={allNumbers} selected={filterSourceNumbers} onChange={setFilterSourceNumbers} />
                            <div className="flex justify-center -my-2 relative z-10"><i className="fa-solid fa-arrow-down text-slate-300 dark:text-slate-600 text-xs"></i></div>
                            <MultiSelectDropdown label="Para (Destino)" placeholder="Qualquer" options={allNumbers} selected={filterDestNumbers} onChange={setFilterDestNumbers} />
                        </div>
    
                        <div className="space-y-2 pt-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1 mb-2">
                                <i className="fa-solid fa-people-arrows"></i> Relação entre Intervenientes
                            </div>
                            <MultiSelectDropdown label="De (Origem)" placeholder="Qualquer" options={allSpeakers} selected={filterSourceSpeakers} onChange={setFilterSourceSpeakers} />
                            <div className="flex justify-center -my-2 relative z-10"><i className="fa-solid fa-arrow-down text-slate-300 dark:text-slate-600 text-xs"></i></div>
                            <MultiSelectDropdown label="Para (Destino)" placeholder="Qualquer" options={allSpeakers} selected={filterDestSpeakers} onChange={setFilterDestSpeakers} />
                        </div>
    
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Horário</label>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <input type="time" value={inputTimeStart} onChange={(e) => setInputTimeStart(e.target.value)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs px-2 py-1" />
                                <input type="time" value={inputTimeEnd} onChange={(e) => setInputTimeEnd(e.target.value)} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs px-2 py-1" />
                            </div>
                            
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Duração (segundos) [Áudio]</label>
                            <div className="grid grid-cols-2 gap-2">
                                {renderDurationInput(inputMinDuration, setInputMinDuration, "Mín")}
                                {renderDurationInput(inputMaxDuration, setInputMaxDuration, "Máx")}
                            </div>
                        </div>
                    </div>
                )}
    
                <div className="pt-2 flex gap-2">
                    <button onClick={handleSearch} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"><i className="fa-solid fa-search"></i> Pesquisar</button>
                    <button onClick={handleClearFilters} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Limpar Filtros e Etiquetas"><i className="fa-solid fa-eraser"></i></button>
                </div>
              </div>
            </div>
    
            {/* MIDDLE COLUMN: RESULTS */}
            <div className="lg:col-span-6 flex flex-col gap-4">
                
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button 
                            onClick={handleSelectAll}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/30"
                        >
                            <i className="fa-solid fa-check-double mr-1.5"></i> Selecionar Tudo
                        </button>
                        
                        <button 
                            onClick={handleExportResultsDocx}
                            disabled={isExporting}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1"
                            title="Exportar todos os resultados listados abaixo"
                        >
                            {isExporting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-word text-blue-600 dark:text-blue-500"></i>}
                            Exportar Lista ({sortedSessions.length})
                        </button>
    
                        {manualSelection.size > 0 && (
                            <>
                                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                                <button 
                                    onClick={handleDeselectAll}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Desmarcar
                                </button>
                                <button 
                                    onClick={handleExportSelectedDocx}
                                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-900/30 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <i className="fa-solid fa-file-export"></i> Exportar Sel. ({manualSelection.size})
                                </button>
                                <button 
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/30 rounded-lg transition-colors"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </>
                        )}
                    </div>
    
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase"><i className="fa-solid fa-sort"></i></div>
                        <select 
                            value={sortOption} 
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className="bg-transparent border-none rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 focus:ring-0 py-1 pl-0 pr-8 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-right"
                            style={{ backgroundImage: 'none' }}
                        >
                            <option value="date_desc">Data (Recente)</option>
                            <option value="date_asc">Data (Antiga)</option>
                            <option value="duration_desc">Duração</option>
                            <option value="source_num">Nº Origem</option>
                            <option value="dest_num">Nº Destino</option>
                            <option value="source_name">Interv. Origem</option>
                            <option value="dest_name">Interv. Destino</option>
                        </select>
                    </div>
                </div>
    
                <div className="grid grid-cols-1 gap-4 content-start">
                {sortedSessions.map((session, idx) => {
                    const isSelected = manualSelection.has(session.sessionId);
                    const sourceDisplay = resolve(session.sourceName) || resolve(session.sourceNumber) || session.sourceNumber || "?";
                    const destDisplay = resolve(session.destinationName) || resolve(session.destinationNumber) || session.destinationNumber || "?";
                    
                    return (
                    <div key={`${session.sessionId}-${idx}`} className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm flex flex-col relative group transition-all hover:shadow-md min-h-[380px] ${isSelected ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/50' : 'border-slate-200 dark:border-slate-800'}`}>
                        
                        <div className="absolute top-3 left-3 z-20">
                            <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 shadow-sm p-1 flex items-center justify-center cursor-pointer hover:border-blue-400">
                                <input 
                                    type="checkbox" 
                                    checked={isSelected} 
                                    onChange={() => setManualSelection(prev => { const n = new Set(prev); n.has(session.sessionId) ? n.delete(session.sessionId) : n.add(session.sessionId); return n; })} 
                                    className="w-4 h-4 cursor-pointer bg-white dark:bg-slate-900 accent-blue-600 border-slate-300 dark:border-slate-600" 
                                />
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 pl-10 py-3 border-b border-slate-100 dark:border-slate-800 rounded-t-xl">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-6">
                                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${session.type === 'SMS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{session.type}</span>
                                        <span className="font-mono text-xs text-slate-700 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 px-1.5 border border-slate-200 dark:border-slate-700 rounded">ID: {session.sessionId}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 font-medium bg-white dark:bg-slate-900 px-1.5 border border-slate-200 dark:border-slate-700 rounded truncate max-w-[120px]" title={session.target}>Alvo: {session.target}</span>
                                            <button 
                                                onClick={() => handleCopySession(session)}
                                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                                title="Copiar Transcrição e Metadados"
                                            >
                                                {copiedId === session.sessionId ? <i className="fa-solid fa-check text-green-500"></i> : <i className="fa-regular fa-copy"></i>}
                                            </button>
                                            <button 
                                                onClick={() => onDeleteSessions([session.sessionId])}
                                                className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Eliminar este registo"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {session.legalReferenceIds && session.legalReferenceIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {session.legalReferenceIds.map(refId => {
                                                const ref = legalReferences.find(r => r.id === refId);
                                                if (!ref) return null;
                                                
                                                return (
                                                    <div key={refId} className={`group relative cursor-help px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getRefStyle(ref)}`}>
                                                        {ref.label}
                                                        <button onClick={(e) => { e.stopPropagation(); unlinkLegalReference(session.sessionId, refId); }} className="ml-1.5 hover:text-red-900 dark:hover:text-red-200"><i className="fa-solid fa-times"></i></button>
                                                        {ref.description && ref.description.trim() !== '' && (
                                                            <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50 hidden group-hover:block font-normal normal-case">
                                                                {ref.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
    
                                    <div className="text-xs text-slate-800 dark:text-slate-300 leading-tight">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <i className="fa-solid fa-phone-volume text-[10px] text-green-600 dark:text-green-500"></i> 
                                            <span className="font-bold truncate" title={sourceDisplay}>{sourceDisplay}</span> 
                                            {session.sourceName && resolve(session.sourceName) !== session.sourceName && <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">({session.sourceName})</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 truncate">
                                            <i className="fa-solid fa-arrow-down text-[10px] text-slate-400 dark:text-slate-500 ml-0.5"></i>
                                            <span className="font-bold truncate" title={destDisplay}>{destDisplay}</span>
                                            {session.destinationName && resolve(session.destinationName) !== session.destinationName && <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">({session.destinationName})</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-500 pt-0.5 shrink-0">
                                    <div className="font-semibold text-slate-700 dark:text-slate-400">{session.date}</div>
                                    <div className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 rounded inline-block mb-0.5">{session.startTime}</div>
                                    {session.duration && (
                                        <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1" title="Duração">
                                            <i className="fa-regular fa-clock text-[9px]"></i> {session.duration}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
    
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 bg-white dark:bg-slate-900">
                            {session.content.split('\n').map((line, i) => {
                                 const trimmed = line.trim();
                                 if (!trimmed) return null;
                                 const match = trimmed.match(/^([A-ZÀ-Úa-zà-ú0-9_\-\s\.()]+:)(.*)/);
                                 if (match) {
                                     return (
                                         <div key={i} className="text-xs px-2 py-1 border-b border-slate-50 dark:border-slate-800 last:border-0 rounded bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300">
                                             <span className="font-bold text-slate-900 dark:text-slate-100">{match[1]}</span>
                                             <span>{match[2]}</span>
                                         </div>
                                     );
                                 } else {
                                     return (
                                        <div key={i} className="text-xs px-2 py-1 border-b border-slate-50 dark:border-slate-800 last:border-0 rounded text-slate-600 dark:text-slate-400">
                                            {trimmed}
                                        </div>
                                     );
                                 }
                            })}
                        </div>
    
                        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 rounded-b-xl">
                            <button onClick={() => handleOpenPdf(session)} disabled={!session.pdfPath && !session.pdfUrl} className="w-full text-xs font-bold py-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 border border-transparent dark:border-red-900/30">
                                 {loadingPdf === session.sessionId ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-regular fa-file-pdf"></i> Ver Original</>}
                            </button>
                        </div>
                    </div>
                )})}
                </div>
            </div>
    
            {/* RIGHT COLUMN: CONTEXT (TAGS & LEGAL) */}
            <div className="lg:col-span-3 space-y-4">
                 <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2"><i className="fa-solid fa-scale-balanced text-red-500"></i> Matéria Legal</span>
                        <button onClick={() => setShowLegalModal(true)} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><i className="fa-solid fa-gear"></i> Gerir</button>
                    </h3>
                    
                    <div className="text-xs mb-2 text-slate-500 font-medium">
                        Associar a {manualSelection.size} itens selecionados
                    </div>
                    
                    <div className="space-y-3">
                        <MultiSelectDropdown 
                            label="Associar Artigos" 
                            placeholder="Selecione Artigos..." 
                            options={availableArticles} 
                            selected={selectedArticlesToLink} 
                            onChange={setSelectedArticlesToLink} 
                        />
                        <MultiSelectDropdown 
                            label="Associar Factos" 
                            placeholder="Selecione Factos..." 
                            options={availableFacts} 
                            selected={selectedFactsToLink} 
                            onChange={setSelectedFactsToLink} 
                        />
                         <MultiSelectDropdown 
                            label="Associar Etiquetas" 
                            placeholder="Selecione Etiquetas..." 
                            options={availableTags} 
                            selected={selectedTagsToLink} 
                            onChange={setSelectedTagsToLink} 
                        />
                        <button 
                            onClick={linkLegalReference} 
                            disabled={manualSelection.size === 0 || (selectedArticlesToLink.length === 0 && selectedFactsToLink.length === 0 && selectedTagsToLink.length === 0)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                            Associar Seleção
                        </button>
                    </div>
                 </div>
            </div>
          </div>
        </div>
    );
};

export default Explorer;