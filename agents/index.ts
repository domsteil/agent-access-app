// src/agents/index.ts

import venice from "./venice.yaml";
import flaunch from "./flaunch.yaml";
import tech from "./tech.yaml";
import fountain from "./fountain.yaml";
import cryptosense from "./cryptosense.yaml";
import base from "./base.yaml";

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

export const AGENTS: Agent[] = [venice, flaunch, tech, fountain, cryptosense, base];
