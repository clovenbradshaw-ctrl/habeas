/**
 * Parse imported files (PDF, DOCX, MD, JSON, TXT) and extract text content.
 * Heading-aware section detection for legal documents.
 */

const FILE_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/json': 'json',
  'text/markdown': 'md',
  'text/plain': 'txt',
};

const EXT_MAP = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
  '.json': 'json',
  '.md': 'md',
  '.markdown': 'md',
  '.txt': 'txt',
  '.text': 'txt',
};

function getFileType(file) {
  if (FILE_TYPES[file.type]) return FILE_TYPES[file.type];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return EXT_MAP[ext] || null;
}

function generateSectionId(idx) {
  return `s_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── File reading helpers ──

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

// ── Text normalization ──

/**
 * Strip page headers/footers (PDF artifacts), collapse excessive newlines, trim.
 */
function normalizeText(text) {
  let result = text;
  // Strip PDF page headers like "Case 1:25-cv-01793 Document 1 Filed... Page X of Y... PageID# NNN"
  result = result.replace(/^Case \d+:\d+-cv-\d+\s+Document.+Page \d+ of \d+.+PageID#\s*\d+$/gm, '');
  // Strip standalone page numbers
  result = result.replace(/^\d+$/gm, '');
  // Collapse 3+ consecutive newlines to 2
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

// ── Section detection ──

/**
 * Known legal section heading keywords. If a line starts with one of these
 * (and is all-caps), it's treated as a section heading even at the start
 * of a document. This prevents caption text like "UNITED STATES DISTRICT COURT"
 * from being mistakenly treated as section headings.
 */
const KNOWN_HEADING_STARTS = [
  'INTRODUCTION', 'CUSTODY', 'JURISDICTION', 'VENUE', 'PARTIES',
  'EXHAUSTION', 'REQUIREMENTS', 'LEGAL BACKGROUND', 'STATEMENT OF FACTS',
  'PRAYER FOR RELIEF', 'VERIFICATION', 'SIGNATURE',
  'CONCLUSION', 'ARGUMENT', 'BACKGROUND', 'PRELIMINARY STATEMENT',
  'CAUSE OF ACTION', 'CLAIMS', 'CERTIFICATE', 'MEMORANDUM',
  'RELIEF REQUESTED', 'WHEREFORE', 'FACTUAL ALLEGATIONS',
  'NATURE OF THE ACTION', 'STANDARD OF REVIEW',
];

/**
 * Check if a line starts with a known legal heading keyword.
 */
function isKnownHeading(line) {
  const trimmed = line.trim().toUpperCase();
  return KNOWN_HEADING_STARTS.some(kw => trimmed === kw || trimmed.startsWith(kw + ' '));
}

/**
 * Check if a line is an all-caps legal heading.
 * Must be all uppercase (ignoring punctuation, digits, special chars like section signs),
 * at least 4 chars of letter content.
 */
function isAllCapsHeading(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Strip punctuation/digits/special chars to check letter content
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return false;
  // All letters must be uppercase
  if (letters !== letters.toUpperCase()) return false;
  // Must not be a variable like {{SOME_VAR}}
  if (/\{\{[A-Z_]+\}\}/.test(trimmed)) return false;
  return true;
}

/**
 * Check if a line is a COUNT heading (e.g. "COUNT I", "COUNT II", "COUNT III").
 */
function isCountHeading(line) {
  return /^COUNT\s+[IVXLC]+$/i.test(line.trim());
}

/**
 * Check if a line starts a numbered paragraph (e.g. "44. Petitioner...").
 */
function isNumberedParagraph(line) {
  return /^\d+\.\s/.test(line.trim());
}

/**
 * Detect section boundaries in normalized text and return Section[] objects.
 *
 * Algorithm:
 * 1. Scan lines for all-caps headings, COUNT headings
 * 2. Everything before the first heading becomes "Caption"
 * 3. COUNT headings merge with sub-heading lines until the first numbered paragraph
 * 4. Build sections with content between consecutive headings
 */
export function detectSections(text) {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');

  // Two-pass heading detection:
  // Pass 1: Find the first "known" legal heading (e.g. INTRODUCTION, JURISDICTION).
  //         Everything before it is the Caption.
  // Pass 2: From that point onward, any all-caps line preceded by blank is a heading.
  //         This prevents caption text (e.g. "UNITED STATES DISTRICT COURT") from
  //         being treated as section headings.

  // Find the index of the first known legal heading
  let firstKnownIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const precededByBlank = i === 0 || (i > 0 && !lines[i - 1].trim());
    if (precededByBlank && isAllCapsHeading(line) && isKnownHeading(line)) {
      firstKnownIdx = i;
      break;
    }
    if (precededByBlank && isCountHeading(line)) {
      firstKnownIdx = i;
      break;
    }
  }

  // Find all heading boundary indices
  const boundaries = []; // { index, name, type }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const precededByBlank = i === 0 || (i > 0 && !lines[i - 1].trim());
    if (!precededByBlank) continue;

    // Before the first known heading, only accept known headings and COUNTs
    // After the first known heading, accept any all-caps heading
    const isBeforeFirstKnown = firstKnownIdx >= 0 && i < firstKnownIdx;

    if (isCountHeading(line)) {
      boundaries.push({ index: i, name: line.trim(), type: 'count' });
    } else if (isAllCapsHeading(line)) {
      if (isBeforeFirstKnown) {
        // Skip non-known headings before the first known heading (caption text)
        continue;
      }
      boundaries.push({ index: i, name: line.trim(), type: 'heading' });
    }
  }

  // If no headings found, return empty (caller should fall back)
  if (boundaries.length === 0) return [];

  // Build sections from boundaries
  const sections = [];

  // Caption: everything before the first heading
  if (boundaries[0].index > 0) {
    const captionLines = lines.slice(0, boundaries[0].index);
    const captionContent = captionLines.join('\n').trim();
    if (captionContent) {
      sections.push(buildSection('Caption', captionContent));
    }
  }

  for (let b = 0; b < boundaries.length; b++) {
    const boundary = boundaries[b];
    const nextBoundary = boundaries[b + 1];
    const endIndex = nextBoundary ? nextBoundary.index : lines.length;

    // Content lines: everything from the line after the heading to the next boundary
    let contentStartIndex = boundary.index + 1;
    let sectionName = boundary.name;

    if (boundary.type === 'count') {
      // For COUNT headings, merge sub-heading lines into the name.
      // Sub-headings are lines between the COUNT heading and the first numbered paragraph.
      const subHeadings = [];
      let firstNumberedIdx = -1;

      for (let j = boundary.index + 1; j < endIndex; j++) {
        const trimmed = lines[j].trim();
        if (!trimmed) continue;
        if (isNumberedParagraph(trimmed)) {
          firstNumberedIdx = j;
          break;
        }
        // This is a sub-heading line
        subHeadings.push(trimmed);
      }

      if (subHeadings.length > 0) {
        sectionName = boundary.name + ' \u2014 ' + subHeadings.join(' \u2014 ');
      }

      if (firstNumberedIdx >= 0) {
        contentStartIndex = firstNumberedIdx;
      } else {
        // No numbered paragraphs found; content starts after sub-headings
        contentStartIndex = boundary.index + 1 + subHeadings.length;
        // Adjust for blank lines between sub-headings
        for (let j = boundary.index + 1; j < endIndex; j++) {
          const trimmed = lines[j].trim();
          if (!trimmed) continue;
          if (!subHeadings.includes(trimmed)) {
            contentStartIndex = j;
            break;
          }
          contentStartIndex = j + 1;
        }
      }
    }

    const contentLines = lines.slice(contentStartIndex, endIndex);
    const content = contentLines.join('\n').trim();

    // Skip sections with empty content
    if (!content) continue;

    sections.push(buildSection(sectionName, content));
  }

  return sections;
}

/**
 * Build a Section object from name and raw content text.
 */
function buildSection(name, rawContent) {
  // Normalize paragraph breaks: collapse 3+ newlines to 2
  const content = rawContent.replace(/\n{3,}/g, '\n\n').trim();
  const paraCount = content.split(/\n\n+/).filter(p => p.trim()).length;

  return {
    id: generateSectionId(Math.floor(Math.random() * 10000)),
    name,
    required: true,
    paraCount,
    content,
  };
}

// ── Variable extraction ──

/**
 * Extract unique variable names from text, sorted alphabetically.
 */
export function extractVariables(text) {
  const matches = text.match(/\{\{([A-Z_]+)\}\}/g);
  if (!matches) return [];
  const vars = new Set(matches.map(m => m.replace(/[{}]/g, '')));
  return Array.from(vars).sort();
}

// ── Format-specific parsers ──

/**
 * Extract text from PDF with paragraph break detection using vertical gap analysis.
 */
export async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).href;

  const buffer = await readAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  let metadata = {};

  // Try to extract PDF metadata
  try {
    const info = await pdf.getMetadata();
    if (info?.info?.Title) metadata.name = info.info.Title;
    if (info?.info?.Author) metadata.author = info.info.Author;
  } catch {
    // metadata extraction is optional
  }

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter(item => item.str !== undefined);

    if (items.length === 0) {
      pages.push('');
      continue;
    }

    // Group items by y-coordinate (lines) with threshold
    const Y_THRESHOLD = 2;
    const lineGroups = [];
    let currentLine = [items[0]];
    let currentY = items[0].transform[5];

    for (let j = 1; j < items.length; j++) {
      const item = items[j];
      const itemY = item.transform[5];
      if (Math.abs(itemY - currentY) <= Y_THRESHOLD) {
        currentLine.push(item);
      } else {
        lineGroups.push({ items: currentLine, y: currentY });
        currentLine = [item];
        currentY = itemY;
      }
    }
    lineGroups.push({ items: currentLine, y: currentY });

    // Sort line groups by y-coordinate (top to bottom, PDF y is bottom-up)
    lineGroups.sort((a, b) => b.y - a.y);

    // Calculate average line height for paragraph break detection
    const lineHeights = [];
    for (let j = 1; j < lineGroups.length; j++) {
      const gap = Math.abs(lineGroups[j - 1].y - lineGroups[j].y);
      if (gap > 0) lineHeights.push(gap);
    }
    const avgLineHeight = lineHeights.length > 0
      ? lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length
      : 12;
    const paraBreakThreshold = avgLineHeight * 1.5;

    // Build text with appropriate line breaks
    const pageLines = [];
    for (let j = 0; j < lineGroups.length; j++) {
      const group = lineGroups[j];
      // Sort items within line by x-coordinate (left to right)
      const sorted = [...group.items].sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = sorted.map(item => item.str).join(' ').trim();

      if (j > 0) {
        const gap = Math.abs(lineGroups[j - 1].y - group.y);
        if (gap > paraBreakThreshold) {
          pageLines.push(''); // empty line = paragraph break
        }
      }
      if (lineText) {
        pageLines.push(lineText);
      }
    }

    pages.push(pageLines.join('\n'));
  }

  return { text: pages.join('\n\n'), metadata };
}

/**
 * Extract text from DOCX with paragraph break normalization.
 */
export async function extractTextFromDOCX(file) {
  const mammoth = await import('mammoth');
  const buffer = await readAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  let text = result.value;

  // mammoth outputs one \n per paragraph. Convert to \n\n between paragraphs.
  // Replace single \n between non-empty lines with \n\n
  text = text.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
  // Collapse 3+ newlines to \n\n
  text = text.replace(/\n{3,}/g, '\n\n');

  // Strip Word artifacts: smart quotes, em dashes
  text = text.replace(/[\u2018\u2019]/g, "'");
  text = text.replace(/[\u201C\u201D]/g, '"');
  text = text.replace(/\u2014/g, '--');
  text = text.replace(/\u2013/g, '-');

  return { text, metadata: {} };
}

/**
 * Extract text from Markdown, stripping frontmatter and formatting.
 */
export function extractTextFromMarkdown(fileContent) {
  let text = fileContent;
  const metadata = {};

  // Strip YAML frontmatter
  const frontmatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    text = text.slice(frontmatterMatch[0].length);

    // Parse simple YAML key: value pairs
    for (const line of frontmatter.split('\n')) {
      const match = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (key === 'name') metadata.name = val;
        else if (key === 'category') metadata.category = val;
        else if (key === 'desc' || key === 'description') metadata.desc = val;
      }
    }
  }

  // Strip Markdown formatting but preserve {{VARIABLE}} patterns.
  // Protect variable patterns by replacing them with placeholders first.
  const varPlaceholders = [];
  text = text.replace(/\{\{[A-Z_]+\}\}/g, (match) => {
    varPlaceholders.push(match);
    return `\x00VAR${varPlaceholders.length - 1}\x00`;
  });

  // Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  // Italic: *text* or _text_
  text = text.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '$1');
  text = text.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '$1');
  // Blockquotes: > text
  text = text.replace(/^>\s?/gm, '');

  // Restore variable patterns
  text = text.replace(/\x00VAR(\d+)\x00/g, (_, idx) => varPlaceholders[parseInt(idx)]);

  return { text: text.trim(), metadata };
}

/**
 * Parse a JSON file as a template. Returns either:
 * - A complete template object (if it has sections[])
 * - An object with text + metadata (if it has a flat content string)
 */
export async function parseTemplateJSON(file) {
  const raw = await readAsText(file);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file');
  }

  // Validate minimum requirements
  if (!data.name && !data.content && !data.sections) {
    throw new Error('JSON must have at least "name", "content", or "sections"');
  }

  // Option A: Native template with sections[]
  if (data.sections && Array.isArray(data.sections)) {
    // Validate sections
    for (const sec of data.sections) {
      if (!sec.name || sec.content === undefined) {
        throw new Error('Each section must have "name" and "content"');
      }
    }

    // Generate IDs if missing, recount paraCount, re-extract variables
    const sections = data.sections
      .map((sec, i) => ({
        id: sec.id || generateSectionId(i),
        name: sec.name,
        required: sec.required !== undefined ? sec.required : true,
        paraCount: sec.content.split(/\n\n+/).filter(p => p.trim()).length,
        content: sec.content,
        ...(sec.condition ? { condition: sec.condition } : {}),
      }))
      .filter(sec => sec.content.trim()); // Drop empty sections

    const allContent = sections.map(s => s.content).join('\n\n');
    const variables = extractVariables(allContent);

    return {
      type: 'native',
      template: {
        name: data.name || file.name.replace(/\.[^.]+$/, ''),
        category: data.category || 'petition',
        desc: data.desc || '',
        sections,
        variables,
      },
    };
  }

  // Option B: Flat text with metadata
  if (data.content) {
    return {
      type: 'flat',
      text: data.content,
      metadata: {
        name: data.name || file.name.replace(/\.[^.]+$/, ''),
        category: data.category || 'petition',
        desc: data.desc || '',
      },
    };
  }

  // Has name but no content/sections - treat as empty template
  throw new Error('JSON must have "content" or "sections"');
}

// ── Fallback chunking (for documents with no detected headings) ──

function chunkText(text, chunkSize = 2000) {
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim());
  const sections = [];
  let current = '';
  let sectionIdx = 1;

  for (const para of paragraphs) {
    if (current.length + para.length > chunkSize && current.length > 0) {
      sections.push(buildSection(`Section ${sectionIdx}`, current));
      sectionIdx++;
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) {
    sections.push(buildSection(
      sections.length === 0 ? 'Content' : `Section ${sectionIdx}`,
      current
    ));
  }
  return sections;
}

// ── Markdown section splitting ──

/**
 * Split Markdown text into sections using Markdown headings (# or ##).
 * Falls back to legal heading detection if no Markdown headings found.
 */
function detectMarkdownSections(text) {
  const lines = text.split('\n');
  const headingPattern = /^#{1,2}\s+(.+)$/;
  const headings = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingPattern);
    if (match) {
      headings.push({ index: i, name: match[1].trim() });
    }
  }

  // If no Markdown headings, fall back to legal heading detection
  if (headings.length === 0) return null;

  const sections = [];

  // Content before the first heading
  if (headings[0].index > 0) {
    const preContent = lines.slice(0, headings[0].index).join('\n').trim();
    if (preContent) {
      sections.push(buildSection('Caption', preContent));
    }
  }

  for (let h = 0; h < headings.length; h++) {
    const endIndex = h + 1 < headings.length ? headings[h + 1].index : lines.length;
    const content = lines.slice(headings[h].index + 1, endIndex).join('\n').trim();
    if (!content) continue;
    sections.push(buildSection(headings[h].name, content));
  }

  return sections;
}

// ── High-level import ──

/**
 * Import a file and return a complete template object ready for dispatch.
 *
 * @param {File} file - The file to import
 * @param {object} opts - Optional overrides: { name, category, desc }
 * @returns {Promise<object>} - Template object with sections and variables
 */
export async function importTemplate(file, opts = {}) {
  const fileType = getFileType(file);
  if (!fileType) {
    throw new Error(`Unsupported file type: ${file.name}. Supported: PDF, DOCX, JSON, MD, TXT`);
  }

  const fileName = file.name.replace(/\.[^.]+$/, '');
  let sections = [];
  let templateMeta = {
    name: opts.name || fileName,
    category: opts.category || 'petition',
    desc: opts.desc || `Imported from ${file.name}`,
  };

  switch (fileType) {
    case 'json': {
      const result = await parseTemplateJSON(file);
      if (result.type === 'native') {
        // Native JSON template: use sections directly
        templateMeta.name = opts.name || result.template.name;
        templateMeta.category = opts.category || result.template.category;
        templateMeta.desc = opts.desc || result.template.desc || templateMeta.desc;
        return {
          name: templateMeta.name,
          category: templateMeta.category,
          desc: templateMeta.desc,
          sections: result.template.sections,
          variables: result.template.variables,
        };
      }
      // Flat JSON: run section detection on the content
      templateMeta.name = opts.name || result.metadata.name;
      templateMeta.category = opts.category || result.metadata.category;
      templateMeta.desc = opts.desc || result.metadata.desc || templateMeta.desc;
      sections = detectSections(result.text);
      if (sections.length === 0) {
        console.warn('No headings detected in JSON content, falling back to chunking');
        sections = chunkText(result.text);
      }
      break;
    }

    case 'md': {
      const raw = await readAsText(file);
      const { text, metadata } = extractTextFromMarkdown(raw);
      templateMeta.name = opts.name || metadata.name || fileName;
      templateMeta.category = opts.category || metadata.category || 'petition';
      templateMeta.desc = opts.desc || metadata.desc || templateMeta.desc;

      // Try Markdown headings first
      const mdSections = detectMarkdownSections(text);
      if (mdSections && mdSections.length > 0) {
        sections = mdSections;
      } else {
        // Fall back to legal heading detection
        sections = detectSections(text);
        if (sections.length === 0) {
          console.warn('No headings detected in Markdown, falling back to chunking');
          sections = chunkText(text);
        }
      }
      break;
    }

    case 'pdf': {
      const { text, metadata } = await extractTextFromPDF(file);
      templateMeta.name = opts.name || metadata.name || fileName;
      if (metadata.author) templateMeta.desc = opts.desc || `By ${metadata.author}`;

      sections = detectSections(text);
      if (sections.length === 0) {
        console.warn('No headings detected in PDF, falling back to chunking');
        sections = chunkText(text);
      }
      break;
    }

    case 'docx': {
      const { text } = await extractTextFromDOCX(file);
      sections = detectSections(text);
      if (sections.length === 0) {
        console.warn('No headings detected in DOCX, falling back to chunking');
        sections = chunkText(text);
      }
      break;
    }

    case 'txt': {
      const text = await readAsText(file);
      sections = detectSections(text);
      if (sections.length === 0) {
        console.warn('No headings detected in text file, falling back to chunking');
        sections = chunkText(text);
      }
      break;
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Ensure at least one section
  if (sections.length === 0) {
    sections = [buildSection('Content', '')];
  }

  // Extract variables from all section content
  const allContent = sections.map(s => s.content).join('\n\n');
  const variables = extractVariables(allContent);

  return {
    name: templateMeta.name,
    category: templateMeta.category,
    desc: templateMeta.desc,
    sections,
    variables,
  };
}

// ── Legacy export for backward compatibility ──

export async function parseImportedFile(file) {
  const fileType = getFileType(file);
  if (!fileType) {
    throw new Error(`Unsupported file type: ${file.name}. Supported: PDF, DOCX, JSON, MD, TXT`);
  }

  let text;
  switch (fileType) {
    case 'pdf': {
      const result = await extractTextFromPDF(file);
      text = result.text;
      break;
    }
    case 'docx': {
      const result = await extractTextFromDOCX(file);
      text = result.text;
      break;
    }
    case 'json':
    case 'md':
    case 'txt':
      text = await readAsText(file);
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  return { text, fileType };
}
