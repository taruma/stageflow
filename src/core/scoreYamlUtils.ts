/**
 * Pure Layer 1 utilities for manipulating YAML score headers, generating
 * custom project IDs, and triggering browser file downloads.
 * Pure module with zero React or runtime dependencies.
 */

/**
 * Generates a unique, collision-resistant custom score ID from a base slug.
 * Format: `custom-${slug}-${timestamp}`
 */
export function generateCustomScoreId(baseIdentifier?: string): string {
  const timestamp = Date.now().toString(36);
  const safeSlug = (baseIdentifier || 'scene')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `custom-${safeSlug || 'project'}-${timestamp}`;
}

/**
 * Replaces the top-level `id:` field in a raw YAML text, or prepends it
 * if missing from the document header.
 */
export function updateScoreYamlId(yaml: string, newId: string): string {
  const idRegex = /^id:\s*["']?[^"'\n\r]+["']?/m;
  if (idRegex.test(yaml)) {
    return yaml.replace(idRegex, `id: "${newId}"`);
  }
  return `id: "${newId}"\n${yaml}`;
}

/**
 * Replaces the top-level `title:` field in a raw YAML text, or prepends it
 * if missing from the document header.
 */
export function updateScoreYamlTitle(yaml: string, newTitle: string): string {
  const titleRegex = /^title:\s*["']?[^"'\n\r]+["']?/m;
  if (titleRegex.test(yaml)) {
    return yaml.replace(titleRegex, `title: "${newTitle}"`);
  }
  return `title: "${newTitle}"\n${yaml}`;
}

/**
 * Initiates a browser download of a raw YAML score string as a `.yaml` file.
 */
export function downloadYamlBlob(fileName: string, yamlText: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const blob = new Blob([yamlText], {
    type: 'text/yaml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.yaml') || fileName.endsWith('.yml')
    ? fileName
    : `${fileName}.yaml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
