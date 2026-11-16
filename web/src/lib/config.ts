/** Live StreakPot deploy on GenLayer Studio Dev (chain 61997). Override via env. */
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_STREAKPOT_ADDRESS ||
  "0xD727b6E139Bb7f256D0ce4D488206AAcea7c6158") as `0x${string}`;

/** Studio Dev / Studio Next — chain ID 61997. */
export const CHAIN_ID = 61997;
export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC || "https://studio-dev.genlayer.com/api";
export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || "https://explorer-studio-dev.genlayer.com";
export const EXPLORER = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`;
export const txUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;

export const GITHUB = "https://github.com/valentinzubok/StreakPot";

/** Demo proof pages: files in this repository, served by raw.githubusercontent.com. */
const RAW = "https://raw.githubusercontent.com/valentinzubok/StreakPot/main/web/public/fixtures/proofs";
export const DEMO_PROOF = RAW + "/done-1.md";
export const DEMO_GOAL = "Run at least 3 km and log the distance, the time and the route.";
