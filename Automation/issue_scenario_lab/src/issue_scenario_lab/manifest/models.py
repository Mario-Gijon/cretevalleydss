from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GeneratedIssue(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    generation_id: str = Field(alias="generationId", min_length=1)
    scenario_id: str = Field(alias="scenarioId", min_length=1)
    issue_id: str = Field(alias="issueId", min_length=1)
    issue_name: str = Field(alias="issueName", min_length=1)
    owner_alias: str = Field(alias="ownerAlias", min_length=1)
    visible_user_aliases: list[str] = Field(alias="visibleUserAliases", min_length=1)

    @field_validator("visible_user_aliases")
    @classmethod
    def validate_visible_aliases(cls, value: list[str]) -> list[str]:
        if any(not alias.strip() for alias in value) or len(set(value)) != len(value):
            raise ValueError("must contain unique non-empty aliases")
        return value


class Manifest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    generated_issues: list[GeneratedIssue] = Field(default_factory=list, alias="generatedIssues")
