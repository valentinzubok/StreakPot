# StreakPot

<p align="center">
  <img src="assets/logo.png" alt="StreakPot" width="120" />
</p>

<p align="center">
  <strong>A group stake that pays the people who kept their streak: everyone stakes the same amount, validators judge one proof page per period against a goal fixed up front, and the contract splits the money.</strong>
</p>

<p align="center">
  <a href="https://valentinzubok.github.io/StreakPot/"><img src="https://img.shields.io/badge/Live-Console-f59e0b?style=flat-square" alt="Live console" /></a>
  <a href="https://github.com/valentinzubok/StreakPot/actions/workflows/ci.yml"><img src="https://github.com/valentinzubok/StreakPot/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/GenLayer-Studio%20Dev%2061997-f59e0b?style=flat-square" alt="Studio Dev" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT" /></a>
</p>

---

## The trust problem

A group of friends says "we will run three times a week" and each puts money in. Who decides who kept
the streak? The one who holds the money can be talked round, and a model that reads the proofs can be
talked into a yes by the page it is reading. Everyone also wants a clear rule for what happens to the
money of the people who quit.

**StreakPot fixes the goal and the payout rule before anyone joins, freezes every proof whole on chain,
lets validators only answer `met` or `not_met`, and leaves the sums to the contract.**

```
open_pot(pot_id, title, goal, periods, period_len, stake, max_members,
         rounds_required, round_interval, join_window, ruling_window)     anyone; fixes every rule; not payable
join(pot_id)               PAYABLE: exactly `stake`, strictly BEFORE the join window closes.
                           Anything else (wrong amount, closed, full, already a member, unknown pot)
                           never reverts: the value becomes a credit
prove(pot_id, url, note)   a member, DURING a period, one proof per member per period;
                           the page (at most 1200 characters) is frozen whole on chain
rule(pot_id, member, period)  anyone, once that period has ended and before the final deadline: one ruling
                           round of one proof. Validators answer `met` or `not_met`. With
                           rounds_required = 2 the same answer must come twice, a full interval apart
settle(pot_id)             anyone, after the last period. Before the final deadline only when every proof
                           is ruled; from it on always (an unruled proof counts as not met).
                           done = periods with a final `met`; refund = stake * done // periods; what is
                           forfeited goes equally to the members with the most periods kept, the dust to
                           the first of them. Nobody kept a period -> everybody gets their stake back.
                           Fewer than two members -> VOID, every stake comes back
withdraw_member(pot_id)    each member, once: what the books name
withdraw_credit()          take back what a join refused to escrow
get_round(pot_id, member, period, k)   every ruling round, kept for good
list_pots(offset, limit) / get_events(offset, limit)   paged, no global cap
```

## What a member can check before staking

| Question | Answer |
|---|---|
| What is the goal and the rule for the money? | The goal, the number and length of periods, the stake, the member cap, the rounds, the join window and the ruling window are fixed when the pot is opened; there are no setters and no owner. |
| Can the page talk the model into a yes? | The page is fenced as untrusted data and instruction-like phrasing is flagged and stored with every round. The model only proposes `met` or `not_met`; a string, a number, a boolean, a different casing or a verdict nobody asked for counts for nothing, and the contract re-checks the verdict after consensus. |
| Can one odd reading decide a period? | With `rounds_required = 2` the same answer has to come twice, a full interval apart; a different answer restarts the count. An unclear round moves nothing and is kept as evidence. |
| What is judged? | The page frozen whole when the member posted it (at most 1200 characters, so validators read all of it). Editing the live page afterwards changes nothing. |
| Can I be tricked into a wrong stake? | `join` accepts only the exact stake. Everything it cannot accept is credited to the sender, never lost; only that address can take it back. |
| Can someone prove for me, or after the fact? | Only a member can prove, only during the running period, once per period. A period without a proof is lost. |
| Can transaction order choose who is paid? | No. `rule` works only before the final deadline and `settle` before it only when nothing is left to rule; `get_schedule` never offers both. |
| What if validators cannot rule? | An `unclear` round counts for nothing. A proof nobody could rule by the final deadline counts as not met, so the pot always settles. |
| Can the registry fill up? | No cap: pots, members, proofs, rounds and events live in `TreeMap`s with a `DynArray` index; a stake is at least 1 GEN; views are paged. |
| Do the books balance? | Yes, by construction and by a 240-step random test: the payouts of a pot always add up to the stakes that went in. |

**What you still trust:** that the goal asks for something one page can show (the creator writes it:
read it before you stake), and that validators agree on whether a page meets it. A model can read a
borderline page either way; with two rounds a single odd reading cannot decide a period.

## Live

| | |
|---|---|
| Console | **https://valentinzubok.github.io/StreakPot/** (reads work with no wallet) |
| Network | GenLayer Studio Dev / Studio Next — chain `61997` |
| Contract | [`0xD727b6E139Bb7f256D0ce4D488206AAcea7c6158`](https://explorer-studio-dev.genlayer.com/address/0xD727b6E139Bb7f256D0ce4D488206AAcea7c6158) — CI checks the deployed code equals [`contracts/StreakPot.py`](contracts/StreakPot.py) |
| Deploy record | [`STUDIO_DEV_DEPLOY.md`](STUDIO_DEV_DEPLOY.md) — every transaction of the demo, including the refused ones |

## Demo proof pages

Files in this repository, read from `raw.githubusercontent.com`:
[`done-1.md`](web/public/fixtures/proofs/done-1.md), [`done-2.md`](web/public/fixtures/proofs/done-2.md) and
[`done-3.md`](web/public/fixtures/proofs/done-3.md) (concrete run logs: distance, time, route) and
[`weak.md`](web/public/fixtures/proofs/weak.md) (one vague line).

## Lint

`sh scripts/lint_current_sdk.sh` runs the official GenVM linter (`lint`, `check`, `typecheck`); CI runs it
on every push. Every refusal raises `gl.vm.UserError`; every method takes `self`.

## The console

[`web/`](web/) — Next.js 16 + `genlayer-js` + MetaMask, static export to Pages. It shows the trust card
before any money moves, every member's proofs with the frozen page, every ruling round, the schedule and
the payouts. Success is decided by reading the contract **after** the call
([`outcome.ts`](web/src/lib/outcome.ts)): a refused join is shown as "did NOT join" with the credit and a
button to take it back.

```bash
cd web && npm install
npm test        # 15 tests
npm run dev     # http://localhost:3023
```

## Tests

```bash
pip install -r requirements-dev.txt
python3 -m pytest -q      # 117 tests
```

[`tests/test_streakpot.py`](tests/test_streakpot.py): the rules the code refuses at opening; exact stake and
the credits for every refused join (wrong amount, the join window's last second, full, twice, unknown, settled);
who may prove and the second a period changes; ten kinds of model answer the code ignores; forged consensus
answers; one and two agreeing rounds, restarts and the interval after an unclear round; the final deadline (one
second before and at); payouts, ties, dust and floored refunds; everybody-lost; a void pot; withdrawals and
double withdrawals; the schedule at every few seconds (rule and settle never both open); no registry cap; and
the books balancing through a 240-step random run.

## License

[MIT](LICENSE) © 2026 Valentyn Zubok
