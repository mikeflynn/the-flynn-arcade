// 🛠️ LEVEL 3: Walk to Baseball Practice
//
// Each line is one row of the level. Each letter is one 16 x 16 tile.
//
//   #  sidewalk          =  brick planter     B  trash bin
//   c  parked car        F  picket fence
//   o  donut             b  burger (gives back a heart)
//   D  dog               H  chasing dog       N  slow neighbor
//   K  skateboarder      S  sprinkler         L  loose baseball
//   M  lawn mower
//   1  Colin's start     2  Ryan's start      G  goal sign
//
// (Tiles, hazards, and items each have their letter in tiles.ts, hazards.ts,
// and items.ts.)
//
// 🛠️ TRY THIS: add more donuts (o), dig a pit by deleting both rows of # in a
// spot (keep pits 3 tiles wide or less, so you can jump them), or put a dog
// (D) between two trash bins (B) so it walks back and forth.

import type { LevelDef } from "../engine/types";

export const level3: LevelDef = {
  name: "Walk to Baseball Practice",
  goalLabel: "BASEBALL",
  theme: "afternoon",
  map: [
    "",
    "",
    "",
    "",
    "                                                                                                                                                        ooo",
    "                                                      oooo                                             ooo",
    "              ooo     L                oo    L                        ooo                     L  L                     oo                 L             ===                     L",
    "       ooo                                            ====                                b            ===                                         ===                            oooo",
    "  1 2         FFF        F  M     F             FF          S   N           F   M     F               =====    K    FFF  FFF B  D    B        S                   F   M     F                       G",
    "#######################################  #############################   ##############################################  ###################################   ###################################################",
    "#######################################  #############################   ##############################################  ###################################   ###################################################",
  ],
};
