from __future__ import annotations

from issue_scenario_lab.api.client import ApiClient
from issue_scenario_lab.config import Settings, UserCredentials, load_users
from issue_scenario_lab.errors import UnknownUserAliasError


class SessionPool:
    """Owns isolated HTTP clients for configured aliases and closes them together."""

    def __init__(self, settings: Settings, users: dict[str, UserCredentials]) -> None:
        self.settings = settings
        self.users = users
        self._clients: dict[str, ApiClient] = {}

    @classmethod
    def from_settings(cls, settings: Settings) -> SessionPool:
        return cls(settings, load_users(settings.users_file))

    def __enter__(self) -> SessionPool:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    @property
    def aliases(self) -> tuple[str, ...]:
        return tuple(self.users)

    def client_for(self, alias: str) -> ApiClient:
        if alias not in self.users:
            raise UnknownUserAliasError(f"unknown user alias: {alias}")
        if alias not in self._clients:
            self._clients[alias] = ApiClient(self.settings)
        return self._clients[alias]

    def login(self, alias: str) -> dict[str, object]:
        credentials = self.users.get(alias)
        if credentials is None:
            raise UnknownUserAliasError(f"unknown user alias: {alias}")
        return self.client_for(alias).login(credentials.email, credentials.password)

    def login_all(self) -> dict[str, dict[str, object]]:
        return {alias: self.login(alias) for alias in self.aliases}

    def close(self) -> None:
        for client in self._clients.values():
            client.close()
        self._clients.clear()
