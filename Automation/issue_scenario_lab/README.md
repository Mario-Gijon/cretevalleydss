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
python -m issue_scenario_lab show-config
python -m issue_scenario_lab generate no-consensus-basic
python -m issue_scenario_lab generate no-consensus-criteria-weighting
python -m issue_scenario_lab generate no-consensus-expert-weights
python -m issue_scenario_lab generate consensus-first-round
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

`consensus-first-round` uses Herrera Viedma CRP with normal consensus,
simulation disabled, creator weights of 0.60/0.40, and reciprocal pairwise
evaluations on an exact continuous `[0, 1]` domain. It uses threshold `0.9` and
maximum phase index `3`; its deliberately similar expert matrices reach
consensus in phase zero. It requires the normal local Backend and
DecisionModelsService services, and never accesses MongoDB directly.

## Development checks

```bash
python -m compileall src tests
python -m pytest
python -m ruff check .
```
