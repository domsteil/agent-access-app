// src/agents/index.ts

import venice from "./venice.yaml";
import flaunch from "./flaunch.yaml";

export type Agent = {
  id: number;
  name: string;
  description: string;
  image?: string;
  model?: string;
  type?: string;
  chain?: string;
  stakeNeeded?: boolean;
};

export const AGENTS: Agent[] = [venice, flaunch];
