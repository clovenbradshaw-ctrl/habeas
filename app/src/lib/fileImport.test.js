import { describe, it, expect } from 'vitest';
import { detectSections, extractVariables, extractTextFromMarkdown, stripHtmlToText } from './fileImport';

// ── detectSections ──

describe('detectSections', () => {
  it('detects all-caps legal headings and creates sections', () => {
    const text = `UNITED STATES DISTRICT COURT
FOR THE EASTERN DISTRICT

Petitioner v. Respondent

INTRODUCTION

1. This is the introduction paragraph.

2. This is the second paragraph.

JURISDICTION

7. This court has jurisdiction under 28 U.S.C. § 2241.`;

    const sections = detectSections(text);

    expect(sections.length).toBe(3);
    expect(sections[0].name).toBe('Caption');
    expect(sections[0].content).toContain('UNITED STATES DISTRICT COURT');
    expect(sections[1].name).toBe('INTRODUCTION');
    expect(sections[1].content).toContain('1. This is the introduction paragraph.');
    expect(sections[2].name).toBe('JURISDICTION');
    expect(sections[2].content).toContain('28 U.S.C. § 2241');
  });

  it('returns empty array when no headings are found', () => {
    const text = `This is just a plain paragraph with no structure.
It has some text but no legal headings.`;

    const sections = detectSections(text);
    expect(sections).toEqual([]);
  });

  it('handles COUNT headings with sub-heading merging', () => {
    const text = `STATEMENT OF FACTS

38. Petitioner is a citizen of Honduras.

COUNT I
Violation of 8 U.S.C. § 1226(a)
Unlawful Denial of Release on Bond

44. Petitioner restates and realleges all paragraphs.

45. Petitioner may be detained pursuant to 8 U.S.C. § 1226(a).

COUNT II
Violation of the Bond Regulations

49. Petitioner restates and realleges all paragraphs.`;

    const sections = detectSections(text);

    // Should have: STATEMENT OF FACTS, COUNT I (merged), COUNT II (merged)
    expect(sections.length).toBe(3);
    expect(sections[0].name).toBe('STATEMENT OF FACTS');

    // COUNT I should have merged sub-headings
    expect(sections[1].name).toContain('COUNT I');
    expect(sections[1].name).toContain('Violation of 8 U.S.C. § 1226(a)');
    expect(sections[1].name).toContain('Unlawful Denial of Release on Bond');
    // Content should start at the numbered paragraph
    expect(sections[1].content).toContain('44. Petitioner restates');

    // COUNT II
    expect(sections[2].name).toContain('COUNT II');
    expect(sections[2].name).toContain('Violation of the Bond Regulations');
    expect(sections[2].content).toContain('49. Petitioner restates');
  });

  it('creates Caption section for content before first heading', () => {
    const text = `UNITED STATES DISTRICT COURT
FOR THE EASTERN DISTRICT

Petitioner v. Respondent

INTRODUCTION

1. Introduction text here.`;

    const sections = detectSections(text);
    expect(sections[0].name).toBe('Caption');
    expect(sections[0].content).toContain('UNITED STATES DISTRICT COURT');
  });

  it('does not create Caption when document starts with a heading', () => {
    const text = `INTRODUCTION

1. Introduction text here.

JURISDICTION

7. Jurisdiction text.`;

    const sections = detectSections(text);
    expect(sections[0].name).toBe('INTRODUCTION');
    expect(sections.find(s => s.name === 'Caption')).toBeUndefined();
  });

  it('drops sections with empty content', () => {
    const text = `INTRODUCTION

JURISDICTION

7. Jurisdiction text here.`;

    const sections = detectSections(text);
    // INTRODUCTION has no content (immediately followed by another heading)
    // so it should be dropped
    const introSection = sections.find(s => s.name === 'INTRODUCTION');
    expect(introSection).toBeUndefined();
    expect(sections.find(s => s.name === 'JURISDICTION')).toBeDefined();
  });

  it('strips PDF page artifacts', () => {
    const text = `INTRODUCTION

1. Paragraph one.

Case 1:25-cv-01793 Document 1 Filed 09/01/2025 Page 2 of 15 PageID# 2

2. Paragraph two continues.`;

    const sections = detectSections(text);
    expect(sections[0].name).toBe('INTRODUCTION');
    // The page artifact line should be stripped
    expect(sections[0].content).not.toContain('Case 1:25-cv-01793');
    expect(sections[0].content).toContain('1. Paragraph one.');
    expect(sections[0].content).toContain('2. Paragraph two continues.');
  });

  it('handles headings with special characters (section signs, numbers)', () => {
    const text = `Caption block here

REQUIREMENTS OF 28 U.S.C. §§ 2241, 2243

10. The Court must grant the petition.

EXHAUSTION OF ADMINISTRATIVE REMEDIES

13. Administrative exhaustion is unnecessary.`;

    const sections = detectSections(text);
    expect(sections.length).toBe(3);
    expect(sections[1].name).toBe('REQUIREMENTS OF 28 U.S.C. §§ 2241, 2243');
    expect(sections[2].name).toBe('EXHAUSTION OF ADMINISTRATIVE REMEDIES');
  });

  it('correctly counts paragraphs in sections', () => {
    const text = `INTRODUCTION

First paragraph of the introduction.

Second paragraph of the introduction.

Third paragraph of the introduction.`;

    const sections = detectSections(text);
    expect(sections[0].name).toBe('INTRODUCTION');
    expect(sections[0].paraCount).toBe(3);
  });

  it('generates unique IDs for sections', () => {
    const text = `INTRODUCTION

Intro text.

JURISDICTION

Jurisdiction text.`;

    const sections = detectSections(text);
    const ids = sections.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    ids.forEach(id => expect(id).toMatch(/^s_\d+_\d+_[a-z0-9]+$/));
  });

  it('sets required=true for all detected sections', () => {
    const text = `INTRODUCTION

Intro text.

JURISDICTION

Jurisdiction text.`;

    const sections = detectSections(text);
    sections.forEach(s => expect(s.required).toBe(true));
  });

  it('does not treat {{VARIABLE}} lines as headings', () => {
    const text = `INTRODUCTION

{{PETITIONER_FULL_NAME}} is the petitioner.

JURISDICTION

This court has jurisdiction.`;

    const sections = detectSections(text);
    // {{PETITIONER_FULL_NAME}} should not be a heading
    expect(sections.find(s => s.name.includes('PETITIONER'))).toBeUndefined();
    expect(sections[0].name).toBe('INTRODUCTION');
    expect(sections[0].content).toContain('{{PETITIONER_FULL_NAME}}');
  });
});

// ── extractVariables ──

describe('extractVariables', () => {
  it('extracts unique variable names sorted alphabetically', () => {
    const text = `Petitioner {{PETITIONER_FULL_NAME}} is from {{PETITIONER_COUNTRY}}.
He was detained at {{DETENTION_FACILITY_NAME}}.
{{PETITIONER_FULL_NAME}} seeks relief.`;

    const vars = extractVariables(text);
    expect(vars).toEqual([
      'DETENTION_FACILITY_NAME',
      'PETITIONER_COUNTRY',
      'PETITIONER_FULL_NAME',
    ]);
  });

  it('returns empty array when no variables found', () => {
    const text = 'This text has no template variables.';
    expect(extractVariables(text)).toEqual([]);
  });

  it('handles many repeated variables', () => {
    const text = Array(50).fill('{{COURT_DISTRICT}} and {{PETITIONER_FULL_NAME}}').join(' ');
    const vars = extractVariables(text);
    expect(vars).toEqual(['COURT_DISTRICT', 'PETITIONER_FULL_NAME']);
  });

  it('does not match lowercase or mixed case variables', () => {
    const text = '{{lowercase}} {{Mixed_Case}} {{VALID_VAR}}';
    const vars = extractVariables(text);
    expect(vars).toEqual(['VALID_VAR']);
  });
});

// ── extractTextFromMarkdown ──

describe('extractTextFromMarkdown', () => {
  it('strips YAML frontmatter and extracts metadata', () => {
    const content = `---
name: habeas_petition_template
category: petition
desc: A test template
---

# Caption

UNITED STATES DISTRICT COURT`;

    const { text, metadata } = extractTextFromMarkdown(content);
    expect(metadata.name).toBe('habeas_petition_template');
    expect(metadata.category).toBe('petition');
    expect(metadata.desc).toBe('A test template');
    expect(text).not.toContain('---');
    expect(text).toContain('# Caption');
  });

  it('strips bold and italic formatting', () => {
    const content = `**Bold text** and *italic text* and __also bold__ and _also italic_.`;
    const { text } = extractTextFromMarkdown(content);
    expect(text).toBe('Bold text and italic text and also bold and also italic.');
  });

  it('strips blockquote markers', () => {
    const content = `> This is a blockquote
> It continues here`;
    const { text } = extractTextFromMarkdown(content);
    expect(text).toContain('This is a blockquote');
    expect(text).not.toContain('>');
  });

  it('preserves {{VARIABLE}} patterns', () => {
    const content = `The {{PETITIONER_FULL_NAME}} filed in {{COURT_DISTRICT}}.`;
    const { text } = extractTextFromMarkdown(content);
    expect(text).toContain('{{PETITIONER_FULL_NAME}}');
    expect(text).toContain('{{COURT_DISTRICT}}');
  });

  it('handles content without frontmatter', () => {
    const content = `# Introduction

Some text here.`;
    const { text, metadata } = extractTextFromMarkdown(content);
    expect(metadata).toEqual({});
    expect(text).toContain('# Introduction');
  });
});

// ── Full document integration test ──

describe('full legal document section detection', () => {
  it('detects sections from a habeas petition structure', () => {
    const petition = `UNITED STATES DISTRICT COURT
FOR THE EASTERN DISTRICT OF VIRGINIA

{{PETITIONER_FULL_NAME}},

Petitioner-Plaintiff,

v.

{{WARDEN_NAME}}, Respondent.

PETITION FOR WRIT OF HABEAS CORPUS

INTRODUCTION

1. Petitioner {{PETITIONER_FULL_NAME}} is a citizen of {{PETITIONER_COUNTRY}}.

2. Petitioner is currently detained at the {{DETENTION_FACILITY_NAME}}.

CUSTODY

6. Petitioner is currently in the custody of ICE.

JURISDICTION

7. This court has jurisdiction under 28 U.S.C. § 2241.

VENUE

12. Venue is properly before this Court.

EXHAUSTION OF ADMINISTRATIVE REMEDIES

13. Administrative exhaustion is unnecessary.

PARTIES

16. Petitioner is from {{PETITIONER_COUNTRY}}.

LEGAL BACKGROUND AND ARGUMENT

22. The INA prescribes three basic forms of detention.

STATEMENT OF FACTS

38. Petitioner is a citizen of {{PETITIONER_COUNTRY}}.

COUNT I
Violation of 8 U.S.C. § 1226(a)
Unlawful Denial of Release on Bond

44. Petitioner restates and realleges all paragraphs.

COUNT II
Violation of the Bond Regulations, 8 C.F.R. §§ 236.1, 1236.1 and 1003.19

49. Petitioner restates and realleges all paragraphs.

COUNT III
Violation of Fifth Amendment Right to Due Process

52. Petitioner restates and realleges all paragraphs.

PRAYER FOR RELIEF

WHEREFORE, Petitioner prays that this Court will grant relief.

VERIFICATION PURSUANT TO 28 U.S.C. § 2242

I represent Petitioner and submit this verification.`;

    const sections = detectSections(petition);

    // Should detect approximately 12-14 sections
    expect(sections.length).toBeGreaterThanOrEqual(12);
    expect(sections.length).toBeLessThanOrEqual(16);

    // Check key sections exist
    const names = sections.map(s => s.name);
    expect(names).toContain('Caption');
    expect(names).toContain('INTRODUCTION');
    expect(names).toContain('CUSTODY');
    expect(names).toContain('JURISDICTION');
    expect(names).toContain('VENUE');
    expect(names).toContain('EXHAUSTION OF ADMINISTRATIVE REMEDIES');
    expect(names).toContain('PARTIES');
    expect(names).toContain('LEGAL BACKGROUND AND ARGUMENT');
    expect(names).toContain('STATEMENT OF FACTS');
    expect(names).toContain('PRAYER FOR RELIEF');

    // Check COUNT sections have merged sub-headings
    const count1 = sections.find(s => s.name.includes('COUNT I') && !s.name.includes('COUNT II') && !s.name.includes('COUNT III'));
    expect(count1).toBeDefined();
    expect(count1.name).toContain('Violation of 8 U.S.C. § 1226(a)');

    const count2 = sections.find(s => s.name.includes('COUNT II'));
    expect(count2).toBeDefined();
    expect(count2.name).toContain('Violation of the Bond Regulations');

    const count3 = sections.find(s => s.name.includes('COUNT III'));
    expect(count3).toBeDefined();
    expect(count3.name).toContain('Violation of Fifth Amendment');

    // Check variables are extractable from section content
    const allContent = sections.map(s => s.content).join('\n\n');
    const vars = extractVariables(allContent);
    expect(vars).toContain('PETITIONER_FULL_NAME');
    expect(vars).toContain('PETITIONER_COUNTRY');
    expect(vars).toContain('DETENTION_FACILITY_NAME');
    expect(vars).toContain('WARDEN_NAME');
  });
});


describe('stripHtmlToText', () => {
  it('converts simple html to plain text', () => {
    const html = '<div><p>Hello&nbsp;{{NAME}}</p><p>Line &amp; More</p></div>';
    expect(stripHtmlToText(html)).toBe('Hello {{NAME}}\n\nLine & More');
  });
});
