from __future__ import annotations

from typing import Any


def _is_herrera_viedma_crp_model(model: dict[str, Any]) -> bool:
    candidates = [
        model.get("apiModelKey"),
        model.get("modelFamilyKey"),
        model.get("versionLabel"),
        model.get("displayName"),
        model.get("name"),
    ]
    normalized = [str(value or "").strip().lower() for value in candidates]
    joined = " ".join(value for value in normalized if value)

    if "herrera_viedma_crp" in joined:
        return True

    has_herrera = "herrera" in joined
    has_viedma = "viedma" in joined
    has_crp = "crp" in joined
    return has_herrera and (has_viedma or has_crp)


def build_herrera_viedma_crp_notes(
    context: dict[str, Any],
    metrics: dict[str, Any],
) -> dict[str, Any]:
    model = context.get("model") or {}
    if not _is_herrera_viedma_crp_model(model):
        return {"sections": [], "insights": [], "warnings": []}

    text = (
        "Herrera Viedma CRP is designed for consensus-based decision processes. "
        "The final ranking should therefore be interpreted together with expert alignment "
        "and the evolution of consensus across rounds."
    )

    expert_diagnostics = metrics.get("expertDiagnostics") or {}
    consensus_diagnostics = metrics.get("consensusDiagnostics") or {}
    if expert_diagnostics.get("available") or consensus_diagnostics.get("available"):
        text += (
            " This is why the expert alignment and consensus evolution sections are especially "
            "relevant for this result."
        )

    sections = [
        {
            "key": "herrera_viedma_crp_method_note",
            "title": "Herrera Viedma CRP interpretation note",
            "text": text,
            "tables": [],
        }
    ]

    return {"sections": sections, "insights": [], "warnings": []}

