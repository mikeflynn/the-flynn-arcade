// 🛠️ The order levels are played in. Made a new level? Import it and add it here!

import { level1 } from "./level1-school";
import { level2 } from "./level2-track";
import { level3 } from "./level3-baseball";
import { level4 } from "./level4-home";
import type { LevelDef } from "../engine/types";

export const levels: LevelDef[] = [level1, level2, level3, level4];
