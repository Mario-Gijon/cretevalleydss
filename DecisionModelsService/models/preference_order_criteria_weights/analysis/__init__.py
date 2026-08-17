from __future__ import annotations

from typing import Any

from .core import build_core_facts_from_evidence
from .evidence import extract_preference_order_evidence
from .interpretation import build_interpretation
from .visualizations import (
    build_visualization_sections,
    build_visualizations,
)


def analyze_issue(context: dict[str, Any]) -> dict[str, Any]:
    """Build deterministic issue-level analysis for preference-order weights."""
    evidence = extract_preference_order_evidence(context)
    facts = build_core_facts_from_evidence(evidence)

    return {
        "facts": facts,
        "interpretation": build_interpretation(facts),
        "visualizations": build_visualizations(facts),
        "sections": build_visualization_sections(facts),
    }


__all__ = ["analyze_issue"]