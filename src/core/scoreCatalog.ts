/**
 * Bundled scene catalog registry for StageFlow.
 */

import demoBlueprintRaw from '../../public/scores/demo_blueprint.yaml?raw';
import blueprint02Raw from '../../public/scores/blueprint_02_dialogue.yaml?raw';
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

const parsed02 = parseStageScore(blueprint02Raw, 'blueprint-02-dialogue');
if (!parsed02.score) {
  throw new Error(
    `Failed to parse bundled blueprint_02_dialogue.yaml: ${parsed02.error}`
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
  {
    id: parsed02.score.id,
    title: parsed02.score.title,
    subtitle: parsed02.score.subtitle,
    rawYaml: blueprint02Raw,
    score: parsed02.score,
  },
];
