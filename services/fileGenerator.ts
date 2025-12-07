import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { ParsedSession, SavedTag, AliasMap, ProjectData, LegalReference } from '../types';

export const generateOutputPackage = async (
  sessions: ParsedSession[], 
  sourceFiles: Map<string, ArrayBuffer>,
  projectState?: { savedTags: SavedTag[], aliasMap: AliasMap, legalReferences: LegalReference[] }
): Promise<Blob> => {
  const zip = new JSZip();

  const sourceDocsCache = new Map<string, PDFDocument>();
  const sourcePageCounts = new Map<string, number>();

  // Helper for aliasing
  const getDisplay = (val: string | undefined) => {
      if (!val) return "N/D";
      if (projectState?.aliasMap && projectState.aliasMap[val]) return projectState.aliasMap[val];
      return val;
  };

  // 1. Load Source PDFs
  for (const [name, buffer] of sourceFiles.entries()) {
      try {
        const doc = await PDFDocument.load(buffer);
        sourceDocsCache.set(name, doc);
        sourcePageCounts.set(name, doc.getPageCount());
      } catch (e) {
        console.error(`Failed to load PDF for ${name}`, e);
      }
  }

  const sanitize = (str: string) => str.replace(/[^a-z0-9à-úÀ-Ú\s\-_.]/gi, '_').trim();

  // 2. Generate Manifest & Project Data
  const manifestData = sessions.map(s => {
    const safeTarget = sanitize(s.target || 'Unknown');
    const safeSession = sanitize(s.sessionId);
    const safeDate = sanitize(s.date);
    const baseFilename = `${safeTarget}-${safeSession}-${safeDate}`;
    
    return {
        ...s,
        fileNameBase: baseFilename,
        pdfPath: `Original-${safeTarget}/${baseFilename}.pdf`,
        docxPath: `Editavel-${safeTarget}/${baseFilename}.docx`
    };
  });

  // Legacy manifest for simple viewers
  zip.file('manifest.json', JSON.stringify(manifestData, null, 2));

  // Full Project Data for Restoration
  if (projectState) {
      const projectData: ProjectData = {
          version: "1.1", // Bumped version for new fields
          sessions: manifestData, // Use the version with paths
          savedTags: projectState.savedTags,
          aliasMap: projectState.aliasMap,
          legalReferences: projectState.legalReferences
      };
      zip.file('project.json', JSON.stringify(projectData, null, 2));
  }

  // 3. Process Sessions (Split PDF + DOCX)
  for (const session of sessions) {
    const safeTarget = sanitize(session.target || 'Unknown');
    const safeSession = sanitize(session.sessionId);
    const safeDate = sanitize(session.date);

    const folderNameOriginal = `Original-${safeTarget}`;
    const folderNameEditable = `Editavel-${safeTarget}`;
    const baseFilename = `${safeTarget}-${safeSession}-${safeDate}`;
    const pdfFilename = `${baseFilename}.pdf`;
    const docxFilename = `${baseFilename}.docx`;

    try {
      // 3a. SPLIT PDF
      const sourcePdfDoc = sourceDocsCache.get(session.sourceFileName);
      if (sourcePdfDoc) {
          const totalPages = sourcePageCounts.get(session.sourceFileName) || 0;
          const newPdfDoc = await PDFDocument.create();
          let startIdx = Math.max(0, session.startPage - 1);
          let endIdx = Math.min(totalPages - 1, session.endPage - 1);
          
          const pageIndices = [];
          for (let i = startIdx; i <= endIdx; i++) pageIndices.push(i);

          if (pageIndices.length > 0) {
              const copiedPages = await newPdfDoc.copyPages(sourcePdfDoc, pageIndices);
              copiedPages.forEach((page) => newPdfDoc.addPage(page));
              const pdfBytes = await newPdfDoc.save();
              zip.folder(folderNameOriginal)?.file(pdfFilename, pdfBytes);
          }
      }

      // 3b. GENERATE DOCX
      
      const timeInfo = [
        session.startTime ? `Início: ${session.startTime}` : '',
        session.endTime ? `Fim: ${session.endTime}` : '',
        session.duration ? `Duração: ${session.duration}` : ''
      ].filter(Boolean).join('  |  ');

      // Use Aliased Names in DOCX Headers (Origin/Dest) - Allowed
      const sourceRaw = session.sourceName || session.sourceNumber;
      const destRaw = session.destinationName || session.destinationNumber;
      const sourceStr = getDisplay(sourceRaw);
      const destStr = getDisplay(destRaw);

      const docChildren = [
        new Paragraph({
          text: `SESSÃO: ${session.sessionId}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 }
        }),
        // Origin and Destination Line
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
                new TextRun({ text: "ORIGEM: ", bold: true, size: 22 }),
                new TextRun({ text: sourceStr, size: 22 }),
                new TextRun({ text: "   ➜   ", bold: true, size: 22, color: "0000FF" }),
                new TextRun({ text: "DESTINO: ", bold: true }),
                new TextRun({ text: destStr, size: 22 }),
            ]
        }),
        // Date and Time Line
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            border: { bottom: { color: "CCCCCC", space: 1, value: BorderStyle.SINGLE, size: 6 } },
            children: [
                new TextRun({ text: `DATA: ${session.date}`, bold: true, size: 20 }),
                new TextRun({ text: `   |   ${timeInfo}`, size: 20, color: "666666" })
            ]
        })
      ];

      // Content Lines with Speaker Bolding
      const lines = session.content.split(/\n/);
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
            const speakerMatch = trimmedLine.match(/^([A-ZÀ-Úa-zà-ú0-9_\-\s\.()]{1,50}:)(.*)/);

            if (speakerMatch) {
                // DO NOT Alias speaker name in body text. Use original from PDF.
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ 
                                text: speakerMatch[1], // Original "Name:"
                                bold: true, 
                                size: 24,
                                font: "Calibri"
                            }),
                            new TextRun({ 
                                text: speakerMatch[2], 
                                size: 24,
                                font: "Calibri"
                            })
                        ],
                        spacing: { after: 120, before: 60 }
                    })
                );
            } else {
                docChildren.push(
                    new Paragraph({
                        children: [new TextRun({ text: trimmedLine, size: 24, font: "Calibri" })],
                        spacing: { after: 120, before: 60 }
                    })
                );
            }
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const docxBuffer = await Packer.toBuffer(doc);
      zip.folder(folderNameEditable)?.file(docxFilename, docxBuffer);

    } catch (e) {
      console.error(`Error processing session ${session.sessionId}:`, e);
    }
  }

  return await zip.generateAsync({ type: "blob" });
};