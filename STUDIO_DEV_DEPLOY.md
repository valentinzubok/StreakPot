# StreakPot — Studio Dev (chain 61997) deploy record

| | |
|---|---|
| **Network** | GenLayer Studio Dev / Studio Next — chain `61997` |
| **Contract** | [`0xD727b6E139Bb7f256D0ce4D488206AAcea7c6158`](https://explorer-studio-dev.genlayer.com/address/0xD727b6E139Bb7f256D0ce4D488206AAcea7c6158) |
| **Deploy tx** | [`0xd1c3bd82…49fe44`](https://explorer-studio-dev.genlayer.com/tx/0xd1c3bd823f5d03146fb6e9b0a77754a138558de13e83f6ef5c94582a4649fe44) from `0x18bcc2BDe281876915A6Df2994397f4d2d5B0C4f`, which has no role in the contract |
| **Source** | [`contracts/StreakPot.py`](contracts/StreakPot.py) — runner `py-genlayer:kzybg95x1gn21dw72m7hyg0maaap04n4nx55j9yt6fkdqxtz6bz0` |
| **Source sha256** | `49df67a880e563ce6a024b91ece96f7116f75270faf7ae17e400069d518f797f` |

## Verify the source yourself

```bash
curl -s -X POST https://studio-dev.genlayer.com/api -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"gen_getContractCode","params":["0xD727b6E139Bb7f256D0ce4D488206AAcea7c6158"]}' \
  | python3 -c "import sys,json,base64,hashlib; print(hashlib.sha256(base64.b64decode(json.load(sys.stdin)['result'])).hexdigest())"
shasum -a 256 contracts/StreakPot.py
# both print 49df67a880e563ce6a024b91ece96f7116f75270faf7ae17e400069d518f797f
```

CI runs the same comparison on every push (`scripts/verify_deployment.py`).

## Runner

Studio Dev moved to GenVM v0.4 on 2026-11-16: contracts deployed with the earlier runner (`babwp9t3…`) answer
every read with `invalid_contract runner malformed`. This contract uses the `py-genlayer` runner listed on the
[official runners page](https://sdk.genlayer.com/main/executors/v0.4/python-sdk/available-runners.html). The file
keeps the `# v0.3.0` header line: Studio Dev accepted both `v0.3.0` and `v0.4.0` in a throwaway deploy.

## Lint

`sh scripts/lint_current_sdk.sh` — `genvm-lint lint` on the file as deployed, then `check` and `typecheck`
on a copy whose header uses the runner bundled with the public linter (`1jb45aa8…`); the linter cannot
download the current runner. The contract body is byte-identical. Passed.

## The run

Accounts (throwaway test keys): creator `0x5F3C9CB529aA00EdEa8705c2902e98F87d866334`, creator 2
`0x74889B524B76B8025B0e4A3989fb52aCADd8aa89`, Ann `0x0E2e7998dD0d21f2f2D858aD8790c77Cee090100`, Bob
`0x2C89822F9be97Cf00e52ED1875c2Dffde02d3bc9`, Cy `0x2e888A13c5993C3dD126C7De8B009E9A7cA2Babf`, Dee
`0xCDD17e18269597432f3Eaf313255AeE7c53BA1eD`, Eve `0x660e820e5911ACC73B1044C7CAc6e14b712f92b4`, Hal
`0xE35AFF0957032bBdE53313e35a38Fb17e587C7b7`, stranger `0x1926F57D7415084ceB6CA6ae2fc7FA7930C899f4`, stranger 2
`0x1dD20E9F801b1a13C328784211404b441C98b45d`. Proof pages are files of this repository, read from
`raw.githubusercontent.com`. All of it ran on 2026-11-16; every call of the final run is below, including the
refused ones. Calls sent together were sent from different accounts, so they are listed in the order they finished.

| # | Call | Sender | Result | What happened | Tx |
|---|------|--------|--------|---------------|----|
| 1 | `open_pot(solo-4)` | creator 2 | SUCCESS | `solo-4`: 2 periods of 120 s, joining open 260 s, a pot that will get one member | [`0xbe3096b3…f79125`](https://explorer-studio-dev.genlayer.com/tx/0xbe3096b38efd648f2e49c6faea5d034220cdd86884de3cd91a6cdad059f79125) |
| 2 | `open_pot(streak-4)` | creator | SUCCESS | `streak-4`: 2 periods of 300 s, stake 1 GEN, up to 3 members, 1 round per proof, joining open 420 s, ruling window 1200 s | [`0x6f6e3396…5757ce`](https://explorer-studio-dev.genlayer.com/tx/0x6f6e3396975c109afa70f09d25089e12bdb9be196a94c83f6f3de396645757ce) |
| 3 | `join(streak-4)` value 1 GEN | Ann | SUCCESS | Ann joins `streak-4` (the three joins were sent together; the chain ordered them Cy 0, Bob 1, Ann 2) | [`0x161836aa…f520c7`](https://explorer-studio-dev.genlayer.com/tx/0x161836aaa9ce66a178a9f80319930d9be082a30d4f4d21610f08468f28f520c7) |
| 4 | `join(streak-4)` value 1 GEN | Cy | SUCCESS | Cy joins `streak-4` (member 0) | [`0x99b17d1b…127823`](https://explorer-studio-dev.genlayer.com/tx/0x99b17d1b3f557cb688ce56261b7fc3bcded0107d3d0f52f0b2ecb811a1127823) |
| 5 | `join(streak-4)` value 1 GEN | Bob | SUCCESS | Bob joins `streak-4` (member 1) | [`0xc10e3523…cb3fcd`](https://explorer-studio-dev.genlayer.com/tx/0xc10e3523cec49cf47c28b1b44f6829f0ea9facc5fc529634f8bad7a7fbcb3fcd) |
| 6 | `join(solo-4)` value 1 GEN | Hal | SUCCESS | Hal joins `solo-4` (the only member) | [`0xe71b4f7f…c79810`](https://explorer-studio-dev.genlayer.com/tx/0xe71b4f7f51194d122187ceb8542f0959bd0076c3b25af06a7696cec4a0c79810) |
| 7 | `join(streak-4)` value 1 GEN | Ann | SUCCESS | Ann joins again: refused in the return value (already a member), the 1 GEN is credited | [`0xac6b02b2…72cca2`](https://explorer-studio-dev.genlayer.com/tx/0xac6b02b225ebb33dbb9283baa91b65391c272fedf41fc4aed14735515972cca2) |
| 8 | `join(streak-4)` value 1 GEN | Dee | SUCCESS | Dee joins with the exact stake after three members: refused (the pot is full), 1 GEN credited | [`0xc2777ef6…6ac65e`](https://explorer-studio-dev.genlayer.com/tx/0xc2777ef63d4c89f4a10474489e4aee36373dad7e8a4d4fd4dccd74fed56ac65e) |
| 9 | `join(streak-4)` value 0.5 GEN | Eve | SUCCESS | Eve joins with 0.5 GEN: refused (wrong stake), 0.5 GEN credited | [`0x9db79b97…8f16ed`](https://explorer-studio-dev.genlayer.com/tx/0x9db79b97af8e69883ee0ef31e7655ac4a617cd538b28a7961750135a908f16ed) |
| 10 | `join(streak-4)` value 1 GEN | Eve | SUCCESS | Eve joins with 1 GEN after the join window closed: refused (joining is closed), 1 GEN credited | [`0xc35328e5…378a1b`](https://explorer-studio-dev.genlayer.com/tx/0xc35328e5c8e32be3a4d62d1c18ef8a2080402d87a2b250416c8ff2eda0378a1b) |
| 11 | `prove(streak-4)` | stranger | **ERROR** | the stranger proves in period 0 but is not a member: **UserError** `only a member can prove` | [`0xde700c2e…b06af0`](https://explorer-studio-dev.genlayer.com/tx/0xde700c2e20adc622c38788ae95cc31bb0815ddd295e1b7ce0ddd72162bb06af0) |
| 12 | `prove(streak-4)` | Ann | SUCCESS | Ann proves period 0 with `done-1.md`; page frozen | [`0x1ae96341…ce1cb0`](https://explorer-studio-dev.genlayer.com/tx/0x1ae963412a8fcc27ebf8f92bad778b5e90dd7842bbd687b27f3b0303b5ce1cb0) |
| 13 | `prove(streak-4)` | Bob | SUCCESS | Bob proves period 0 with `done-3.md`; page frozen | [`0x0c4171d9…c78cd0`](https://explorer-studio-dev.genlayer.com/tx/0x0c4171d940edc66d32e7cf61c6480524dfff3f8196ca6e715d410ae902c78cd0) |
| 14 | `withdraw_member(streak-4)` | Cy | **ERROR** | Cy withdraws before settling: **UserError** `the pot is not settled` | [`0xa0de2578…24a6f7`](https://explorer-studio-dev.genlayer.com/tx/0xa0de25783214ed15aaf741aad9bdcf84ac16b776f873db5377ef73ddbb24a6f7) |
| 15 | `prove(streak-4)` | Ann | **ERROR** | Ann proves period 0 a second time (`done-2.md`): **UserError** `one proof per member per period` | [`0xb294f2a2…f1fb6b`](https://explorer-studio-dev.genlayer.com/tx/0xb294f2a25ad95e1712fa951a33dc8c0dc6793fab724669bb89cb05670ef1fb6b) |
| 16 | `rule(streak-4, 0, 0)` | stranger | **ERROR** | the stranger rules `(member 0, period 0)`: **UserError** `no such proof` (Cy has no proof in period 0; the script used the wrong index, see the note below) | [`0x1114dfca…ed7e2e`](https://explorer-studio-dev.genlayer.com/tx/0x1114dfca4619e82ecc55629199a36e5f96067ab186a26306c04cc81a25ed7e2e) |
| 17 | `settle(streak-4)` | stranger 2 | **ERROR** | stranger 2 settles during period 0: **UserError** `the last period ends at 1794857818` | [`0x68f52208…38501b`](https://explorer-studio-dev.genlayer.com/tx/0x68f522089e0fc5698b1638cb3ac32ec2cfc74e69c4b7407db9257fc0c838501b) |
| 18 | `prove(streak-4)` | Ann | SUCCESS | Ann proves period 1 with `done-2.md`; page frozen | [`0x87411f8e…3dd0eb`](https://explorer-studio-dev.genlayer.com/tx/0x87411f8efe5588ab6ce529c319853a29e07c4232349ff46075eef1e4a83dd0eb) |
| 19 | `prove(streak-4)` | Cy | SUCCESS | Cy proves period 1 with `weak.md` (one vague line); page frozen | [`0x5058904a…d72438`](https://explorer-studio-dev.genlayer.com/tx/0x5058904a446e244aed0836766be9f8e465742cf7e04d9e77dd395d0844d72438) |
| 20 | `rule(streak-4, 0, 0)` | stranger | **ERROR** | the stranger rules `(member 0, period 0)` again while waiting for the period to end: **UserError** `no such proof` (script indexing slip, repeated) | [`0x85a8f882…d94395`](https://explorer-studio-dev.genlayer.com/tx/0x85a8f88201467fc4e0bc0f40c81e40982fddd0010e0028920b405f0cead94395) |
| 21 | `rule(streak-4, 0, 0)` | stranger | **ERROR** | the stranger rules `(member 0, period 0)` again while waiting for the period to end: **UserError** `no such proof` (script indexing slip, repeated) | [`0xd5f2ac49…3f2cdd`](https://explorer-studio-dev.genlayer.com/tx/0xd5f2ac490816774d94f19363e645402d72daa2cf9f97f963143a0ddccf3f2cdd) |
| 22 | `rule(streak-4, 0, 0)` | stranger | **ERROR** | the stranger rules `(member 0, period 0)` again while waiting for the period to end: **UserError** `no such proof` (script indexing slip, repeated) | [`0x25a95082…09a22e`](https://explorer-studio-dev.genlayer.com/tx/0x25a95082c4fd899d6f3215ae1cbe225671f813886c7c872e241691632c09a22e) |
| 23 | `rule(streak-4, 0, 0)` | stranger | **ERROR** | the stranger rules `(member 0, period 0)` again while waiting for the period to end: **UserError** `no such proof` (script indexing slip, repeated) | [`0x82b33d13…8b6c19`](https://explorer-studio-dev.genlayer.com/tx/0x82b33d13e39780f2a3af60daf499700078a6946beae3ce6c542196b52d8b6c19) |
| 24 | `rule(streak-4, 0, 0)` | stranger | **ERROR** | the stranger rules `(member 0, period 0)` again while waiting for the period to end: **UserError** `no such proof` (script indexing slip, repeated) | [`0xf47a5dc8…764ffb`](https://explorer-studio-dev.genlayer.com/tx/0xf47a5dc872c9e86b4e04707483c0396005c2a56fce715e003210885e29764ffb) |
| 25 | `rule(streak-4, 0, 0)` | stranger | **ERROR** | the stranger rules `(member 0, period 0)` again while waiting for the period to end: **UserError** `no such proof` (script indexing slip, repeated) | [`0x72120e9a…9a9dd6`](https://explorer-studio-dev.genlayer.com/tx/0x72120e9a6173791c56447d0f6abdc7fec65a08f8a3754d12a637268bfe9a9dd6) |
| 26 | `rule(streak-4, 1, 0)` | stranger | SUCCESS | Bob's period 0 proof is ruled: round 1 (19:33:04 UTC) `met` → **final** | [`0xca71c626…808f8d`](https://explorer-studio-dev.genlayer.com/tx/0xca71c6261b85eaf30db3c5efb0b6ef3f1ddc59f792315d5c64ee3740fb808f8d) |
| 27 | `prove(streak-4)` | Bob | **ERROR** | Bob proves period 0 again after all periods are over: **UserError** `all periods are over` | [`0xb6f546dd…048471`](https://explorer-studio-dev.genlayer.com/tx/0xb6f546dd23765355621b2964458975acf490b3cfa997f1c23b608b8f15048471) |
| 28 | `settle(streak-4)` | stranger | **ERROR** | settle while Cy's period 1 proof is not ruled: **UserError** `a proof of member 0 (period 1) is not ruled yet; settle is accepted before the final deadline only when every proof is ruled` | [`0x83a9b5e5…26e8d1`](https://explorer-studio-dev.genlayer.com/tx/0x83a9b5e5e6a531d9f6a11ae7bd19b7afc1c7cc35c53b05999351bb1eb226e8d1) |
| 29 | `rule(streak-4, 0, 1)` | stranger | SUCCESS | Cy's period 1 proof (`weak.md`) is ruled: round 1 (19:37:14 UTC) `not_met` → **final** | [`0xbaa6e2bc…3cbf33`](https://explorer-studio-dev.genlayer.com/tx/0xbaa6e2bcad85fd434a3af44f41a65a238d8777d6bb4b666dc9663b211e3cbf33) |
| 30 | `rule(streak-4, 2, 1)` | stranger | SUCCESS | Ann's period 1 proof (`done-2.md`) is ruled: round 1 (19:37:32 UTC) `met` → **final** | [`0x328e8861…14e725`](https://explorer-studio-dev.genlayer.com/tx/0x328e88614dda75ab314da23b9ee2aeee1d413ab66bbd8c0b25d800172f14e725) |
| 31 | `settle(streak-4)` | stranger | **ERROR** | settle while Ann's period 0 proof is not ruled yet: **UserError** `a proof of member 2 (period 0) is not ruled yet` | [`0x983f1f61…b388bd`](https://explorer-studio-dev.genlayer.com/tx/0x983f1f6189d2e996cabd1a10cd08b68fcf9ebcccc549b2984e5a114399b388bd) |
| 32 | `withdraw_member(streak-4)` | Ann | **ERROR** | `withdraw_member` before the pot is settled: **UserError** `the pot is not settled` | [`0x7d1b68f0…43eefb`](https://explorer-studio-dev.genlayer.com/tx/0x7d1b68f01913d9de37b70cffcc8824ec9a4452a8587a8b8bfc881e9e7d43eefb) |
| 33 | `withdraw_member(streak-4)` | Bob | **ERROR** | `withdraw_member` before the pot is settled: **UserError** `the pot is not settled` | [`0x6b4534f0…faa909`](https://explorer-studio-dev.genlayer.com/tx/0x6b4534f033183caf82b27e23a413164303a922b37a3e15afc6df079282faa909) |
| 34 | `withdraw_member(streak-4)` | Cy | **ERROR** | `withdraw_member` before the pot is settled: **UserError** `the pot is not settled` | [`0x0125d659…4c368d`](https://explorer-studio-dev.genlayer.com/tx/0x0125d659719ca81e1d52dee15938ba4e42a0cbbf3d7e64b1b76fd7e3de4c368d) |
| 35 | `withdraw_member(streak-4)` | Ann | **ERROR** | `withdraw_member` before the pot is settled: **UserError** `the pot is not settled` | [`0x9b9ebeb2…6b0aec`](https://explorer-studio-dev.genlayer.com/tx/0x9b9ebeb266b6f0105bba97752459947e705148e4bb2905b0284e1c6b8f6b0aec) |
| 36 | `withdraw_member(streak-4)` | Dee | **ERROR** | `withdraw_member` before the pot is settled: **UserError** `the pot is not settled` | [`0xaf4e2b65…ab84ed`](https://explorer-studio-dev.genlayer.com/tx/0xaf4e2b65085bb1afb4a98aae69dabfc6c88647f1cc89aa1c8276e8c43eab84ed) |
| 37 | `settle(solo-4)` | stranger | SUCCESS | `solo-4` settles after its join window: one member → **VOID** | [`0x122a0ba1…faeaa4`](https://explorer-studio-dev.genlayer.com/tx/0x122a0ba1e499bea0a1993098cb03b65c25f945e6f0ec1daa9c5cbcb52bfaeaa4) |
| 38 | `withdraw_member(solo-4)` | Hal | SUCCESS | Hal withdraws his stake back from the void pot (1 GEN) | [`0xd27e75cf…91ea29`](https://explorer-studio-dev.genlayer.com/tx/0xd27e75cf8f681a5ea02ee4d5566a53966cabe840075bd262be5fafb00b91ea29) |
| 39 | `withdraw_member(solo-4)` | Hal | **ERROR** | Hal withdraws again: **UserError** `this payout was already withdrawn` | [`0x1bdc1a61…1d619e`](https://explorer-studio-dev.genlayer.com/tx/0x1bdc1a61ce7370fb8e34fc163cd12625c05e99b14cd7521e1b866e9b341d619e) |
| 40 | `withdraw_credit()` | Ann | SUCCESS | Ann takes back her credit (the refused join, plus what two aborted earlier runs of this script credited) | [`0x39c46e91…9e216f`](https://explorer-studio-dev.genlayer.com/tx/0x39c46e91cebdf2bdfc69a8d343545bb2e6510501fbba4e387b0a6ace8a9e216f) |
| 41 | `withdraw_credit()` | Dee | SUCCESS | Dee takes back her credit (same) | [`0xcc667c74…392e9c`](https://explorer-studio-dev.genlayer.com/tx/0xcc667c74bcd0c06002c4f38d968cb4edf9b15c7f821b50006f4c2a1cfb392e9c) |
| 42 | `withdraw_credit()` | Eve | SUCCESS | Eve takes back her credit (same) | [`0x46aab553…942eb1`](https://explorer-studio-dev.genlayer.com/tx/0x46aab5532018b45a1b9c404f986f46a6bdb97f891edd27e830efc3d058942eb1) |
| 43 | `withdraw_credit()` | stranger | **ERROR** | the stranger has no credit: **UserError** `no credit for this address` | [`0x815182c0…e597f8`](https://explorer-studio-dev.genlayer.com/tx/0x815182c0a6414ffc7432f0ac55689b26e4a065ef78eeee84d14fa29d81e597f8) |
| 44 | `rule(streak-4, 2, 0)` | stranger | SUCCESS | Ann's period 0 proof (`done-1.md`) is ruled: round 1 (19:43:57 UTC) `met` → **final** | [`0x3a9cfd07…dc7951`](https://explorer-studio-dev.genlayer.com/tx/0x3a9cfd07e319f5fbc72360df426478058833cafdde1bc81751ed6b2e9fdc7951) |
| 45 | `settle(streak-4)` | stranger | SUCCESS | `settle(streak-4)` → **FINAL**: Cy 0 periods kept, Bob 1, Ann 2 | [`0x812d9aa4…23e57a`](https://explorer-studio-dev.genlayer.com/tx/0x812d9aa4a274b00c4931b27e7c0f781096db6725058c15e837cd35bd8023e57a) |
| 46 | `withdraw_member(streak-4)` | Ann | SUCCESS | Ann withdraws 2.5 GEN (refund 1 + bonus 1.5) | [`0x3e9cb3f7…96642e`](https://explorer-studio-dev.genlayer.com/tx/0x3e9cb3f727d9364789ae7d54e596423d790c8a3f9c05ba742d9d8432ea96642e) |
| 47 | `withdraw_member(streak-4)` | Bob | SUCCESS | Bob withdraws 0.5 GEN (refund 0.5) | [`0x69d0d971…7b5c42`](https://explorer-studio-dev.genlayer.com/tx/0x69d0d97165782b90b8d9cf4e0d9ba7f7bb695d5ca1342167ad051b9b3d7b5c42) |
| 48 | `withdraw_member(streak-4)` | Cy | SUCCESS | Cy withdraws: payout is 0 (no transfer, marked withdrawn) | [`0xeb627f88…2debe1`](https://explorer-studio-dev.genlayer.com/tx/0xeb627f8886f73ba540ab0328837dde3221126826005b9fa17743f5ad2d2debe1) |
| 49 | `withdraw_member(streak-4)` | Ann | **ERROR** | Ann withdraws again: **UserError** `this payout was already withdrawn` | [`0x59faec10…b2f84b`](https://explorer-studio-dev.genlayer.com/tx/0x59faec106fa251de4f75918cb3625c2bf3aad5de70c093e9006dfa3dbeb2f84b) |
| 50 | `withdraw_member(streak-4)` | Dee | **ERROR** | Dee is not a member: **UserError** `only a member can withdraw` | [`0x6406a238…e6258f`](https://explorer-studio-dev.genlayer.com/tx/0x6406a23858a3bf19c565a1ad1edeb8557edf5d10555b9a5cb24d99c38be6258f) |

### What the run shows

* **The sums are the contract's.** `streak-4` has 2 periods and a 1 GEN stake. Ann kept both periods (`done-1.md`
  and `done-2.md`, both ruled `met`), Bob one (`done-3.md` `met`, nothing in period 1), Cy none that counted
  (`weak.md`, one vague line, ruled `not_met`). Refunds 1 + 0.5 + 0 = 1.5 GEN; the 1.5 GEN forfeited went to Ann, the only
  member with the most periods kept: payouts Ann 2.5, Bob 0.5, Cy 0 = the 3 GEN staked.
* **A refused join is never lost.** Joins that were a repeat, over the cap, the wrong amount or after the window
  were not reverted: the value became a credit, and each of those accounts took it back.
* **Time is checked on chain.** A non-member cannot prove; one proof per member per period; no proof after the
  last period; no ruling before a period has ended; `settle` is refused while a proof is unruled (twice, with the
  member and period named) and before the last period ends.
* **A pot with one member is VOID** and the stake comes back (`solo-4`); a second withdrawal is refused.
* **Withdrawals are once each.** A second withdrawal and a non-member's withdrawal are refused; a member owed 0
  can still mark the pot withdrawn without a transfer.
* **Money.** After the run `get_balance` read 8 GEN held and 0 credits; see the note on leftover pots below.

### Notes on this run (honest)

* **The first attempts of this demo crashed** (an RPC rate limit, then two nonce collisions from sending two
  transactions from one account at once). They left pots `streak-1`…`streak-3` and `solo-1`…`solo-3` open on the
  contract with their stakes inside; they were never settled, which is why the contract still holds 8 GEN
  after the run (the 3 GEN of `streak-4` were paid out; the rest belongs to those unfinished pots, which any
  member can still settle and withdraw once their periods are over). Their transactions are not in the table; the
  credits they created are included in the credit withdrawals of txs 40–42.
* **A slip in the demo script.** The three joins were sent together, so the chain ordered the members Cy 0,
  Bob 1, Ann 2, while the script assumed Ann 0. The script therefore asked for a ruling of `(member 0, period 0)`
  seven times (txs 16 and 20–25), which does not exist: those refusals (`no such proof`) are real contract
  answers but were not intended. Ann's period 0 proof was ruled afterwards by a second script (txs 44–50), which
  also repeated the withdrawals and the settlement; txs 32–36 are the five attempts to withdraw before the pot was settled.
* The numbers in the payout table are what the chain returned (`get_payouts`).

### What this run did not show

* **A round on which validators disagree.** Every ruling round in this run was recorded on the first try, so the
  "reverts and is sent again" path was not exercised on chain. It is covered by unit tests (a consensus failure
  records nothing).
* **`rounds_required = 2`, a restart, an `unclear` round** and a model answer the code rejects: covered by unit
  tests; a model cannot be made to fail on demand.
* **The ruling-window and final-deadline boundaries** (an unruled proof counting as not met, ruling refused at the
  deadline): covered by unit tests with a controlled clock, not run on chain.
* **A pot filled to 8 members, a tie for the most periods and dust:** unit tests only.
* The 130-pot registry and event paging are covered by unit tests, not by 130 transactions.
