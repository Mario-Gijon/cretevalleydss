from __future__ import annotations

from pathlib import Path

import httpx
import pytest
import respx

from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.config import Settings, load_users
from issue_scenario_lab.errors import ConfigurationError, UnknownUserAliasError

API = "http://localhost:5000/api"


def write_users(path: Path) -> None:
    path.write_text(
        "owner:\n  email: owner@example.test\n  password: owner-password\nexpert_a:\n  email: expert@example.test\n  password: expert-password\n",
        encoding="utf-8",
    )


def test_users_load_and_reject_unknown_alias(tmp_path: Path) -> None:
    users_path = tmp_path / "users.local.yaml"
    write_users(users_path)
    pool = SessionPool(Settings(api_base_url=API, users_file=users_path), load_users(users_path))
    assert pool.aliases == ("owner", "expert_a")
    with pytest.raises(UnknownUserAliasError, match="unknown user alias: absent"):
        pool.client_for("absent")
    pool.close()


@respx.mock
def test_login_all_uses_independent_clients_and_closes_them(tmp_path: Path) -> None:
    users_path = tmp_path / "users.local.yaml"
    write_users(users_path)
    login_route = respx.post(f"{API}/auth/login").mock(
        side_effect=[
            httpx.Response(200, json={"success": True, "message": "ok", "data": {"token": "owner-token"}}),
            httpx.Response(200, json={"success": True, "message": "ok", "data": {"token": "expert-token"}}),
        ]
    )
    pool = SessionPool.from_settings(Settings(api_base_url=API, users_file=users_path))
    clients = [pool.client_for(alias) for alias in pool.aliases]
    assert pool.login_all()["owner"]["token"] == "owner-token"
    assert clients[0] is not clients[1]
    pool.close()
    assert all(client._client.is_closed for client in clients)
    assert login_route.call_count == 2


def test_configuration_rejects_non_localhost_without_override() -> None:
    with pytest.raises(ValueError, match="refusing non-local API URL"):
        Settings(api_base_url="https://example.test/api")
    settings = Settings(api_base_url="https://example.test/api", allow_non_localhost=True)
    assert settings.api_base_url == "https://example.test/api"
    assert "password" not in " ".join(settings.safe_values()).lower()


def test_users_reject_duplicate_aliases_and_emails(tmp_path: Path) -> None:
    duplicate_aliases = tmp_path / "duplicate-aliases.yaml"
    duplicate_aliases.write_text(
        "owner:\n  email: one@example.test\n  password: one\nowner:\n  email: two@example.test\n  password: two\n",
        encoding="utf-8",
    )
    with pytest.raises(ConfigurationError, match="invalid YAML"):
        load_users(duplicate_aliases)
    duplicate_emails = tmp_path / "duplicate-emails.yaml"
    duplicate_emails.write_text(
        "owner:\n  email: same@example.test\n  password: one\nexpert:\n  email: same@example.test\n  password: two\n",
        encoding="utf-8",
    )
    with pytest.raises(ConfigurationError, match="duplicate user email"):
        load_users(duplicate_emails)
