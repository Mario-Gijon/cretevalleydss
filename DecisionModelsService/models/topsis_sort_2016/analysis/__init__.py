"""Issue-level Model Analysis for TOPSIS-Sort (Sabokbar et al., 2016)."""

from __future__ import annotations

from typing import Any

from .core import build_core_facts
from .evidence import (
    AnalysisEvidenceUnavailable,
    InvalidOriginalExecution,
    extract_topsis_sort_2016_evidence,
)
from .interpretation import build_interpretation
from .sensitivity import build_sensitivity_facts
from .visualizations import build_visualization_sections, build_visualizations


def _unavailable_analysis(
    *,
    status: str,
    reason: str,
) -> dict[str, Any]:
    facts = {
        "status": status,
        "unavailableReason": reason if status == "unavailable" else None,
        "invalidReason": reason if status == "invalid_execution" else None,
        "sensitivity": {"availability": {"available": False, "reason": reason}, "items": []},
    }
    return {
        "facts": facts,
        "interpretation": build_interpretation(facts),
        "visualizations": [],
        "sections": [],
    }


def analyze_issue(context: dict[str, Any]) -> dict[str, Any]:
    """Analyze the latest executed phase using only validated frozen evidence."""
    try:
        evidence = extract_topsis_sort_2016_evidence(context)
    except AnalysisEvidenceUnavailable as error:
        return _unavailable_analysis(status="unavailable", reason=str(error))
    except InvalidOriginalExecution as error:
        return _unavailable_analysis(status="invalid_execution", reason=str(error))

    facts = build_core_facts(evidence)
    facts["sensitivity"] = build_sensitivity_facts(evidence, facts)
    return {
        "facts": facts,
        "interpretation": build_interpretation(facts),
        "visualizations": build_visualizations(facts),
        "sections": build_visualization_sections(facts),
    }


__all__ = ["analyze_issue"]
