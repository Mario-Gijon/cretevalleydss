from __future__ import annotations

from typing import Any

from .aggregation import build_aggregation_facts
from .core import build_core_facts_from_evidence
from .evidence import extract_two_tuple_evidence
from .linguistic import build_linguistic_facts


def analyze_issue(
    context: dict[str, Any],
) -> dict[str, Any]:
    """Build deterministic issue-level Results Analysis for the 2-Tuple model.

    Delivery 1 intentionally exposes facts only. Natural-language
    interpretation, visualizations, evaluator diagnostics, robustness and
    sensitivity are added by later analysis modules without changing this
    evidence contract.
    """

    evidence = extract_two_tuple_evidence(context)
    facts = build_core_facts_from_evidence(evidence)
    facts["linguistic2Tuple"] = build_linguistic_facts(evidence)
    facts["aggregation"] = build_aggregation_facts(evidence)

    return {
        "facts": facts,
        "interpretation": "",
        "visualizations": [],
        "sections": [],
    }


__all__ = ["analyze_issue"]
