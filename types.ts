
export interface ParsedSession {
  target: string; // The main monitored number (Alvo principal)
  targetName?: string; 
  
  // New specific fields for Origin/Destination
  sourceNumber?: string; // Quem liga / Envia
  sourceName?: string;   // Nome de quem liga
  destinationNumber?: string; // Quem recebe
  destinationName?: string;   // Nome de quem recebe

  sessionId: string;
  date: string; // Format: DD.MM.YYYY
  startTime?: string; // Format: HH:mm:ss
  endTime?: string;   // Format: HH:mm:ss
  duration?: string;  // e.g., "00:05:23"
  type: 'AUDIO' | 'SMS';
  startPage: number; // The page number where the session starts (1-based index)
  endPage: number;   // The page number where the session ends (1-based index)
  content: string;   // The transcribed text for the editable DOCX file
  summary?: string;  // Optional brief text for the Excel file
  sourceFileName: string; // Identify which source file this session belongs to
  
  // Fields for Explorer Mode (Runtime only)
  pdfUrl?: string; // If pre-loaded
  docxUrl?: string; // If pre-loaded
  fileNameBase?: string;

  // Lazy Loading Keys
  zipSourceId?: string; // ID of the ZIP file in the registry
  
  // Fields for Manifest (Persisted paths in ZIP)
  pdfPath?: string;
  docxPath?: string;
}

export interface ProcessingStatus {
  step: 'IDLE' | 'READING' | 'ANALYZING' | 'GENERATING' | 'LOADING_ZIP' | 'COMPLETED' | 'ERROR';
  message: string;
  progress: number;
  error?: string;
}

export interface UploadedFile {
  name: string;
  content: ArrayBuffer;
  type: string;
}

// --- NEW TYPES FOR PERSISTENCE AND ALIASING ---

export interface SavedTag {
    id: string;
    name: string;
    timestamp: number;
    sessionIds: string[]; 
    filterDescription: string;
}

export type AliasMap = Record<string, string>; // Key = Original Raw Value, Value = Display/Unified Name

export interface ProjectData {
    version: string;
    sessions: ParsedSession[];
    savedTags: SavedTag[];
    aliasMap: AliasMap;
}
