/**
 * Parse imported files (PDF, DOCX, MD, TXT) and extract text content.
 */

const FILE_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/markdown': 'md',
  'text/plain': 'txt',
};

const EXT_MAP = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
  '.md': 'md',
  '.markdown': 'md',
  '.txt': 'txt',
  '.text': 'txt',
};

function getFileType(file) {
  // Try MIME type first
  if (FILE_TYPES[file.type]) return FILE_TYPES[file.type];
  // Fall back to extension
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return EXT_MAP[ext] || null;
}

async function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

async function parsePDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).href;

  const buffer = await readAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push(text);
  }
  return pages.join('\n\n');
}

async function parseDOCX(file) {
  const mammoth = await import('mammoth');
  const buffer = await readAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

export async function parseImportedFile(file) {
  const fileType = getFileType(file);
  if (!fileType) {
    throw new Error(`Unsupported file type: ${file.name}. Supported: PDF, DOCX, MD, TXT`);
  }

  let text;
  switch (fileType) {
    case 'pdf':
      text = await parsePDF(file);
      break;
    case 'docx':
      text = await parseDOCX(file);
      break;
    case 'md':
    case 'txt':
      text = await readAsText(file);
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  return { text, fileType };
}
