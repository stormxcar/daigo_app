const ID_PREFIX = 'daigo';

export function createIdempotencyKey(scope: string) {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${ID_PREFIX}:${scope}:${Date.now().toString(36)}:${randomPart}`;
}
