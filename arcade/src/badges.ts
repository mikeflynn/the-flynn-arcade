/** "1P", "1–2P", plus "CO-OP" when the players team up. */
export function playerBadges(players: { min: number; max: number; coop: boolean }): { text: string; color: string }[] {
  const count = players.min === players.max ? `${players.min}P` : `${players.min}-${players.max}P`;
  const badges = [{ text: count, color: "#e8334a" }];
  if (players.coop) badges.push({ text: "CO-OP", color: "#2a5cff" });
  return badges;
}
