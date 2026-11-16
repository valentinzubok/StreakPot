"use client";

import { useCallback, useEffect, useState } from "react";
import { CHAIN_ID, CONTRACT_ADDRESS, DEMO_GOAL, DEMO_PROOF, EXPLORER, GITHUB, txUrl } from "@/lib/config";
import {
  PAGE_SIZE,
  getBooks,
  getCredit,
  getPayouts,
  getPot,
  getProof,
  getRecentEvents,
  getRound,
  getSchedule,
  join,
  listPots,
  openPot,
  prove,
  rule,
  settle,
  withdrawCredit,
  withdrawMember,
  type Books,
  type EventRow,
  type Payouts,
  type Pot,
  type Proof,
  type RoundRecord,
  type Schedule,
} from "@/lib/contracts";
import {
  creditOutcome,
  joinOutcome,
  openOutcome,
  proveOutcome,
  roundOutcome,
  settleOutcome,
  withdrawOutcome,
  type Outcome,
} from "@/lib/outcome";
import { fundWithTestGen, getNativeBalance, type TxStage } from "@/lib/genlayer";
import { useWallet } from "./WalletProvider";

const short = (h: string, n = 10) => (h ? `${h.slice(0, n)}…${h.slice(-4)}` : "—");
const utc = (seconds: number) =>
  seconds ? `${new Date(seconds * 1000).toISOString().replace("T", " ").slice(0, 19)} UTC` : "—";

/** Wei as GEN, trimmed: 1500000000000000000 -> "1.5". */
const fmtGen = (wei: string | number | undefined) => {
  let v: bigint;
  try {
    v = BigInt(wei || 0);
  } catch {
    return "0";
  }
  const whole = v / BigInt(10 ** 18);
  const frac = (v % BigInt(10 ** 18)).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : `${whole}`;
};

/** GEN typed by a person as wei, or "" when it is not a number. */
const toWei = (text: string) => {
  const m = /^(\d+)(?:\.(\d{1,18}))?$/.exec(text.trim());
  if (!m) return "";
  return (BigInt(m[1]) * BigInt(10 ** 18) + BigInt((m[2] || "").padEnd(18, "0") || "0")).toString();
};

const STATUS: Record<string, string> = {
  open: "open · joining, proofs, rulings and the settlement are in progress",
  final: "FINAL · every member takes the payout the books name",
  void: "VOID · fewer than two members, every stake comes back",
};

const REASON: Record<string, string> = {
  model_failed: "the model did not answer",
  not_json: "the model did not answer in JSON",
  not_object: "the model answer was not an object",
  bad_verdict: "the answer was neither met nor not_met",
};

const verdictText = (v: string) => {
  if (!v) return "not ruled yet";
  if (v === "met") return "MET · the period counts";
  if (v === "not_met") return "not met · the period is lost";
  return v;
};

function Flow() {
  return (
    <div className="roundsbox" aria-hidden="true">
      <p className="q">Did you keep your streak?</p>
      <div className="lane">
        <span>join</span>
        <span className="bar yes">everyone stakes the same amount before the first period</span>
      </div>
      <div className="lane">
        <span>prove</span>
        <span className="bar yes">one proof page per period, frozen whole on chain</span>
      </div>
      <div className="lane">
        <span>rule</span>
        <span className="bar no">validators say met or not met against the goal</span>
      </div>
      <p className="gap">⋮ the code does the sums, before the final deadline</p>
      <div className="lane">
        <span>result</span>
        <span className="bar final">your stake back in proportion · the forfeited share to the best streaks</span>
      </div>
    </div>
  );
}

type PotData = {
  pot: Pot;
  sch?: Schedule;
  proofs: Record<string, Proof>;
  rounds: Record<string, RoundRecord[]>;
  payouts: Payouts;
};

function PotCard({
  d,
  me,
  disabled,
  proofUrl,
  onPick,
  onJoin,
  onProve,
  onRule,
  onSettle,
  onWithdraw,
}: {
  d: PotData;
  me: string | null;
  disabled: boolean;
  proofUrl: string;
  onPick: () => void;
  onJoin: () => void;
  onProve: () => void;
  onRule: (member: number, period: number) => void;
  onSettle: () => void;
  onWithdraw: () => void;
}) {
  const { pot, sch, proofs, rounds, payouts } = d;
  const [shown, setShown] = useState("");
  const myIndex = me ? pot.member_addrs.findIndex((a) => a.toLowerCase() === me.toLowerCase()) : -1;
  const row = payouts.rows.find((r) => r.index === myIndex);
  const now = sch?.now ?? 0;
  return (
    <article className="card" style={{ marginTop: "1rem" }}>
      <div className="head">
        <span className="id">{pot.pot_id}</span>
        <span className="muted">{STATUS[pot.status] || pot.status}</span>
      </div>
      <p>
        <button className="ghost tiny" onClick={onPick}>
          use this pot above
        </button>
      </p>
      <p className="claimtext">{pot.title}</p>
      <p className="hashline">
        stake {fmtGen(pot.stake)} GEN · {pot.periods} periods of {pot.period_len}s · {pot.member_count} of {pot.max_members} members ·{" "}
        {pot.rounds_required} agreeing round{pot.rounds_required === 1 ? "" : "s"} per proof, {pot.round_interval}s apart
      </p>
      <p className="hashline">
        joining until {utc(pot.join_closes_at)} · last period ends {sch ? utc(sch.periods_end) : "—"} · final deadline {utc(pot.final_deadline)}
      </p>
      <p className="hashline">goal: {pot.goal}</p>
      {pot.injection_flags.length > 0 && <p className="msg">Instruction-like phrasing was flagged: {pot.injection_flags.join(", ")}.</p>}

      {pot.member_addrs.length > 0 && (
        <ul className="timeline">
          {pot.member_addrs.map((addr, m) => {
            const pay = payouts.rows.find((r) => r.index === m);
            return (
              <li key={addr}>
                <strong>
                  member {m}: {short(addr)}
                  {myIndex === m ? " (you)" : ""}
                </strong>
                {pay && (
                  <span className="muted">
                    {" "}
                    · {pay.done} of {pot.periods} periods kept · refund {fmtGen(pay.refund)} + bonus {fmtGen(pay.bonus)} = {fmtGen(pay.payout)} GEN
                    {pay.withdrawn ? " · withdrawn" : ""}
                  </span>
                )}
                <ul className="timeline">
                  {Array.from({ length: pot.periods }, (_, p) => {
                    const key = `${m}#${p}`;
                    const pr = proofs[key];
                    const ends = pot.join_closes_at + (p + 1) * pot.period_len;
                    if (!pr) {
                      return (
                        <li key={p}>
                          period {p}: <span className="muted">no proof{now >= ends ? " · the period is lost" : ""}</span>
                        </li>
                      );
                    }
                    const rs = rounds[key] || [];
                    const canRule =
                      !!sch && pot.status === "open" && !pr.final_verdict && now >= ends && now < pot.final_deadline && (pr.rounds === 0 || now >= pr.last_round_at + pot.round_interval);
                    return (
                      <li key={p}>
                        period {p}: <strong>{verdictText(pr.final_verdict)}</strong>
                        {!pr.final_verdict && pr.standing.verdict ? ` (leaning ${pr.standing.verdict}, ${pr.standing.confirmations} of ${pot.rounds_required} agreeing)` : ""}{" "}
                        <span className="muted">
                          · {utc(pr.proved_at)} · page sha-256 {pr.content_hash.slice(0, 12)}… ·{" "}
                          <button className="ghost tiny" onClick={() => setShown(shown === key ? "" : key)}>
                            {shown === key ? "hide the frozen page" : `show the frozen page (${pr.total_chars} chars)`}
                          </button>
                        </span>
                        {shown === key && (
                          <div className="hashline" style={{ whiteSpace: "pre-wrap", marginTop: "0.4rem" }}>
                            {pr.url}
                            {"\n"}
                            {pr.text}
                          </div>
                        )}
                        <ul className="timeline">
                          {rs.map((x) => (
                            <li key={x.round}>
                              round {x.round}: {x.finding === "ruled" ? x.verdict : "no verdict"}{" "}
                              <span className="muted">
                                ({x.outcome}
                                {x.reason ? ` · ${REASON[x.reason] || x.reason}` : ""}) · {x.at_text}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {!pr.final_verdict && (
                          <button className="ghost tiny" disabled={disabled || !canRule} onClick={() => onRule(m, p)}>
                            {canRule
                              ? "run a ruling round"
                              : now < ends
                                ? `rulings open at ${utc(ends)}`
                                : now >= pot.final_deadline
                                  ? "final deadline passed · counts as not met"
                                  : `next round from ${utc(pr.last_round_at + pot.round_interval)}`}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {sch?.can_join && myIndex < 0 && (
        <button className="ghost" disabled={disabled} onClick={onJoin}>
          join with {fmtGen(pot.stake)} GEN
        </button>
      )}
      {sch?.can_prove && myIndex >= 0 && (
        <button className="ghost" disabled={disabled || !proofUrl} onClick={onProve}>
          prove period {sch.current_period} with the page above
        </button>
      )}
      {pot.status === "open" && (
        <button className="ghost" style={{ marginLeft: "0.5rem" }} disabled={disabled || !sch?.can_settle} onClick={onSettle}>
          {sch?.can_settle
            ? "settle: write the payouts"
            : sch && sch.now < sch.join_closes_at
              ? "waiting for joining to close"
              : sch && sch.now < sch.periods_end
                ? "waiting for the last period to end"
                : "waiting for every proof to be ruled"}
        </button>
      )}
      {sch?.can_withdraw && myIndex >= 0 && row && (
        <button className="ghost" style={{ marginLeft: "0.5rem" }} disabled={disabled || row.withdrawn || row.payout === "0"} onClick={onWithdraw}>
          {row.withdrawn ? "payout withdrawn" : row.payout === "0" ? "nothing to withdraw" : `withdraw ${fmtGen(row.payout)} GEN`}
        </button>
      )}
    </article>
  );
}

export function StreakPotApp() {
  const { address, provider, connect, error: walletError } = useWallet();
  const [rows, setRows] = useState<PotData[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [books, setBooks] = useState<Books | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [credit, setCredit] = useState(BigInt(0));
  const [gen, setGen] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [err, setErr] = useState("");
  const [tx, setTx] = useState("");
  const [stage, setStage] = useState<TxStage | "">("");

  const [pid, setPid] = useState("harbor/morning-run");
  const [title, setTitle] = useState("Morning run club");
  const [goal, setGoal] = useState(DEMO_GOAL);
  const [periods, setPeriods] = useState("2");
  const [periodLen, setPeriodLen] = useState("300");
  const [stakeGen, setStakeGen] = useState("1");
  const [maxMembers, setMaxMembers] = useState("4");
  const [roundsReq, setRoundsReq] = useState("1");
  const [interval, setIntervalSeconds] = useState("60");
  const [joinWindow, setJoinWindow] = useState("300");
  const [rulingWindow, setRulingWindow] = useState("1800");
  const [proofUrl, setProofUrl] = useState(DEMO_PROOF);

  const loadPots = useCallback(async (count: number) => {
    // Newest first, one page at a time: the console never reads the whole registry.
    const first = await listPots(0, 1);
    const n = first.total;
    setTotal(n);
    const start = Math.max(0, n - count);
    const page = await listPots(start, Math.min(count, n));
    const ids = page.items.map((x) => x[0]).reverse();
    const list = (await Promise.all(ids.map((id) => getPot(id)))).filter(Boolean) as Pot[];
    setLoaded(ids.length);
    const data = await Promise.all(
      list.map(async (pot): Promise<PotData> => {
        const [sch, payouts] = await Promise.all([getSchedule(pot.pot_id), getPayouts(pot.pot_id)]);
        const proofs: Record<string, Proof> = {};
        const rounds: Record<string, RoundRecord[]> = {};
        const cells = [] as [number, number][];
        for (let m = 0; m < pot.member_count; m++) for (let p = 0; p < pot.periods; p++) cells.push([m, p]);
        await Promise.all(
          cells.map(async ([m, p]) => {
            const pr = await getProof(pot.pot_id, m, p);
            if (!pr) return;
            const key = `${m}#${p}`;
            proofs[key] = pr;
            rounds[key] = (await Promise.all(Array.from({ length: pr.rounds }, (_, k) => getRound(pot.pot_id, m, p, k + 1)))).filter(Boolean) as RoundRecord[];
          }),
        );
        return { pot, sch: sch || undefined, proofs, rounds, payouts };
      }),
    );
    setRows(data);
  }, []);

  const refresh = useCallback(
    async (count = Math.max(PAGE_SIZE, loaded)) => {
      setLoading(true);
      try {
        const [ev, b] = await Promise.all([getRecentEvents(10), getBooks()]);
        setBooks(b);
        setEvents(ev);
        await loadPots(count);
        if (address) {
          setGen(await getNativeBalance(address));
          setCredit(await getCredit(address));
        } else {
          setCredit(BigInt(0));
        }
      } catch (e) {
        setErr(`Error: ${e instanceof Error ? e.message : "read failed"}`);
      } finally {
        setLoading(false);
      }
    },
    [address, loadPots, loaded],
  );

  useEffect(() => {
    void refresh(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const onStage = (next: TxStage, hash: string) => {
    setTx(hash);
    setStage(next);
    if (next === "finalized") void refresh();
  };

  /** Send, then decide success from chain state - never from the receipt alone. */
  const run = async (name: string, fn: () => Promise<string | void>, check?: () => Promise<Outcome>) => {
    if (!address || !provider) {
      setErr("Connect MetaMask for writes");
      return;
    }
    setBusy(name);
    setErr("");
    setOutcome(null);
    setStage("");
    try {
      const hash = await fn();
      if (hash) setTx(hash);
      if (check) setOutcome(await check());
      await refresh();
    } catch (e) {
      setErr(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };

  const acct = address as `0x${string}`;
  const disabled = !!busy || !address;
  const stakeWei = toWei(stakeGen);

  const doOpen = () =>
    void run(
      "open_pot",
      () =>
        openPot(acct, provider, { id: pid, title, goal, periods, periodLen, stake: stakeWei, maxMembers, rounds: roundsReq, interval, joinWindow, rulingWindow }, onStage),
      async () => openOutcome(await getPot(pid), acct),
    );

  const doJoin = (pot: Pot) => {
    const before = credit;
    void run(
      "join",
      () => join(acct, provider, pot.pot_id, pot.stake, onStage),
      async () => joinOutcome((await getPot(pot.pot_id))?.member_addrs ?? [], acct, before, await getCredit(acct), BigInt(pot.stake)),
    );
  };

  const doProve = (d: PotData) => {
    const period = d.sch?.current_period ?? 0;
    const member = d.pot.member_addrs.findIndex((a) => a.toLowerCase() === (address || "").toLowerCase());
    void run(
      "prove",
      () => prove(acct, provider, d.pot.pot_id, proofUrl, "", onStage),
      async () => proveOutcome(!!(await getProof(d.pot.pot_id, member, period))),
    );
  };

  const doRule = (d: PotData, member: number, period: number) => {
    const before = d.proofs[`${member}#${period}`]?.rounds ?? 0;
    void run(
      "rule",
      () => rule(acct, provider, d.pot.pot_id, member, period, onStage),
      async () => {
        const pr = await getProof(d.pot.pot_id, member, period);
        return roundOutcome(before, pr ? await getRound(d.pot.pot_id, member, period, pr.rounds) : null);
      },
    );
  };

  const doSettle = (d: PotData) =>
    void run(
      "settle",
      () => settle(acct, provider, d.pot.pot_id, onStage),
      async () => {
        const x = await getPot(d.pot.pot_id);
        return settleOutcome(x?.status ?? "open", x?.member_count ?? 0);
      },
    );

  const doWithdraw = (d: PotData) => {
    const idx = d.pot.member_addrs.findIndex((a) => a.toLowerCase() === (address || "").toLowerCase());
    void run(
      "withdraw_member",
      () => withdrawMember(acct, provider, d.pot.pot_id, onStage),
      async () => withdrawOutcome(!!(await getPayouts(d.pot.pot_id)).rows.find((r) => r.index === idx)?.withdrawn),
    );
  };

  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <h1>
            Streak<span className="accent">Pot</span>
          </h1>
          <p className="lede">
            Everybody says they will keep the habit. Here the group <strong>stakes the same amount</strong>, posts{" "}
            <strong>one proof page per period</strong> (frozen whole on chain), validators say <strong>met or not met</strong> against a goal fixed
            before anyone joined, and the <strong>contract does the sums</strong>: you get back the share of your stake that matches the periods you
            kept, and what the others forfeited goes to the members with the longest streaks.
          </p>
          <div className="chips">
            <span className="chip">
              chain <b>{CHAIN_ID}</b>
            </span>
            <span className="chip">
              pots <b>{total}</b>
            </span>
            {books && (
              <span className="chip">
                held now <b>{fmtGen(books.balance)} GEN</b>
              </span>
            )}
          </div>
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            Contract <a href={EXPLORER}>{short(CONTRACT_ADDRESS, 12)}</a> · nobody is privileged · <a href={GITHUB}>source</a>
          </p>
          <div>
            {!address ? (
              <button onClick={() => void connect()}>Connect MetaMask</button>
            ) : (
              <span className="pill">
                <span className="dot" /> {short(address)} · {gen || "?"} GEN
              </span>
            )}
            {address && (
              <button
                className="ghost"
                style={{ marginLeft: "0.5rem" }}
                disabled={!!busy}
                onClick={() =>
                  void run("Get test GEN", async () => {
                    await fundWithTestGen(acct);
                  })
                }
              >
                Get test GEN
              </button>
            )}
          </div>
          {address && credit > BigInt(0) && (
            <p className="verdictbox">
              The contract holds <strong>{fmtGen(credit.toString())} GEN</strong> for you from a join it refused.{" "}
              <button
                className="ghost tiny"
                disabled={!!busy}
                onClick={() => {
                  const before = credit;
                  void run("withdraw_credit", () => withdrawCredit(acct, provider, onStage), async () => creditOutcome(before, await getCredit(acct)));
                }}
              >
                take it back
              </button>
            </p>
          )}
          {outcome && (
            <p className={outcome.verdict === "done" ? "okmsg" : "msg"}>
              <strong>{outcome.title}.</strong> {outcome.detail}
            </p>
          )}
          {walletError && <p className="msg">{walletError}</p>}
          {err && <p className="msg">{err}</p>}
          {tx && (
            <p className="tx muted">
              last tx <a href={txUrl(tx)}>{short(tx, 14)}</a>{" "}
              {stage === "finalized" ? (
                <span className="stagepill final">finalized · payouts have landed</span>
              ) : (
                <span className="stagepill accepted">accepted — awaiting finalization</span>
              )}
            </p>
          )}
        </div>
        <Flow />
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Before you stake: what is fixed, and what you trust</h2>
        <ul className="decide">
          <li>
            <span className="tag">the goal</span> is written when the pot is opened and fixed for good: no setters, no owner. You trust that it asks for
            something you can show on one page; read it before you stake.
          </li>
          <li>
            <span className="tag">the stake</span> must be exact. A wrong amount, a closed or full pot, or a second join is never lost: the contract keeps
            it as a credit that only you can take back.
          </li>
          <li>
            <span className="tag">the proof</span> one page per member per period, posted during that period and frozen whole (at most 1200 characters).
            Editing the live page afterwards changes nothing. A period without a proof is lost.
          </li>
          <li>
            <span className="tag">the ruling</span> validators only propose met or not met; anything else counts for nothing. With two rounds the same
            answer has to come twice, a full interval apart, and a different answer restarts the count.
          </li>
          <li>
            <span className="tag">the money</span> refund = stake × periods kept ÷ periods. The forfeited rest is split equally between the members with
            the most periods kept. If nobody kept a period, everybody gets their stake back. After the final deadline an unruled proof counts as not met.
          </li>
        </ul>
      </section>

      <div className="row">
        <section className="card">
          <h2>Open a pot</h2>
          <label htmlFor="pid">Pot id</label>
          <input id="pid" value={pid} onChange={(e) => setPid(e.target.value)} />
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label htmlFor="goal">Goal a proof has to meet</label>
          <textarea id="goal" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} />
          <div className="grid2">
            <div>
              <label htmlFor="stake">Stake per member (GEN, at least 1)</label>
              <input id="stake" value={stakeGen} onChange={(e) => setStakeGen(e.target.value)} />
            </div>
            <div>
              <label htmlFor="maxm">Members (2–8)</label>
              <input id="maxm" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
            </div>
            <div>
              <label htmlFor="periods">Periods (2–6)</label>
              <input id="periods" value={periods} onChange={(e) => setPeriods(e.target.value)} />
            </div>
            <div>
              <label htmlFor="plen">Length of a period (s)</label>
              <input id="plen" value={periodLen} onChange={(e) => setPeriodLen(e.target.value)} />
            </div>
            <div>
              <label htmlFor="jw">Joining open for (s)</label>
              <input id="jw" value={joinWindow} onChange={(e) => setJoinWindow(e.target.value)} />
            </div>
            <div>
              <label htmlFor="rw">Ruling window after the last period (s)</label>
              <input id="rw" value={rulingWindow} onChange={(e) => setRulingWindow(e.target.value)} />
            </div>
            <div>
              <label htmlFor="rounds">Agreeing rounds (1 or 2)</label>
              <input id="rounds" value={roundsReq} onChange={(e) => setRoundsReq(e.target.value)} />
            </div>
            <div>
              <label htmlFor="interval">Interval between rounds (s)</label>
              <input id="interval" value={interval} onChange={(e) => setIntervalSeconds(e.target.value)} />
            </div>
          </div>
          <button disabled={disabled || !pid || !title || !goal || stakeWei === ""} onClick={doOpen}>
            {busy === "open_pot" ? (
              <span className="working">
                <span className="spinner" /> opening the pot…
              </span>
            ) : (
              "open the pot (no money moves yet)"
            )}
          </button>
        </section>

        <section className="card">
          <h2>Prove</h2>
          <p className="muted">
            Members hand in one page per period, while the period runs; it is frozen whole when the transaction lands. Pick a pot below and press{" "}
            <em>prove</em>.
          </p>
          <label htmlFor="purl">Proof page (https, at most 1200 characters)</label>
          <input id="purl" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} />
          <ol className="decide">
            <li>Anyone opens a pot; members join with the exact stake before joining closes.</li>
            <li>Each member posts one proof per period.</li>
            <li>Anyone runs ruling rounds once a period has ended.</li>
            <li>Anyone settles after the last period; every member then withdraws its payout.</li>
          </ol>
          <p className="muted">
            Anything the contract refuses on a join is shown as &quot;did NOT join&quot; with your credit and a button to take it back.
          </p>
        </section>
      </div>

      <section style={{ marginTop: "2rem" }}>
        <div className="head">
          <h2>Pots on chain (newest first)</h2>
          <button className="ghost" disabled={loading} onClick={() => void refresh()}>
            {loading ? "reading…" : "refresh"}
          </button>
        </div>
        {rows.length === 0 && !loading && <p className="muted">No pots yet.</p>}
        {rows.map((d) => (
          <PotCard
            key={d.pot.pot_id}
            d={d}
            me={address}
            disabled={disabled}
            proofUrl={proofUrl}
            onPick={() => setPid(d.pot.pot_id)}
            onJoin={() => doJoin(d.pot)}
            onProve={() => doProve(d)}
            onRule={(m, p) => doRule(d, m, p)}
            onSettle={() => doSettle(d)}
            onWithdraw={() => doWithdraw(d)}
          />
        ))}
        {loaded < total && (
          <button className="ghost" style={{ marginTop: "1rem" }} disabled={loading} onClick={() => void refresh(loaded + PAGE_SIZE)}>
            load {Math.min(PAGE_SIZE, total - loaded)} older pots ({total - loaded} not shown)
          </button>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Recent events</h2>
        {events.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          <ul className="timeline">
            {events.map((e) => (
              <li key={e.n}>
                <strong>{String(e.event)}</strong>{" "}
                <span className="muted">
                  {[
                    e.pot_id,
                    e.index !== undefined ? `member ${e.index}` : null,
                    e.member !== undefined ? `member ${e.member}` : null,
                    e.period !== undefined ? `period ${e.period}` : null,
                    e.round ? `round ${e.round}` : null,
                    e.finding,
                    e.outcome,
                    e.status,
                    e.stake ? `${fmtGen(String(e.stake))} GEN` : null,
                    e.amount ? `${fmtGen(String(e.amount))} GEN` : null,
                  ]
                    .filter(Boolean)
                    .map(String)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="foot">
        StreakPot on GenLayer Studio Dev (chain {CHAIN_ID}). Reads work without a wallet; writes need MetaMask and test GEN. The demo proof pages are
        files in this repository.
      </footer>
    </main>
  );
}
