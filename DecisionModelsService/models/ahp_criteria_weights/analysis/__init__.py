"""Issue-level analysis for frozen AHP criterion-weight executions."""

from __future__ import annotations

from typing import Any

from .core import build_core_facts
from .evidence import AnalysisEvidenceUnavailable, extract_ahp_criteria_weights_evidence
from .interpretation import build_interpretation
from .visualizations import build_visualization_sections, build_visualizations


def _unavailable(reason: str) -> dict[str, Any]:
    facts = {
        "status": "unavailable",
        "unavailableReasons": [reason],
        "source": {"nExperts": 0, "nCriteria": 0, "aggregationMethod": None},
        "criteria": {"items": [], "orderedCriterionIds": [], "collectiveLeaders": [], "leastImportant": [], "topThreeShare": None, "widestIndividualSpreadCriterionIds": []},
        "experts": {"items": [], "furthestFromCollectiveExpertKeys": []},
        "finalWeightsByCriterion": None,
        "individualWeightsByExpert": {},
        "mcc": {"available": False, "reason": reason},
        "consistency": {"threshold": 0.10, "experts": []},
    }
    return {
        "facts": facts,
        "interpretation": f"### Criteria weighting analysis\n\n{reason}.",
        "visualizations": [],
        "sections": [],
    }


def analyze_issue(context: dict[str, Any]) -> dict[str, Any]:
    """Analyze only the persisted AHP criteria-weighting execution evidence."""

    try:
        evidence = extract_ahp_criteria_weights_evidence(context)
    except (AnalysisEvidenceUnavailable, KeyError, TypeError, ValueError) as error:
        return _unavailable(str(error))

    facts = build_core_facts(evidence)
    visualizations = build_visualizations(facts)
    return {
        "facts": facts,
        "interpretation": build_interpretation(facts),
        "visualizations": visualizations,
        "sections": build_visualization_sections(facts),
    }


__all__ = ["analyze_issue"]
