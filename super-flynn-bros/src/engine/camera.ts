/**
 * Where the camera should scroll to next. Like the original Mario, it only
 * ever moves forward: it follows the leader once they pass `leadFraction` of
 * the screen and stops at the end of the level.
 */
export function nextScrollX(
  current: number,
  leadX: number,
  viewWidth: number,
  worldWidth: number,
  leadFraction = 0.4,
): number {
  const target = leadX - viewWidth * leadFraction;
  const maxScroll = Math.max(0, worldWidth - viewWidth);
  return Math.min(maxScroll, Math.max(current, target, 0));
}
