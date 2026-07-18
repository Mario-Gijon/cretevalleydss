# CreteValleyDSS Issue Scenario Lab

Issue Scenario Lab is a small Python CLI/library for generating local
CreteValleyDSS issue variants through the real Backend HTTP API. It currently
implements only `no-consensus-basic`.

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
```

`SCENARIO_LAB_ALLOW_NON_LOCALHOST=true` is required before a non-localhost API
URL can be used. This is an explicit safety override, not a production feature.

The generated issue remains in the development database until cleanup commands
are implemented. Find it by its `[AUTO:<id>] No consensus · basic` name. All
operations pass through the real HTTP API; cleanup commands are not implemented
yet.

## Development checks

```bash
python -m compileall src tests
python -m pytest
python -m ruff check .
```

## Next milestone

The next milestone after review is cleanup commands using the existing active
and finished issue deletion routes.
