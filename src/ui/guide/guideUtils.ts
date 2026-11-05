/**
 * Helper utilities, section anchor mappings, and text extractors
 * for ScoreAuthoringGuideView. Supports both the YAML Authoring Guide
 * and the StageFlow Script Technical Specification.
 */

import React from 'react';

export type GuideDocType = 'guide' | 'spec';

export interface GuideSectionShortcut {
  label: string;
  id: string;
}

export const GUIDE_DOC_SHORTCUTS: Record<GuideDocType, GuideSectionShortcut[]> = {
  guide: [
    { label: 'Rules', id: 'section-1' },
    { label: 'Coordinates', id: 'section-2' },
    { label: 'Schema', id: 'section-3' },
    { label: 'Entities', id: 'section-4' },
    { label: 'Shots', id: 'section-5' },
    { label: 'Cameras', id: 'section-6' },
    { label: 'Blocking', id: 'section-7' },
    { label: 'Workflow', id: 'section-8' },
    { label: 'Recipes', id: 'section-9' },
  ],
  spec: [
    { label: 'Coordinates', id: 'section-1' },
    { label: 'Kinematics', id: 'section-2' },
    { label: 'Optics', id: 'section-3' },
    { label: 'Entities', id: 'section-4' },
    { label: 'Maneuvers', id: 'section-5' },
    { label: 'Chaining', id: 'section-6' },
    { label: 'Schema', id: 'section-7' },
  ],
};

export const SECTION_SHORTCUTS = GUIDE_DOC_SHORTCUTS.guide;

export const getNodeText = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join('');
  if (React.isValidElement(node)) {
    return getNodeText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
};

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
