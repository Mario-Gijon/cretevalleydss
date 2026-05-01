from __future__ import annotations

from typing import Any


def build_metrics_payload(
    ranking_analysis: dict[str, Any],
    criteria_analysis: dict[str, Any],
    agreement_analysis: dict[str, Any],
    used_fields: list[str],
    missing_fields: list[str],
) -> dict[str, Any]:
    return {
        "rankingStrength": ranking_analysis.get("rankingStrength") or {},
        "criterionInfluence": criteria_analysis.get("criterionInfluence") or {},
        "agreement": agreement_analysis.get("agreement") or {},
        "dataCompleteness": {
            "usedFieldsCount": len(used_fields),
            "missingFieldsCount": len(missing_fields),
            "usedFields": used_fields,
            "missingFields": missing_fields,
        },
    }
