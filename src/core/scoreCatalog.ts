/**
 * Bundled scene catalog registry for StageFlow.
 */

import demoBlueprintRaw from '../scores/demo_blueprint.yaml?raw';
import blueprint02Raw from '../scores/blueprint_02_dialogue.yaml?raw';
import blueprint03Raw from '../scores/blueprint_03_ball_pass.yaml?raw';
import blueprint04Raw from '../scores/blueprint_04_cinematography_tutorial.yaml?raw';
import blueprint05Raw from '../scores/blueprint_05_two_rooms.yaml?raw';
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

const parsed03 = parseStageScore(blueprint03Raw, 'blueprint-03-ball-pass');
if (!parsed03.score) {
  throw new Error(
    `Failed to parse bundled blueprint_03_ball_pass.yaml: ${parsed03.error}`
  );
}

const parsed04 = parseStageScore(
  blueprint04Raw,
  'blueprint-04-cinematography-tutorial'
);
if (!parsed04.score) {
  throw new Error(
    `Failed to parse bundled blueprint_04_cinematography_tutorial.yaml: ${parsed04.error}`
  );
}

const parsed05 = parseStageScore(blueprint05Raw, 'blueprint-05-two-rooms');
if (!parsed05.score) {
  throw new Error(
    `Failed to parse bundled blueprint_05_two_rooms.yaml: ${parsed05.error}`
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
  {
    id: parsed03.score.id,
    title: parsed03.score.title,
    subtitle: parsed03.score.subtitle,
    rawYaml: blueprint03Raw,
    score: parsed03.score,
  },
  {
    id: parsed04.score.id,
    title: parsed04.score.title,
    subtitle: parsed04.score.subtitle,
    rawYaml: blueprint04Raw,
    score: parsed04.score,
  },
  {
    id: parsed05.score.id,
    title: parsed05.score.title,
    subtitle: parsed05.score.subtitle,
    rawYaml: blueprint05Raw,
    score: parsed05.score,
  },
];
