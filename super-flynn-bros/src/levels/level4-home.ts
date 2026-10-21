// 🛠️ LEVEL 4: Walk Back Home
//
// Each line is one row of the level. Each letter is one 16 x 16 tile.
// Keep it 11 rows tall: that's exactly one screen.
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

export const level4: LevelDef = {
  name: "Walk Back Home",
  goalLabel: "HOME",
  theme: "sunset",
  map: [
    "",
    "",
    "",
    "",
    "",
    "                                                                           oo                                                               ooo                                            ooo",
    "                                    ooo         ooo     L                                                        ooo                              L   L",
    "       ooo                                                                 ==  =      b                                                     ===                           b              ==   =     ooooo",
    "  1 2      B  D    B     N    S             K   ccc         FF    H       ===  ==      F  M     F    S   S    ccc   ccc     N   K     H                      B  D     B        H  S     ===   ==              G",
    "####################################   ######################################  ##################################   #######################################  ##############################   ##############################",
    "####################################   ######################################  ##################################   #######################################  ##############################   ##############################",
  ],
};
