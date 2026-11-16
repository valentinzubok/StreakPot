/**
 * A transaction can be accepted by consensus and still not do what the user asked: join refuses a
 * stake it cannot accept in its return value and books the money as a credit (a refused payable
 * call must not revert, or the value would be lost), and a ruling round may produce no verdict.
 * The console therefore never reports success from the receipt alone. It reads the chain after the
 * call and decides with these functions, which are pure so they can be tested.
 */

export type Verdict = "done" | "refused" | "pending";

export type Outcome = {
  verdict: Verdict;
  title: string;
  detail: string;
  /** Wei the user can take back with withdraw_credit, when the call was refused. */
  credit?: string;
};

const ONE = BigInt(10) ** BigInt(18);
const fmt = (wei: bigint) => {
  const whole = wei / ONE;
  const frac = (wei % ONE).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : `${whole}`;
};
const WAIT: Outcome = { verdict: "pending", title: "Waiting for the chain", detail: "Nothing is visible yet. Refresh after finalization." };

/** After open_pot: does a pot with this id exist, opened by this account? (open_pot is not payable.) */
export function openOutcome(pot: { creator: string; stake: string } | null, me: string): Outcome {
  if (pot && pot.creator.toLowerCase() === me.toLowerCase()) {
    return { verdict: "done", title: "Pot opened", detail: `Members stake ${fmt(BigInt(pot.stake))} GEN each; every rule is fixed and nobody can change it.` };
  }
  if (pot) return { verdict: "refused", title: "The pot was NOT opened", detail: "A pot with this id already belongs to another account." };
  return WAIT;
}

/** After join: did the member list grow with this account, or did the stake become a credit? */
export function joinOutcome(
  members: string[],
  me: string,
  creditBefore: bigint,
  creditAfter: bigint,
  sent: bigint,
): Outcome {
  if (members.some((m) => m.toLowerCase() === me.toLowerCase())) {
    return { verdict: "done", title: "You are in", detail: `Your ${fmt(sent)} GEN stake is escrowed. Post one proof in each period to get it back.` };
  }
  if (creditAfter - creditBefore >= sent && sent > BigInt(0)) {
    return {
      verdict: "refused",
      title: "You did NOT join",
      detail: `The contract refused the join (wrong amount, closed, full or already a member) and kept your ${fmt(sent)} GEN as a credit. Take it back with "take it back".`,
      credit: (creditAfter - creditBefore).toString(),
    };
  }
  return WAIT;
}

/** After prove: is there a proof for this member and period now? */
export function proveOutcome(proofSeen: boolean): Outcome {
  return proofSeen
    ? { verdict: "done", title: "Proof frozen", detail: "The page is stored whole on chain for this period; rulings read only that text." }
    : WAIT;
}

export type RoundSeen = { finding: string; outcome: string; reason: string; verdict: string; round: number } | null;

const SAY = (v: string) => (v === "met" ? "the goal was met" : v === "not_met" ? "the goal was NOT met" : v);

/** After rule: say what the round did. A round with no verdict is kept as evidence, not an error. */
export function roundOutcome(roundsBefore: number, round: RoundSeen): Outcome {
  if (!round || round.round <= roundsBefore) return WAIT;
  if (round.outcome === "final") {
    return { verdict: "done", title: "Verdict final", detail: `Enough rounds agreed: ${SAY(round.verdict)}.` };
  }
  if (round.outcome === "proposed" || round.outcome === "confirmed" || round.outcome === "restarted") {
    return { verdict: "done", title: "Round counted", detail: `Validators ruled this round: ${SAY(round.verdict)}; more agreeing rounds are still needed.` };
  }
  return {
    verdict: "refused",
    title: "The round produced no verdict",
    detail: `Validators could not rule${round.reason ? ` (${round.reason})` : ""}. The round is kept as evidence and moves nothing.`,
  };
}

/** After settle: the pot must have left "open". */
export function settleOutcome(status: string, members: number): Outcome {
  if (status === "final") return { verdict: "done", title: "Pot FINAL", detail: `The books are written for ${members} members; each takes its payout.` };
  if (status === "void") return { verdict: "done", title: "Pot VOID", detail: "Fewer than two members joined: every stake comes back." };
  return WAIT;
}

/** After withdraw_member: is the payout marked withdrawn? */
export function withdrawOutcome(withdrawn: boolean): Outcome {
  return withdrawn
    ? { verdict: "done", title: "Payout withdrawn", detail: "The payout is on its way to your wallet; it lands when the transaction is finalized." }
    : WAIT;
}

/** After withdraw_credit: did the credit go to zero? */
export function creditOutcome(creditBefore: bigint, creditAfter: bigint): Outcome {
  if (creditBefore > BigInt(0) && creditAfter === BigInt(0)) {
    return { verdict: "done", title: "Credit withdrawn", detail: `${fmt(creditBefore)} GEN is on its way to your wallet; it lands when the transaction is finalized.` };
  }
  return { verdict: "pending", title: "Waiting for the chain", detail: "The credit is still shown. Refresh after finalization." };
}
