// The one Node function the tests use (to list src/characters/). The game has
// no Node types, since it runs in the browser, so this declares just that.
declare module "node:fs" {
  export function readdirSync(path: URL): string[];
}
