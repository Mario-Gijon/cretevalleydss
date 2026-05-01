from __future__ import annotations

from typing import Any

from services.analysis.analyzers.model_notes.borda import build_borda_notes
from services.analysis.analyzers.model_notes.herrera_viedma_crp import (
    build_herrera_viedma_crp_notes,
)


def build_model_interpretation_notes(
    context: dict[str, Any],
    metrics: dict[str, Any],
) -> dict[str, Any]:
    borda_notes = build_borda_notes(context=context, metrics=metrics)
    herrera_notes = build_herrera_viedma_crp_notes(context=context, metrics=metrics)
    return {
        "sections": (borda_notes.get("sections") or []) + (herrera_notes.get("sections") or []),
        "insights": (borda_notes.get("insights") or []) + (herrera_notes.get("insights") or []),
        "warnings": (borda_notes.get("warnings") or []) + (herrera_notes.get("warnings") or []),
    }
