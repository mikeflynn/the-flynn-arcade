// 🛠️ LEVEL 1: Walk to School
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

export const level1: LevelDef = {
  name: "Walk to School",
  goalLabel: "SCHOOL",
  theme: "morning",
  map: [
    "",
    "",
    "",
    "",
    "                                                                                                                                                                   oo",
    "                                         ooo              ooo                            oo                                                                               ooo",
    "              o        ooo         oo          ooo                            ooo                 oo                       oo                   ooo                ==",
    "        ooo                                               ===              oo       b    ==                                         oooooo                      ==",
    "  1 2         B    B    D     B           S    ccc   S        B   D    B                ====    S    S    B   D     B   ccc  ccc            B    D     B    S              S              G",
    "###################################  #########################################   ##########################################  #########################################  ################################",
    "###################################  #########################################   ##########################################  #########################################  ################################",
  ],
};
