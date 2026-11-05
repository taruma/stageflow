import { describe, expect, it } from 'vitest';
import {
  generateCustomScoreId,
  updateScoreYamlId,
  updateScoreYamlTitle,
} from '../../src/core/scoreYamlUtils';

describe('YAML Score Utilities (scoreYamlUtils)', () => {
  describe('generateCustomScoreId', () => {
    it('generates a custom score ID with sanitized slug and timestamp', () => {
      const id1 = generateCustomScoreId('My Cool Scene');
      expect(id1).toMatch(/^custom-my-cool-scene-[a-z0-9]+$/);

      const id2 = generateCustomScoreId('scene #1 / test! & more');
      expect(id2).toMatch(/^custom-scene-1-test-more-[a-z0-9]+$/);

      const idFallback = generateCustomScoreId('');
      expect(idFallback).toMatch(/^custom-scene-[a-z0-9]+$/);
    });
  });

  describe('updateScoreYamlId', () => {
    it('replaces quoted id field in YAML text', () => {
      const yaml = `version: "1.0"\nid: "old-scene-id"\ntitle: "Old Title"`;
      const updated = updateScoreYamlId(yaml, 'new-custom-id');
      expect(updated).toBe(`version: "1.0"\nid: "new-custom-id"\ntitle: "Old Title"`);
    });

    it('replaces unquoted id field in YAML text', () => {
      const yaml = `id: legacy_scene\nversion: 1.0`;
      const updated = updateScoreYamlId(yaml, 'new-id');
      expect(updated).toBe(`id: "new-id"\nversion: 1.0`);
    });

    it('prepends id field when absent from YAML document header', () => {
      const yaml = `version: "1.0"\ntitle: "No ID Scene"`;
      const updated = updateScoreYamlId(yaml, 'prepended-id');
      expect(updated).toBe(`id: "prepended-id"\nversion: "1.0"\ntitle: "No ID Scene"`);
    });
  });

  describe('updateScoreYamlTitle', () => {
    it('replaces quoted title field in YAML text', () => {
      const yaml = `id: "scene-1"\ntitle: "Original Title"\nduration: 10`;
      const updated = updateScoreYamlTitle(yaml, 'Updated Title (Copy)');
      expect(updated).toBe(`id: "scene-1"\ntitle: "Updated Title (Copy)"\nduration: 10`);
    });

    it('replaces unquoted title field in YAML text', () => {
      const yaml = `title: Simple Title\nid: scene-2`;
      const updated = updateScoreYamlTitle(yaml, 'Renamed Title');
      expect(updated).toBe(`title: "Renamed Title"\nid: scene-2`);
    });

    it('prepends title field when absent from YAML document header', () => {
      const yaml = `id: "scene-3"\nversion: "1.0"`;
      const updated = updateScoreYamlTitle(yaml, 'New Prepended Title');
      expect(updated).toBe(`title: "New Prepended Title"\nid: "scene-3"\nversion: "1.0"`);
    });
  });
});
