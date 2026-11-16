import { CONTRACT_ADDRESS } from "./config";
import { type Address, type TxStage, parseJson, readContract, writeAndWait } from "./genlayer";

export type Pot = {
  pot_id: string;
  creator: string;
  title: string;
  goal: string;
  periods: number;
  period_len: number;
  stake: string;
  max_members: number;
  rounds_required: number;
  round_interval: number;
  join_window: number;
  ruling_window: number;
  created_at: number;
  join_closes_at: number;
  final_deadline: number;
  status: "open" | "final" | "void";
  member_count: number;
  member_addrs: string[];
  settled_at: number;
  paid_out: string;
  injection_flags: string[];
};

export type Proof = {
  member: number;
  period: number;
  entrant: string;
  url: string;
  note: string;
  text: string;
  content_hash: string;
  total_chars: number;
  proved_at: number;
  rounds: number;
  last_round_at: number;
  standing: { verdict: string; confirmations: number };
  final_verdict: string;
};

export type RoundRecord = {
  pot_id: string;
  member: number;
  period: number;
  round: number;
  at: number;
  at_text: string;
  by: string;
  proof_hash: string;
  finding: "ruled" | "unclear";
  reason: string;
  verdict: string;
  outcome: "proposed" | "confirmed" | "restarted" | "final" | "no_progress";
  confirmations: number;
  final_verdict: string;
  injection_flags: string[];
};

export type Schedule = {
  pot_id: string;
  now: number;
  status: string;
  members: number;
  join_closes_at: number;
  periods_end: number;
  final_deadline: number;
  current_period: number;
  can_join: boolean;
  can_prove: boolean;
  can_rule: boolean;
  unruled: number;
  next_round_at: number;
  can_settle: boolean;
  can_withdraw: boolean;
};
export type PayoutRow = { index: number; address: string; done: number; refund: string; bonus: string; payout: string; withdrawn: boolean };
export type Payouts = { settled: boolean; status: string; rows: PayoutRow[] };
export type Books = { balance: string; held: string; credits: string };
export type EventRow = { event: string; n: number; [key: string]: unknown };
export type PageOf<T> = { total: number; offset: number; items: T[] };

type OnStage = (stage: TxStage, hash: string) => void;
const read = (fn: string, args: (string | number)[] = []) =>
  readContract<string>(CONTRACT_ADDRESS, fn, args as never[]);

export const PAGE_SIZE = 20;

/** One page of [pot_id, status]. Never the whole registry. */
export async function listPots(offset: number, limit = PAGE_SIZE): Promise<PageOf<[string, string]>> {
  return parseJson(await read("list_pots", [offset, limit]), { total: 0, offset, items: [] });
}
export async function getPot(id: string): Promise<Pot | null> {
  try {
    const p = parseJson<Pot>(await read("get_pot", [id]), {} as Pot);
    return p.pot_id ? p : null;
  } catch {
    return null;
  }
}
export async function getProof(id: string, member: number, period: number): Promise<Proof | null> {
  try {
    const r = parseJson<Proof>(await read("get_proof", [id, member, period]), {} as Proof);
    return typeof r.member === "number" ? r : null;
  } catch {
    return null;
  }
}
export async function getRound(id: string, member: number, period: number, k: number): Promise<RoundRecord | null> {
  try {
    const r = parseJson<RoundRecord>(await read("get_round", [id, member, period, k]), {} as RoundRecord);
    return r.pot_id ? r : null;
  } catch {
    return null;
  }
}
export async function getSchedule(id: string): Promise<Schedule | null> {
  const s = parseJson<Schedule>(await read("get_schedule", [id]), {} as Schedule);
  return s.pot_id ? s : null;
}
export async function getPayouts(id: string): Promise<Payouts> {
  return parseJson<Payouts>(await read("get_payouts", [id]), { settled: false, status: "", rows: [] });
}
export async function getBooks(): Promise<Books | null> {
  return parseJson<Books | null>(await read("get_balance"), null);
}
/** The newest events: the last page of the paged event log. */
export async function getRecentEvents(count = 10): Promise<EventRow[]> {
  const head = parseJson<PageOf<EventRow>>(await read("get_events", [0, 1]), { total: 0, offset: 0, items: [] });
  const start = Math.max(0, head.total - count);
  const page = parseJson<PageOf<EventRow>>(await read("get_events", [start, count]), { total: 0, offset: 0, items: [] });
  return page.items.slice().reverse();
}
export async function getCredit(address: string): Promise<bigint> {
  try {
    return BigInt((await read("get_credit", [address])) || "0");
  } catch {
    return BigInt(0);
  }
}

export type NewPot = {
  id: string;
  title: string;
  goal: string;
  periods: string;
  periodLen: string;
  /** The stake in wei. */
  stake: string;
  maxMembers: string;
  rounds: string;
  interval: string;
  joinWindow: string;
  rulingWindow: string;
};

export async function openPot(account: Address, provider: unknown, p: NewPot, on?: OnStage) {
  return writeAndWait(
    account,
    provider,
    CONTRACT_ADDRESS,
    "open_pot",
    [p.id, p.title, p.goal, p.periods, p.periodLen, p.stake, p.maxMembers, p.rounds, p.interval, p.joinWindow, p.rulingWindow],
    on,
  );
}

/** The stake travels as the transaction's value. */
export async function join(account: Address, provider: unknown, id: string, stakeWei: string, on?: OnStage) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "join", [id], on, BigInt(stakeWei || "0"));
}
export async function prove(account: Address, provider: unknown, id: string, url: string, note: string, on?: OnStage) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "prove", [id, url, note], on);
}
export async function rule(account: Address, provider: unknown, id: string, member: number, period: number, on?: OnStage) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "rule", [id, member, period], on);
}
const simple = (fn: string) => (account: Address, provider: unknown, id: string, on?: OnStage) =>
  writeAndWait(account, provider, CONTRACT_ADDRESS, fn, [id], on);
export const settle = simple("settle");
export const withdrawMember = simple("withdraw_member");
export async function withdrawCredit(account: Address, provider: unknown, on?: OnStage) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "withdraw_credit", [], on);
}
