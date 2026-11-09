/**
 * Bundled scene catalog registry for StageFlow.
 */

import demoBlueprintRaw from '../scores/blueprints/demo_blueprint.yaml?raw';
import blueprint02Raw from '../scores/blueprints/blueprint_02_dialogue.yaml?raw';
import blueprint03Raw from '../scores/blueprints/blueprint_03_ball_pass.yaml?raw';
import blueprint04Raw from '../scores/blueprints/blueprint_04_cinematography_tutorial.yaml?raw';
import blueprint05Raw from '../scores/blueprints/blueprint_05_two_rooms.yaml?raw';
import blueprint06Raw from '../scores/blueprints/blueprint_06_optics_dof.yaml?raw';
import blueprint07Raw from '../scores/blueprints/blueprint_07_camera_rigs.yaml?raw';
import vectorFieldRaw from '../scores/studies/vector_field.yaml?raw';
import type { ScoreCategory, StageScore } from './types';
import { parseStageScore } from './scoreParser';
import { computeYamlContentHash } from './scoreYamlUtils';

export interface ScoreCatalogItem {
  id: string;
  title: string;
  subtitle?: string;
  category: ScoreCategory;
  rawYaml: string;
  score: StageScore;
  isCustom?: boolean;
  aliases?: string[];
  contentHash?: string;
  originalContentHash?: string;
  sourceUrl?: string;
  sourceFileName?: string;
}

const parsedVectorField = parseStageScore(
  vectorFieldRaw,
  'vector-field'
);
if (!parsedVectorField.score) {
  throw new Error(
    `Failed to parse bundled vector_field.yaml: ${parsedVectorField.error}`
  );
}

const parsedDemo = parseStageScore(demoBlueprintRaw, 'demo');
if (!parsedDemo.score) {
  throw new Error(
    `Failed to parse bundled demo_blueprint.yaml: ${parsedDemo.error}`
  );
}

const parsed02 = parseStageScore(blueprint02Raw, 'blueprint-02');
if (!parsed02.score) {
  throw new Error(
    `Failed to parse bundled blueprint_02_dialogue.yaml: ${parsed02.error}`
  );
}

const parsed03 = parseStageScore(blueprint03Raw, 'blueprint-03');
if (!parsed03.score) {
  throw new Error(
    `Failed to parse bundled blueprint_03_ball_pass.yaml: ${parsed03.error}`
  );
}

const parsed04 = parseStageScore(
  blueprint04Raw,
  'blueprint-04'
);
if (!parsed04.score) {
  throw new Error(
    `Failed to parse bundled blueprint_04_cinematography_tutorial.yaml: ${parsed04.error}`
  );
}

const parsed05 = parseStageScore(blueprint05Raw, 'blueprint-05');
if (!parsed05.score) {
  throw new Error(
    `Failed to parse bundled blueprint_05_two_rooms.yaml: ${parsed05.error}`
  );
}

const parsed06 = parseStageScore(
  blueprint06Raw,
  'blueprint-06'
);
if (!parsed06.score) {
  throw new Error(
    `Failed to parse bundled blueprint_06_optics_dof.yaml: ${parsed06.error}`
  );
}

const parsed07 = parseStageScore(
  blueprint07Raw,
  'blueprint-07'
);
if (!parsed07.score) {
  throw new Error(
    `Failed to parse bundled blueprint_07_camera_rigs.yaml: ${parsed07.error}`
  );
}

export const INITIAL_CATALOG_ITEMS: ScoreCatalogItem[] = [
  {
    id: 'vector-field',
    title: parsedVectorField.score.title,
    subtitle: parsedVectorField.score.subtitle,
    category: 'study',
    rawYaml: vectorFieldRaw,
    score: parsedVectorField.score,
    isCustom: false,
    aliases: ['vector-field-taruma-sakti'],
    contentHash: computeYamlContentHash(vectorFieldRaw),
    originalContentHash: computeYamlContentHash(vectorFieldRaw),
  },
  {
    id: 'demo',
    title: parsedDemo.score.title,
    subtitle: parsedDemo.score.subtitle,
    category: 'blueprint',
    rawYaml: demoBlueprintRaw,
    score: parsedDemo.score,
    isCustom: false,
    aliases: ['demo-blueprint', 'blueprint-01'],
    contentHash: computeYamlContentHash(demoBlueprintRaw),
    originalContentHash: computeYamlContentHash(demoBlueprintRaw),
  },
  {
    id: 'blueprint-02',
    title: parsed02.score.title,
    subtitle: parsed02.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint02Raw,
    score: parsed02.score,
    isCustom: false,
    aliases: ['blueprint-02-dialogue'],
    contentHash: computeYamlContentHash(blueprint02Raw),
    originalContentHash: computeYamlContentHash(blueprint02Raw),
  },
  {
    id: 'blueprint-03',
    title: parsed03.score.title,
    subtitle: parsed03.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint03Raw,
    score: parsed03.score,
    isCustom: false,
    aliases: ['blueprint-03-ball-pass'],
    contentHash: computeYamlContentHash(blueprint03Raw),
    originalContentHash: computeYamlContentHash(blueprint03Raw),
  },
  {
    id: 'blueprint-04',
    title: parsed04.score.title,
    subtitle: parsed04.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint04Raw,
    score: parsed04.score,
    isCustom: false,
    aliases: ['blueprint-04-cinematography-tutorial'],
    contentHash: computeYamlContentHash(blueprint04Raw),
    originalContentHash: computeYamlContentHash(blueprint04Raw),
  },
  {
    id: 'blueprint-05',
    title: parsed05.score.title,
    subtitle: parsed05.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint05Raw,
    score: parsed05.score,
    isCustom: false,
    aliases: ['blueprint-05-two-rooms'],
    contentHash: computeYamlContentHash(blueprint05Raw),
    originalContentHash: computeYamlContentHash(blueprint05Raw),
  },
  {
    id: 'blueprint-06',
    title: parsed06.score.title,
    subtitle: parsed06.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint06Raw,
    score: parsed06.score,
    isCustom: false,
    aliases: ['blueprint-06-optics-dof'],
    contentHash: computeYamlContentHash(blueprint06Raw),
    originalContentHash: computeYamlContentHash(blueprint06Raw),
  },
  {
    id: 'blueprint-07',
    title: parsed07.score.title,
    subtitle: parsed07.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint07Raw,
    score: parsed07.score,
    isCustom: false,
    aliases: ['blueprint-07-camera-rigs'],
    contentHash: computeYamlContentHash(blueprint07Raw),
    originalContentHash: computeYamlContentHash(blueprint07Raw),
  },
];

/**
 * Resolves a score catalog item by its canonical ID or any registered alias.
 * Searches provided catalog (if passed) or falls back to INITIAL_CATALOG_ITEMS.
 */
export function findCatalogItem(
  idOrAlias: string,
  catalog: ScoreCatalogItem[] = INITIAL_CATALOG_ITEMS
): ScoreCatalogItem | undefined {
  const normalized = idOrAlias.trim().toLowerCase();
  return catalog.find((item) => {
    if (item.id.toLowerCase() === normalized) return true;
    if (item.aliases?.some((a) => a.toLowerCase() === normalized)) return true;
    return false;
  });
}

/**
 * Checks whether a given scene ID corresponds to a factory bundled blueprint (by canonical ID or alias).
 */
export function isBundledSceneId(id: string): boolean {
  return findCatalogItem(id, INITIAL_CATALOG_ITEMS) !== undefined;
}

/**
 * Generates a clean, minimal valid StageFlow choreography YAML score for new custom projects.
 */
export function generateBlankScoreYaml(id: string, title = 'New Custom Scene'): string {
  return `# ==============================================================================
# STAGEFLOW CHOREOGRAPHY SCORE — ${title.toUpperCase()}
# ==============================================================================
version: "1.0"
id: "${id}"
title: "${title}"
subtitle: "Custom 3D Staging & Camera Diorama"
video: "procedural://demo"
aspect_ratio: "16:9"
duration: 10.0

stage:
  width: 10
  depth: 10
  grid_step: 1
  observer_camera:
    target: [0, 1.1, 0]
    distance: 7.5
    pitch: 25
    yaw: 35
    lens: 35mm
  stage_camera:
    target: [0, 1.25, 0]
    distance: 4.5
    pitch: 5
    yaw: 0
    lens: 35mm

entities:
  - id: "actor_1"
    label: "Actor 1"
    kind: "character"
    position: [0, 0, 0]
    facing: 0
    height: 1.75
    color: "#00d2ff"

shots:
  - id: "shot_01"
    name: "Establishing Shot"
    start: 0.0
    end: 10.0
    maneuver: "static"
    easing: "smooth"
    camera:
      target: "actor_1"
      distance: 4.5
      pitch: 5
      yaw: 0
      lens: 35mm
`;
}

