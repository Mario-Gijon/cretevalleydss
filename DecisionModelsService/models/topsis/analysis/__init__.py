from __future__ import annotations

from typing import Any

from .core import build_core_facts
from .interpretation import build_interpretation
from .visualizations import build_visualization_sections, build_visualizations


def analyze_issue(context: dict[str, Any]) -> dict[str, Any]:
    """Build deterministic issue-level Results Analysis for numerical TOPSIS."""
    facts = build_core_facts(context)
    visualizations = build_visualizations(facts)
    return {
        "facts": facts,
        "interpretation": build_interpretation(facts),
        "visualizations": visualizations,
        "sections": build_visualization_sections(facts),
    }


__all__ = ["analyze_issue"]
