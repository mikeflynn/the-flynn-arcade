/** "1P", "1–2P CO-OP" when players team up, or "1–2P VS" when they fight. */
export function playerLabel(players: { min: number; max: number; coop: boolean }): string {
  const count = players.min === players.max ? `${players.min}P` : `${players.min}–${players.max}P`;
  if (players.max < 2) return count;
  return `${count} ${players.coop ? "CO-OP" : "VS"}`;
}
