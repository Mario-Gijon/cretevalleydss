# CreteValleyDSS Issue Scenario Lab

Issue Scenario Lab is a small Python CLI/library for generating local
CreteValleyDSS issue variants through the real Backend HTTP API. It currently
implements `no-consensus-basic`, `no-consensus-criteria-weighting`, and
`no-consensus-expert-weights`.

Every future operation will use existing HTTP routes so that authentication,
authorization, workflows, and persistence match normal development users. The
tool never accesses MongoDB directly and does not run a web server.

Use this tool only with a local or development Backend. Local credentials belong
only in ignored files. Future generated issues will remain in the development
database until cleanup commands are added.

## Setup

Python 3.11+ is required.

```bash
cd Automation/issue_scenario_lab
python -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
cp .env.example .env
cp users.example.yaml users.local.yaml
```

Edit `users.local.yaml` to reference existing development users. Never commit
that file. Configure existing `owner`, `expert_a`, and `expert_b` users, and
ensure a compatible numeric expression domain exists. Start the Backend,
DecisionModelsService, and development MongoDB through their normal project
configuration; the checked-in Backend example uses `http://localhost:5000/api`.

## Commands

```bash
python -m issue_scenario_lab health
python -m issue_scenario_lab check-user owner
python -m issue_scenario_lab check-users
python -m issue_scenario_lab list-generated
python -m issue_scenario_lab recover-finished consensus-max-rounds --generation-id GENERATION_ID --issue-id ISSUE_ID
python -m issue_scenario_lab show-config
python -m issue_scenario_lab generate no-consensus-basic
python -m issue_scenario_lab generate no-consensus-criteria-weighting
python -m issue_scenario_lab generate no-consensus-expert-weights
python -m issue_scenario_lab generate consensus-first-round
python -m issue_scenario_lab generate consensus-later-round
python -m issue_scenario_lab generate consensus-max-rounds
python -m issue_scenario_lab generate topsis-2tuple-greece
python -m issue_scenario_lab generate two-tuple-greece-video
python -m issue_scenario_lab delete GENERATION_ID
python -m issue_scenario_lab delete-all
python -m issue_scenario_lab delete-active ISSUE_ID
```

`SCENARIO_LAB_ALLOW_NON_LOCALHOST=true` is required before a non-localhost API
URL can be used. This is an explicit safety override, not a production feature.

All commands are for local/development use only and use real Backend HTTP
routes; Scenario Lab never accesses MongoDB directly. Finished-issue cleanup
processes every visible expert before the owner. Each user first hides the
finished issue, and the manifest entry is removed only after the owner receives
HTTP 404 for the finished detail endpoint, confirming permanent deletion.

`delete` is resumable: aliases that already no longer see an issue are skipped.
If an accepted visible user is absent from the manifest, physical deletion cannot
be confirmed and the manifest is retained. `delete-all` handles manifest entries
sequentially and continues after failures. `delete-active` is only for partial
active generation failures and refuses any issue whose name does not begin with
`[AUTO:`.

`recover-finished` is only for a scenario that already reached Finished but
could not be recorded locally because validation or manifest persistence failed.
It performs Finished list/detail reads, validates the full scenario contract,
and writes the normal minimal manifest entry; it never recomputes or modifies
the Backend issue.

`no-consensus-criteria-weighting` uses TOPSIS with Manual Criteria Weights. It
executes real expert manual weighting through `criteriaWeighting` →
`weightsFinished` → `alternativeEvaluation` → `finished`, requiring the local
Backend, DecisionModelsService, configured confirmed users, and a compatible
numeric expression domain.

`no-consensus-expert-weights` uses WASPAS with creator-defined Quality/Cost
weights of 0.60/0.40, explicit `lambda: 0.5`, and expert weights of 0.75/0.25.
The project aggregates the two expert matrices into a weighted collective matrix
before executing WASPAS. Its numeric values are deliberately strictly positive,
because WASPAS includes a weighted-product component. It requires the normal
local Backend and DecisionModelsService services; it never accesses MongoDB
directly.

`consensus-first-round` uses the current public single-criterion Herrera Viedma
CRP contract: one global `Overall preference` pairwise criterion with its fixed
weight of `1.0`. It uses normal consensus, simulation disabled, reciprocal
pairwise evaluations on an exact continuous `[0, 1]` domain, threshold `0.9`,
and maximum phase index `3`; its deliberately similar expert matrices reach
consensus in phase zero. It requires the normal local Backend and
DecisionModelsService services, and never accesses MongoDB directly.

`consensus-later-round` uses the same single global `Overall preference`
criterion, normal (non-simulated) consensus, and an exact continuous `[0, 1]`
domain. Opposed phase-zero expert matrices produce disagreement and a previous
collective reference for phase one; distinct manually converged phase-one
matrices reach the `0.9` threshold and finish in phase one. Its maximum phase
index is `3`. It requires the normal local Backend and DecisionModelsService,
never accesses MongoDB directly, and is for local development only.

`consensus-max-rounds` uses the same public single-criterion Herrera Viedma
CRP contract on an exact continuous `[0, 1]` domain. It uses normal consensus
with simulation disabled and manually submits two reciprocal expert matrices in
each phase. Its consensus measures increase from `0.50` through `0.65`, `0.73`,
and `0.80`, but remain below its `0.9` threshold. The inclusive maximum phase
index is `3`, so phases `0` through `3` retain their previous-round collective
references; phase three finalizes through `maxPhasesReached` and no phase four
is created. It requires the normal local Backend and DecisionModelsService,
remains compatible with `list-generated` and `delete`, and never accesses
MongoDB directly.

`topsis-2tuple-greece` is a data-driven non-consensus lifecycle scenario using
`data/topsis_2tuple_greece.json`. It requires configured existing local aliases
`owner`, `expert_a`, `expert_b`, `expert_c`, `expert_d`, and `expert_e`, plus a
compatible five-label `linguistic2Tuple` expression domain. All five experts
submit complete `criteriaPreferenceOrder` rankings to the real
`preference_order_criteria_weights` model. The Backend finalizes the collective
weights; only then does `owner` use the same owner participant-edit route as
the Frontend (`PATCH /issues/:id/experts`) to remove experts B–E. `expert_a`
then alone submits the linguistic TOPSIS 2-tuple matrix and the normal issue
lifecycle finishes it.

The fixture now contains real questionnaire criteria and Q9 preference orders
from Questionnaires 1, 2, 4, 5 and 6; Questionnaire 3 is deliberately
excluded because its ranking is invalid. The four candidate-site names are real
Questionnaire 5 locations but are a provisional set. The linguistic
alternative-evaluation matrix, five-label expression-domain choice, and
benefit/cost directions remain documented simulation assumptions until the
authoritative alternative-evaluation spreadsheet is available. That spreadsheet
has a reported C1/C2 mapping swap, which must be normalized explicitly during a
future import; the questionnaire C1/C2 keys are not swapped here.

The synthetic matrix stores human-readable labels (`Very low`, `Low`, `Medium`,
`High`, `Very high`) rather than domain keys. At generation time Scenario Lab
reads the actual alternative-evaluation context and resolves those labels to
the configured domain's persisted `labelKey` values before submission.

## Development checks

```bash
python -m compileall src tests
python -m pytest
python -m ruff check .
```
