import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  GUIDE_DOC_SHORTCUTS,
  SECTION_SHORTCUTS,
  getNodeText,
  slugify,
} from '../../src/ui/guide/guideUtils';
import yamlAuthoringGuideRaw from '../../docs/YAML_AUTHORING_GUIDE.md?raw';
import scriptSpecificationRaw from '../../docs/STAGEFLOW_SCRIPT_SPECIFICATION.md?raw';

describe('guideUtils', () => {
  it('correctly extracts text from string, array, and nested React elements', () => {
    expect(getNodeText('Hello World')).toBe('Hello World');
    expect(getNodeText(['Hello ', 'World'])).toBe('Hello World');
    expect(
      getNodeText([
        '4. Scene Entities (',
        React.createElement('code', null, 'entities:'),
        ')',
      ])
    ).toBe('4. Scene Entities (entities:)');
  });

  it('slugifies headings reliably without double hyphens or punctuation', () => {
    expect(slugify('1. Introduction & Spatial Architecture')).toBe('1-introduction-spatial-architecture');
    expect(slugify('2. Quickstart & Minimal Score Anatomy')).toBe('2-quickstart-minimal-score-anatomy');
    expect(slugify('3. Scene Foundation (Root, Stage & Entities)')).toBe('3-scene-foundation-root-stage-entities');
    expect(slugify("7. Director's Cookbook (8 Production Recipes)")).toBe('7-director-s-cookbook-8-production-recipes');
  });

  it('ensures docs/YAML_AUTHORING_GUIDE.md code blocks have perfectly balanced fences', () => {
    const fenceLines = yamlAuthoringGuideRaw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('```'));

    expect(fenceLines.length).toBeGreaterThan(0);
    expect(fenceLines.length % 2).toBe(0);
  });

  it('ensures every guide shortcut corresponds to an actual h2 in docs/YAML_AUTHORING_GUIDE.md', () => {
    const h2Lines = yamlAuthoringGuideRaw
      .split('\n')
      .filter((line) => line.startsWith('## '));

    expect(h2Lines.length).toBe(GUIDE_DOC_SHORTCUTS.guide.length);
    expect(SECTION_SHORTCUTS.length).toBe(GUIDE_DOC_SHORTCUTS.guide.length);

    GUIDE_DOC_SHORTCUTS.guide.forEach((sec, idx) => {
      const line = h2Lines[idx];
      expect(sec.id).toBe(`section-${idx + 1}`);
      expect(line.startsWith(`## ${idx + 1}.`)).toBe(true);
    });
  });

  it('ensures every spec shortcut corresponds to an actual h2 in docs/STAGEFLOW_SCRIPT_SPECIFICATION.md', () => {
    const h2Lines = scriptSpecificationRaw
      .split('\n')
      .filter((line) => line.startsWith('## '));

    expect(h2Lines.length).toBe(GUIDE_DOC_SHORTCUTS.spec.length);

    GUIDE_DOC_SHORTCUTS.spec.forEach((sec, idx) => {
      const line = h2Lines[idx];
      expect(sec.id).toBe(`section-${idx + 1}`);
      expect(line.startsWith(`## ${idx + 1}.`)).toBe(true);
    });
  });
});
