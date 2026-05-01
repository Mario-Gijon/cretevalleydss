from __future__ import annotations

from typing import Any

from services.analysis.analyzers.common import (
    analyze_consensus,
    analyze_criteria,
    analyze_expert_agreement,
    analyze_ranking,
    detect_fuzzy_usage,
)
from services.analysis.analyzers.model_notes import build_model_interpretation_notes
from services.analysis.analyzers.structures import analyze_structure_layer
from services.analysis.insights import build_insights_and_warnings
from services.analysis.metrics import build_metrics_payload
from services.analysis.narrative import build_sections, build_summary


def _merge_unique(items: list[str]) -> list[str]:
    return sorted({item for item in items if isinstance(item, str) and item})


def _split_context_warnings(warnings: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    actionable: list[dict[str, Any]] = []
    informational_notes: list[str] = []
    for warning in warnings:
        if not isinstance(warning, dict):
            continue
        code = str(warning.get("code") or "").upper()
        if code == "NO_SCENARIOS_AVAILABLE":
            informational_notes.append(
                warning.get("message") or "No additional scenario analysis was available for this issue."
            )
            continue
        actionable.append(warning)
    return actionable, informational_notes


def _dedupe_insights(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        key = f"{item.get('code')}::{item.get('message')}"
        if key not in unique:
            unique[key] = item
    return list(unique.values())


def _dedupe_warnings(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        key = f"{item.get('code')}::{item.get('message')}"
        if key not in unique:
            unique[key] = item
    return list(unique.values())


def _dedupe_sections(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or item.get("title") or item.get("text"))
        if key not in unique:
            unique[key] = item
    return list(unique.values())


def analyze_results_context(context: dict[str, Any]) -> dict[str, Any]:
    """Build a deterministic analysis report from a resolved decision context.

    The service combines common ranking/criteria/expert/consensus analyzers,
    structure-specific diagnostics, and optional model interpretation notes.
    It keeps response shape stable for persistence and frontend rendering.
    """
    ranking_analysis = analyze_ranking(context)

    winner = ranking_analysis.get("winner")
    runner_up = ranking_analysis.get("runnerUp")
    confidence = ranking_analysis.get("confidence") or {}

    criteria_analysis = analyze_criteria(context, winner=winner, runner_up=runner_up)
    agreement_analysis = analyze_expert_agreement(context)
    consensus_analysis = analyze_consensus(context)

    common_results = {
        "ranking_analysis": ranking_analysis,
        "criteria_analysis": criteria_analysis,
        "agreement_analysis": agreement_analysis,
        "consensus_analysis": consensus_analysis,
    }
    structure_analysis = analyze_structure_layer(context=context, common_results=common_results)
    fuzzy_analysis = detect_fuzzy_usage(context)

    used_fields = _merge_unique(
        (ranking_analysis.get("used_fields") or [])
        + (criteria_analysis.get("used_fields") or [])
        + (agreement_analysis.get("used_fields") or [])
        + (consensus_analysis.get("used_fields") or [])
    )
    missing_fields = _merge_unique(
        (ranking_analysis.get("missing_fields") or [])
        + (criteria_analysis.get("missing_fields") or [])
        + (agreement_analysis.get("missing_fields") or [])
        + (consensus_analysis.get("missing_fields") or [])
    )

    metrics = build_metrics_payload(
        ranking_analysis=ranking_analysis,
        criteria_analysis=criteria_analysis,
        agreement_analysis=agreement_analysis,
        consensus_analysis=consensus_analysis,
        structure_analysis=structure_analysis,
        used_fields=used_fields,
        missing_fields=missing_fields,
    )

    ranking_strength = ranking_analysis.get("rankingStrength") or {}
    tied_scores = bool(ranking_strength.get("tiedScores"))
    summary = build_summary(
        winner=winner,
        runner_up=runner_up,
        confidence=confidence,
        tied_scores=tied_scores,
    )
    context_warnings = context.get("warnings") or []
    actionable_context_warnings, informational_notes = _split_context_warnings(context_warnings)
    sections = build_sections(
        confidence=confidence,
        metrics=metrics,
        winner=winner,
        runner_up=runner_up,
        tied_scores=tied_scores,
        structure_notes=structure_analysis.get("notes") or [],
        fuzzy_notes=fuzzy_analysis.get("notes") or [],
        informational_notes=informational_notes,
    )

    insight_blocks = build_insights_and_warnings(
        ranking_analysis=ranking_analysis,
        criteria_analysis=criteria_analysis,
        agreement_analysis=agreement_analysis,
        consensus_analysis=consensus_analysis,
    )
    model_notes = build_model_interpretation_notes(context=context, metrics=metrics)

    all_general_sections = _dedupe_sections(sections.get("general") or [])
    all_technical_sections = _dedupe_sections(
        (sections.get("technical") or []) + (model_notes.get("sections") or [])
    )
    all_insights = _dedupe_insights(
        (insight_blocks.get("insights") or [])
        + (structure_analysis.get("insights") or [])
        + (model_notes.get("insights") or [])
    )
    all_warnings = _dedupe_warnings(
        actionable_context_warnings
        + (insight_blocks.get("warnings") or [])
        + (structure_analysis.get("warnings") or [])
        + (model_notes.get("warnings") or [])
    )

    return {
        "summary": summary,
        "confidence": {
            "level": confidence.get("level", "unknown"),
            "scoreGap": confidence.get("scoreGap"),
            "isCloseDecision": bool(confidence.get("isCloseDecision", False)),
            "reason": confidence.get("reason"),
        },
        "sections": {
            "general": all_general_sections,
            "technical": all_technical_sections,
        },
        "insights": all_insights,
        "warnings": all_warnings,
        "metrics": metrics,
        "evidence": {
            "usedFields": used_fields,
            "missingFields": missing_fields,
        },
    }
