/**
 * Bundled scene catalog registry for StageFlow.
 */

import demoBlueprintRaw from '../scores/blueprints/demo_blueprint.yaml?raw';
import blueprint02Raw from '../scores/blueprints/blueprint_02_dialogue.yaml?raw';
import blueprint03Raw from '../scores/blueprints/blueprint_03_ball_pass.yaml?raw';
import blueprint04Raw from '../scores/blueprints/blueprint_04_cinematography_tutorial.yaml?raw';
import blueprint05Raw from '../scores/blueprints/blueprint_05_two_rooms.yaml?raw';
import vectorFieldRaw from '../scores/studies/vector_field.yaml?raw';
import type { ScoreCategory, StageScore } from './types';
import { parseStageScore } from './scoreParser';

export interface ScoreCatalogItem {
  id: string;
  title: string;
  subtitle?: string;
  category: ScoreCategory;
  rawYaml: string;
  score: StageScore;
  isCustom?: boolean;
}

const parsedVectorField = parseStageScore(
  vectorFieldRaw,
  'vector-field-taruma-sakti'
);
if (!parsedVectorField.score) {
  throw new Error(
    `Failed to parse bundled vector_field.yaml: ${parsedVectorField.error}`
  );
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
    id: parsedVectorField.score.id,
    title: parsedVectorField.score.title,
    subtitle: parsedVectorField.score.subtitle,
    category: 'study',
    rawYaml: vectorFieldRaw,
    score: parsedVectorField.score,
    isCustom: false,
  },
  {
    id: parsedDemo.score.id,
    title: parsedDemo.score.title,
    subtitle: parsedDemo.score.subtitle,
    category: 'blueprint',
    rawYaml: demoBlueprintRaw,
    score: parsedDemo.score,
    isCustom: false,
  },
  {
    id: parsed02.score.id,
    title: parsed02.score.title,
    subtitle: parsed02.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint02Raw,
    score: parsed02.score,
    isCustom: false,
  },
  {
    id: parsed03.score.id,
    title: parsed03.score.title,
    subtitle: parsed03.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint03Raw,
    score: parsed03.score,
    isCustom: false,
  },
  {
    id: parsed04.score.id,
    title: parsed04.score.title,
    subtitle: parsed04.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint04Raw,
    score: parsed04.score,
    isCustom: false,
  },
  {
    id: parsed05.score.id,
    title: parsed05.score.title,
    subtitle: parsed05.score.subtitle,
    category: 'blueprint',
    rawYaml: blueprint05Raw,
    score: parsed05.score,
    isCustom: false,
  },
];

/**
 * Checks whether a given scene ID corresponds to a factory bundled blueprint.
 */
export function isBundledSceneId(id: string): boolean {
  return INITIAL_CATALOG_ITEMS.some((item) => item.id === id);
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

