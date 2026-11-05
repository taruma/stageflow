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
    expect(slugify('1. Mental Model & Core Rules')).toBe('1-mental-model-core-rules');
    expect(slugify('2. 3D Stage Coordinate System & Compass')).toBe('2-3d-stage-coordinate-system-compass');
    expect(slugify('4. Scene Entities (entities:)')).toBe('4-scene-entities-entities');
    expect(slugify("9. Director's Cookbook: 6 Cinematography Recipes")).toBe('9-director-s-cookbook-6-cinematography-recipes');
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
