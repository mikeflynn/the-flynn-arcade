/** One loop of a scrolling strip: "INSERT COIN ✦ 2 GAMES ON THE FLOOR ✦ ". */
export function tickerLine(messages: readonly string[], gameCount: number): string {
  const games = `${gameCount} ${gameCount === 1 ? "GAME" : "GAMES"}`;
  return messages.map((m) => `${m.replaceAll("{games}", games)} ✦ `).join("");
}
