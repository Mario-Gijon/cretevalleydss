from __future__ import annotations

from typing import Any

from services.analysis.analyzers import (
    analyze_criteria,
    analyze_direct_structure,
    analyze_expert_agreement,
    analyze_pairwise_structure,
    analyze_ranking,
    detect_fuzzy_usage,
)
from services.analysis.insights import build_insights_and_warnings
from services.analysis.metrics import build_metrics_payload
from services.analysis.narrative import build_sections, build_summary


def _merge_unique(items: list[str]) -> list[str]:
    return sorted({item for item in items if isinstance(item, str) and item})


def analyze_results_context(context: dict[str, Any]) -> dict[str, Any]:
    ranking_analysis = analyze_ranking(context)

    winner = ranking_analysis.get("winner")
    runner_up = ranking_analysis.get("runnerUp")
    confidence = ranking_analysis.get("confidence") or {}

    criteria_analysis = analyze_criteria(context, winner=winner, runner_up=runner_up)
    agreement_analysis = analyze_expert_agreement(context)

    model = context.get("model") or {}
    evaluation_structure = model.get("evaluationStructure")

    structure_notes: list[str] = []
    if evaluation_structure == "direct":
        structure_notes.extend(analyze_direct_structure().get("notes") or [])
    elif evaluation_structure == "pairwiseAlternatives":
        structure_notes.extend(analyze_pairwise_structure().get("notes") or [])

    fuzzy_analysis = detect_fuzzy_usage(context)

    used_fields = _merge_unique(
        (ranking_analysis.get("used_fields") or [])
        + (criteria_analysis.get("used_fields") or [])
        + (agreement_analysis.get("used_fields") or [])
    )
    missing_fields = _merge_unique(
        (ranking_analysis.get("missing_fields") or [])
        + (criteria_analysis.get("missing_fields") or [])
        + (agreement_analysis.get("missing_fields") or [])
    )

    metrics = build_metrics_payload(
        ranking_analysis=ranking_analysis,
        criteria_analysis=criteria_analysis,
        agreement_analysis=agreement_analysis,
        used_fields=used_fields,
        missing_fields=missing_fields,
    )

    summary = build_summary(winner=winner, runner_up=runner_up, confidence=confidence)
    sections = build_sections(
        summary=summary,
        confidence=confidence,
        metrics=metrics,
        structure_notes=structure_notes,
        fuzzy_notes=fuzzy_analysis.get("notes") or [],
    )

    insight_blocks = build_insights_and_warnings(
        ranking_analysis=ranking_analysis,
        criteria_analysis=criteria_analysis,
        agreement_analysis=agreement_analysis,
        evaluation_structure=evaluation_structure,
    )

    return {
        "summary": summary,
        "confidence": {
            "level": confidence.get("level", "unknown"),
            "scoreGap": confidence.get("scoreGap"),
            "isCloseDecision": bool(confidence.get("isCloseDecision", False)),
            "reason": confidence.get("reason"),
        },
        "sections": sections,
        "insights": insight_blocks.get("insights") or [],
        "warnings": (context.get("warnings") or []) + (insight_blocks.get("warnings") or []),
        "metrics": metrics,
        "evidence": {
            "usedFields": used_fields,
            "missingFields": missing_fields,
        },
    }
