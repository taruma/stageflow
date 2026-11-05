/**
 * Helper utilities and section anchor mappings for ScoreAuthoringGuideView.
 */

import React from 'react';

export interface GuideSectionShortcut {
  label: string;
  id: string;
}

export const SECTION_SHORTCUTS: GuideSectionShortcut[] = [
  { label: 'Rules', id: 'section-1' },
  { label: 'Coordinates', id: 'section-2' },
  { label: 'Schema', id: 'section-3' },
  { label: 'Entities', id: 'section-4' },
  { label: 'Shots', id: 'section-5' },
  { label: 'Cameras', id: 'section-6' },
  { label: 'Blocking', id: 'section-7' },
  { label: 'Workflow', id: 'section-8' },
  { label: 'Recipes', id: 'section-9' },
];

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
