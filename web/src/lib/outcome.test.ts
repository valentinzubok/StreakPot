import { describe, expect, it } from "vitest";
import { creditOutcome, joinOutcome, openOutcome, proveOutcome, roundOutcome, settleOutcome, withdrawOutcome } from "./outcome";

const ME = "0xAbC0000000000000000000000000000000000001";
const OTHER = "0x0000000000000000000000000000000000000002";
const GEN = BigInt(10) ** BigInt(18);

describe("open_pot", () => {
  it("is a success only when the pot exists and is ours", () => {
    const o = openOutcome({ creator: ME.toLowerCase(), stake: GEN.toString() }, ME);
    expect(o.verdict).toBe("done");
    expect(o.detail).toContain("1 GEN");
  });
  it("an id taken by someone else is not a success", () => {
    const o = openOutcome({ creator: OTHER, stake: "1" }, ME);
    expect(o.verdict).toBe("refused");
    expect(o.detail).toContain("another account");
  });
  it("before finalization nothing is claimed", () => {
    expect(openOutcome(null, ME).verdict).toBe("pending");
  });
});

describe("join", () => {
  it("is a success only when the member list holds us", () => {
    expect(joinOutcome([OTHER, ME.toLowerCase()], ME, BigInt(0), BigInt(0), GEN).verdict).toBe("done");
  });
  it("an accepted but refused join is reported as refused, with the credit", () => {
    const o = joinOutcome([OTHER], ME, BigInt(0), GEN, GEN);
    expect(o.verdict).toBe("refused");
    expect(o.title).toContain("did NOT join");
    expect(o.credit).toBe(GEN.toString());
  });
  it("a credit that was already there is not mistaken for a new refusal", () => {
    expect(joinOutcome([], ME, GEN, GEN, GEN).verdict).toBe("pending");
  });
  it("sending nothing never reads as a refusal", () => {
    expect(joinOutcome([], ME, BigInt(0), BigInt(0), BigInt(0)).verdict).toBe("pending");
  });
});

describe("prove", () => {
  it("counts only when the proof is on chain", () => {
    expect(proveOutcome(true).verdict).toBe("done");
    expect(proveOutcome(false).verdict).toBe("pending");
  });
});

describe("ruling rounds", () => {
  const r = (outcome: string, verdict = "met", reason = "") => ({ finding: outcome === "no_progress" ? "unclear" : "ruled", outcome, reason, verdict, round: 2 });
  it("a final round names the verdict", () => {
    expect(roundOutcome(1, r("final")).title).toBe("Verdict final");
    expect(roundOutcome(1, r("final", "not_met")).detail).toContain("NOT met");
  });
  it("a counted round says more are needed", () => {
    const o = roundOutcome(1, r("confirmed"));
    expect(o.verdict).toBe("done");
    expect(o.detail).toContain("more agreeing rounds");
  });
  it("a round without a verdict is reported as such, with the reason", () => {
    const o = roundOutcome(1, r("no_progress", "", "bad_verdict"));
    expect(o.verdict).toBe("refused");
    expect(o.detail).toContain("bad_verdict");
  });
  it("no new round yet is pending", () => {
    expect(roundOutcome(2, r("final")).verdict).toBe("pending");
    expect(roundOutcome(0, null).verdict).toBe("pending");
  });
});

describe("settle, withdraw, credit", () => {
  it("names what the status means", () => {
    expect(settleOutcome("final", 3).detail).toContain("3 members");
    expect(settleOutcome("void", 1).detail).toContain("every stake comes back");
    expect(settleOutcome("open", 3).verdict).toBe("pending");
  });
  it("a payout counts as withdrawn only when the chain marks it", () => {
    expect(withdrawOutcome(true).verdict).toBe("done");
    expect(withdrawOutcome(false).verdict).toBe("pending");
  });
  it("a credit counts as withdrawn only when it went to zero", () => {
    expect(creditOutcome(GEN, BigInt(0)).verdict).toBe("done");
    expect(creditOutcome(GEN, GEN).verdict).toBe("pending");
    expect(creditOutcome(BigInt(0), BigInt(0)).verdict).toBe("pending");
  });
});
