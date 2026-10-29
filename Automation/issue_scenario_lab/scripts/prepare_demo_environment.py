"""Create a private local-only Compose environment for AHPSort I demos."""

from __future__ import annotations

import os
import secrets
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
ENV_PATH = ROOT / ".env.demo"
REQUIRED_KEYS = {
    "DEMO_JWT_SECRET",
    "DEMO_JWT_REFRESH",
    "DEMO_CREATOR_EMAIL",
    "DEMO_CREATOR_PASSWORD",
    "DEMO_EXPERT_A_EMAIL",
    "DEMO_EXPERT_A_PASSWORD",
    "DEMO_EXPERT_B_EMAIL",
    "DEMO_EXPERT_B_PASSWORD",
    "DEMO_EXPERT_C_EMAIL",
    "DEMO_EXPERT_C_PASSWORD",
}

DEMO_USER_EMAILS = {
    "DEMO_CREATOR_EMAIL": "demo.creator@example.test",
    "DEMO_EXPERT_A_EMAIL": "demo.expert.a@example.test",
    "DEMO_EXPERT_B_EMAIL": "demo.expert.b@example.test",
    "DEMO_EXPERT_C_EMAIL": "demo.expert.c@example.test",
}


def parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator:
            raise SystemExit("The existing .env.demo file has an invalid line; it was left unchanged.")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main() -> None:
    if ENV_PATH.exists():
        values = parse_env(ENV_PATH)
        missing = REQUIRED_KEYS - values.keys()
        if missing:
            raise SystemExit(
                "The existing .env.demo is incomplete; it was left unchanged. "
                f"Missing keys: {', '.join(sorted(missing))}"
            )
        os.chmod(ENV_PATH, 0o600)
        print("Existing .env.demo retained and restricted to the current user.")
        return

    values = {
        "DEMO_JWT_SECRET": secrets.token_urlsafe(48),
        "DEMO_JWT_REFRESH": secrets.token_urlsafe(48),
        **DEMO_USER_EMAILS,
        **{
            key.replace("_EMAIL", "_PASSWORD"): secrets.token_urlsafe(24)
            for key in DEMO_USER_EMAILS
        },
    }
    content = "# Local demo-only values. This file is ignored by Git.\n" + "\n".join(
        f"{key}={value}" for key, value in values.items()
    ) + "\n"
    file_descriptor = os.open(ENV_PATH, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(file_descriptor, "w", encoding="utf-8") as handle:
        handle.write(content)
    print("Created ignored .env.demo with random local JWT secrets and synthetic demo-only users.")
    for key in sorted(DEMO_USER_EMAILS):
        print(f"{key.removesuffix('_EMAIL').replace('DEMO_', '').lower()}: {values[key]}")


if __name__ == "__main__":
    main()
