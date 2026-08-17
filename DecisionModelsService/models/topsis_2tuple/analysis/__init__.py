from __future__ import annotations

from typing import Any

from .core import build_core_facts_from_evidence
from .evidence import extract_topsis_evidence
from .experts import build_evaluator_facts
from .interpretation import build_interpretation
from .linguistic import build_linguistic_facts
from .robustness import build_robustness_facts
from .sensitivity import build_sensitivity_facts
from .visualizations import build_visualization_sections, build_visualizations


def analyze_issue(context: dict[str, Any]) -> dict[str, Any]:
    """Build deterministic issue-level Results Analysis for 2-Tuple TOPSIS."""
    evidence = extract_topsis_evidence(context)
    facts = build_core_facts_from_evidence(evidence)
    facts["linguistic2Tuple"] = build_linguistic_facts(evidence)
    facts["evaluators"] = build_evaluator_facts(evidence, context)
    facts["robustness"] = build_robustness_facts(evidence, context)
    facts["sensitivity"] = build_sensitivity_facts(evidence, context)
    return {
        "facts": facts,
        "interpretation": build_interpretation(facts),
        "visualizations": build_visualizations(facts),
        "sections": build_visualization_sections(facts),
    }


__all__ = ["analyze_issue"]
