from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from pydantic import ValidationError

from issue_scenario_lab.errors import ManifestError
from issue_scenario_lab.manifest.models import GeneratedIssue, Manifest


class ManifestStore:
    """Minimal, atomic JSON storage for generated issue identities only."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> Manifest:
        if not self.path.exists():
            return Manifest()
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ManifestError(f"manifest contains invalid JSON: {self.path}") from error
        try:
            return Manifest.model_validate(payload)
        except ValidationError as error:
            raise ManifestError(f"manifest has an invalid structure: {self.path}: {error}") from error

    def _write(self, manifest: Manifest) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        serialized = json.dumps(manifest.model_dump(by_alias=True), indent=2, ensure_ascii=False) + "\n"
        descriptor, temporary_name = tempfile.mkstemp(prefix=f".{self.path.name}.", suffix=".tmp", dir=self.path.parent, text=True)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as temporary_file:
                temporary_file.write(serialized)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_name, self.path)
        except OSError as error:
            raise ManifestError(f"could not write manifest: {self.path}") from error
        finally:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)

    def list_entries(self) -> list[GeneratedIssue]:
        return self.load().generated_issues

    def find(self, generation_id: str) -> GeneratedIssue | None:
        return next((entry for entry in self.list_entries() if entry.generation_id == generation_id), None)

    def add(self, entry: GeneratedIssue) -> None:
        manifest = self.load()
        if any(existing.generation_id == entry.generation_id for existing in manifest.generated_issues):
            raise ManifestError(f"duplicate generationId: {entry.generation_id}")
        manifest.generated_issues.append(entry)
        self._write(manifest)

    def remove(self, generation_id: str) -> GeneratedIssue | None:
        manifest = self.load()
        remaining = [entry for entry in manifest.generated_issues if entry.generation_id != generation_id]
        if len(remaining) == len(manifest.generated_issues):
            return None
        removed = next(entry for entry in manifest.generated_issues if entry.generation_id == generation_id)
        manifest.generated_issues = remaining
        self._write(manifest)
        return removed
