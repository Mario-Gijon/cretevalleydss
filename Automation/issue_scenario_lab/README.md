# CreteValleyDSS Issue Scenario Lab

Issue Scenario Lab is a small Python CLI/library foundation for creating future
CreteValleyDSS issue variants through the real local Backend HTTP API. It is
foundation-only: no issue-generation scenario is implemented yet.

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
that file. Start the Backend with its normal local configuration; its checked-in
example uses `http://localhost:5000/api`.

## Commands

```bash
python -m issue_scenario_lab health
python -m issue_scenario_lab check-user owner
python -m issue_scenario_lab check-users
python -m issue_scenario_lab list-generated
python -m issue_scenario_lab show-config
```

`SCENARIO_LAB_ALLOW_NON_LOCALHOST=true` is required before a non-localhost API
URL can be used. This is an explicit safety override, not a production feature.

## Development checks

```bash
python -m compileall src tests
python -m pytest
python -m ruff check .
```

## Next milestone

The next implementation milestone is `no-consensus-basic`.
