/**
 * Bundled scene catalog registry for Stageplay.
 */

import demoBlueprintRaw from '../../public/scores/demo_blueprint.yaml?raw';
import type { StageScore } from './types';
import { parseStageScore } from './scoreParser';

export interface ScoreCatalogItem {
  id: string;
  title: string;
  subtitle?: string;
  rawYaml: string;
  score: StageScore;
  isCustom?: boolean;
}

const parsedDemo = parseStageScore(demoBlueprintRaw, 'demo-blueprint');
if (!parsedDemo.score) {
  throw new Error(
    `Failed to parse bundled demo_blueprint.yaml: ${parsedDemo.error}`
  );
}

export const INITIAL_CATALOG_ITEMS: ScoreCatalogItem[] = [
  {
    id: parsedDemo.score.id,
    title: parsedDemo.score.title,
    subtitle: parsedDemo.score.subtitle,
    rawYaml: demoBlueprintRaw,
    score: parsedDemo.score,
  },
];
