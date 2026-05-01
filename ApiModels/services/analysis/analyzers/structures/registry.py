from __future__ import annotations

from typing import Any

from services.analysis.analyzers.structures.direct import analyze_direct_structure_layer
from services.analysis.analyzers.structures.pairwise_alternatives import (
    analyze_pairwise_structure_layer,
)


def analyze_structure_layer(
    context: dict[str, Any],
    common_results: dict[str, Any],
) -> dict[str, Any]:
    model = context.get("model") or {}
    evaluation_structure = str(model.get("evaluationStructure") or "").strip()

    if evaluation_structure == "direct":
        return analyze_direct_structure_layer(common_results)

    if evaluation_structure == "pairwiseAlternatives":
        return analyze_pairwise_structure_layer(
            context=context,
            common_results=common_results,
        )

    if evaluation_structure:
        return {
            "notes": [],
            "insights": [],
            "warnings": [
                {
                    "code": "UNSUPPORTED_EVALUATION_STRUCTURE_FOR_DETAILED_ANALYSIS",
                    "severity": "medium",
                    "message": f"Evaluation structure '{evaluation_structure}' is not fully supported for detailed diagnostics in MVP.",
                }
            ],
        }

    return {"notes": [], "insights": [], "warnings": []}
