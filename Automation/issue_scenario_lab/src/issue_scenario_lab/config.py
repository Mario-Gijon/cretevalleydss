from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from issue_scenario_lab.errors import ConfigurationError

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


class _UniqueKeyLoader(yaml.SafeLoader):
    """Safe YAML loader that does not silently overwrite duplicate aliases."""


def _construct_unique_mapping(loader: _UniqueKeyLoader, node: yaml.MappingNode, deep: bool = False) -> dict[Any, Any]:
    mapping: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.YAMLError(f"duplicate mapping key: {key}")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


_UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_unique_mapping)


class Settings(BaseSettings):
    """Non-secret local settings for the scenario lab CLI."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", env_prefix="SCENARIO_LAB_", extra="ignore")

    api_base_url: str = "http://localhost:5000/api"
    users_file: Path = Path("users.local.yaml")
    manifest_file: Path = Path(".issue-scenario-lab/manifest.json")
    request_timeout_seconds: float = Field(default=15, gt=0, le=120)
    verify_tls: bool = True
    allow_non_localhost: bool = False

    @field_validator("api_base_url")
    @classmethod
    def validate_api_base_url(cls, value: str) -> str:
        normalized = value.rstrip("/")
        parsed = urlsplit(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("must be an absolute http(s) URL")
        return normalized

    @model_validator(mode="after")
    def enforce_local_api_safety(self) -> Settings:
        hostname = urlsplit(self.api_base_url).hostname
        if hostname not in _LOCAL_HOSTS and not self.allow_non_localhost:
            raise ValueError("refusing non-local API URL; set SCENARIO_LAB_ALLOW_NON_LOCALHOST=true explicitly")
        return self

    def safe_values(self) -> dict[str, str | float | bool]:
        return {
            "API base URL": self.api_base_url,
            "Users file": str(self.users_file),
            "Manifest file": str(self.manifest_file),
            "Request timeout (seconds)": self.request_timeout_seconds,
            "Verify TLS": self.verify_tls,
        }


class UserCredentials(BaseModel):
    """Credentials supplied only by ignored local YAML configuration."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("must look like an email address")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value:
            raise ValueError("must not be empty")
        return value


def load_users(path: Path) -> dict[str, UserCredentials]:
    """Load and validate unique local user aliases without exposing passwords."""

    if not path.exists():
        raise ConfigurationError(f"users file not found: {path}. Copy users.example.yaml to users.local.yaml.")
    try:
        raw = yaml.load(path.read_text(encoding="utf-8"), Loader=_UniqueKeyLoader)
    except yaml.YAMLError as error:
        raise ConfigurationError(f"users file contains invalid YAML: {path}") from error
    if not isinstance(raw, dict) or not raw:
        raise ConfigurationError("users file must contain a non-empty alias mapping")

    users: dict[str, UserCredentials] = {}
    emails: set[str] = set()
    for alias, payload in raw.items():
        if not isinstance(alias, str) or not alias.strip():
            raise ConfigurationError("user aliases must be non-empty strings")
        normalized_alias = alias.strip()
        if normalized_alias in users:
            raise ConfigurationError(f"duplicate user alias: {normalized_alias}")
        if not isinstance(payload, dict):
            raise ConfigurationError(f"user '{normalized_alias}' must be a mapping")
        try:
            credentials = UserCredentials.model_validate(payload)
        except ValueError as error:
            raise ConfigurationError(f"invalid user '{normalized_alias}': {error}") from error
        email_key = credentials.email.casefold()
        if email_key in emails:
            raise ConfigurationError(f"duplicate user email configured for alias '{normalized_alias}'")
        emails.add(email_key)
        users[normalized_alias] = credentials
    return users
