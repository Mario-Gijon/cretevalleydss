from __future__ import annotations

from typing import Any


EPSILON = 1e-6


def _to_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _extract_consensus_value(payload: Any) -> float | None:
    if isinstance(payload, dict):
        for key in (
            "cm",
            "consensusMeasure",
            "consensusLevel",
            "consensus",
            "level",
            "value",
        ):
            number = _to_number(payload.get(key))
            if number is not None:
                return number

        details = payload.get("details")
        if isinstance(details, dict):
            number = _to_number(details.get("cm"))
            if number is not None:
                return number

        model_execution = payload.get("modelExecution")
        if isinstance(model_execution, dict):
            raw_output = model_execution.get("rawOutput")
            if isinstance(raw_output, dict):
                number = _to_number(raw_output.get("cm"))
                if number is not None:
                    return number

        raw_output = payload.get("rawOutput")
        if isinstance(raw_output, dict):
            number = _to_number(raw_output.get("cm"))
            if number is not None:
                return number

    return _to_number(payload)


def _extract_phase(payload: Any) -> int | None:
    if not isinstance(payload, dict):
        return None
    phase = payload.get("phase")
    if isinstance(phase, int) and phase > 0:
        return phase
    return None


def _extract_threshold(context: dict[str, Any]) -> float | None:
    consensus = context.get("consensus") or {}
    issue = context.get("issue") or {}
    model = context.get("model") or {}
    model_parameters = model.get("modelParameters") if isinstance(model, dict) else {}

    threshold_candidates = [
        consensus.get("threshold") if isinstance(consensus, dict) else None,
        issue.get("consensusThreshold") if isinstance(issue, dict) else None,
        model_parameters.get("consensusThreshold")
        if isinstance(model_parameters, dict)
        else None,
    ]
    for candidate in threshold_candidates:
        threshold = _to_number(candidate)
        if threshold is not None:
            return threshold
    return None


def _extract_max_phases(context: dict[str, Any]) -> int | None:
    consensus = context.get("consensus") or {}
    issue = context.get("issue") or {}

    max_phases_candidates = [
        consensus.get("maxPhases") if isinstance(consensus, dict) else None,
        issue.get("consensusMaxPhases") if isinstance(issue, dict) else None,
    ]
    for candidate in max_phases_candidates:
        if isinstance(candidate, int) and candidate > 0:
            return candidate
    return None


def _is_consensus_relevant(context: dict[str, Any]) -> bool:
    issue = context.get("issue") or {}
    model = context.get("model") or {}
    lifecycle_kind = str(model.get("lifecycleKind") or "").strip().lower()
    output_kind = str(model.get("outputKind") or "").strip().lower()

    return bool(
        issue.get("isConsensus") is True
        or lifecycle_kind == "thresholdconsensus"
        or output_kind == "consensusranking"
    )


def _build_series_from_entries(
    entries: list[Any],
    source: str,
) -> list[dict[str, Any]]:
    series: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        consensus_level = _extract_consensus_value(entry)
        if consensus_level is None:
            continue
        item: dict[str, Any] = {
            "phase": _extract_phase(entry),
            "consensusLevel": consensus_level,
            "source": source,
        }
        ranked_alternatives = entry.get("rankedAlternatives")
        if isinstance(ranked_alternatives, list):
            item["rankedAlternatives"] = ranked_alternatives
        ranked_with_scores = entry.get("rankedWithScores")
        if isinstance(ranked_with_scores, list):
            item["rankedWithScores"] = ranked_with_scores
        series.append(item)
    return series


def _extract_consensus_series(context: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    """Extract an ordered numeric consensus series from available context sources."""
    used_fields: list[str] = []
    missing_fields: list[str] = []

    consensus = context.get("consensus") or {}
    series: list[dict[str, Any]] = []

    history = consensus.get("history") if isinstance(consensus, dict) else None
    docs = consensus.get("docs") if isinstance(consensus, dict) else None
    latest = consensus.get("latest") if isinstance(consensus, dict) else None
    final_level = consensus.get("finalLevel") if isinstance(consensus, dict) else None

    if isinstance(history, list) and history:
        series.extend(_build_series_from_entries(history, "consensus.history"))
        if series:
            used_fields.append("consensus.history")

    if not series and isinstance(docs, list) and docs:
        series.extend(_build_series_from_entries(docs, "consensus.docs"))
        if series:
            used_fields.append("consensus.docs")

    if not series and isinstance(latest, dict):
        latest_value = _extract_consensus_value(latest)
        if latest_value is not None:
            series.append(
                {
                    "phase": _extract_phase(latest),
                    "consensusLevel": latest_value,
                    "source": "consensus.latest",
                }
            )
            used_fields.append("consensus.latest")

    if not series:
        final_value = _to_number(final_level)
        if final_value is not None:
            series.append(
                {
                    "phase": None,
                    "consensusLevel": final_value,
                    "source": "consensus.finalLevel",
                }
            )
            used_fields.append("consensus.finalLevel")

    if not series:
        missing_fields.append("consensus.history|consensus.docs|consensus.latest|consensus.finalLevel")

    series.sort(
        key=lambda item: (
            item.get("phase") is None,
            item.get("phase") if isinstance(item.get("phase"), int) else 10**9,
        )
    )

    return series, used_fields, missing_fields


def analyze_consensus(context: dict[str, Any]) -> dict[str, Any]:
    """Compute consensus trend diagnostics for consensus-oriented models.

    The analyzer is resilient to partial context and degrades gracefully when
    rounds or consensus values are missing.
    """
    used_fields: list[str] = []
    missing_fields: list[str] = []

    if not _is_consensus_relevant(context):
        return {
            "consensusDiagnostics": {
                "available": False,
                "relevant": False,
                "reason": "not_consensus_model",
            },
            "used_fields": used_fields,
            "missing_fields": missing_fields,
        }

    used_fields.append("issue.isConsensus|model.lifecycleKind|model.outputKind")
    series, series_used_fields, series_missing_fields = _extract_consensus_series(context)
    used_fields.extend(series_used_fields)
    missing_fields.extend(series_missing_fields)

    threshold = _extract_threshold(context)
    max_phases = _extract_max_phases(context)
    if threshold is not None:
        used_fields.append("consensus.threshold|issue.consensusThreshold|model.modelParameters.consensusThreshold")
    if max_phases is not None:
        used_fields.append("consensus.maxPhases|issue.consensusMaxPhases")

    numeric_levels = [
        item.get("consensusLevel")
        for item in series
        if isinstance(item.get("consensusLevel"), (int, float))
        and not isinstance(item.get("consensusLevel"), bool)
    ]

    if not numeric_levels:
        return {
            "consensusDiagnostics": {
                "available": False,
                "relevant": True,
                "reason": "missing_consensus_series",
                "rounds": 0,
                "initialConsensus": None,
                "finalConsensus": None,
                "threshold": threshold,
                "maxPhases": max_phases,
                "thresholdReached": None,
                "trend": "unknown",
                "delta": None,
                "series": [],
            },
            "used_fields": sorted(set(used_fields)),
            "missing_fields": sorted(set(missing_fields)),
        }

    rounds = len(numeric_levels)
    initial_consensus = float(numeric_levels[0])
    final_consensus = float(numeric_levels[-1])
    delta = final_consensus - initial_consensus if rounds >= 2 else None

    if rounds == 1:
        trend = "single_round"
    elif delta is None:
        trend = "unknown"
    elif delta > EPSILON:
        trend = "improved"
    elif delta < -EPSILON:
        trend = "worsened"
    else:
        trend = "stable"

    threshold_reached: bool | None = None
    if threshold is not None:
        threshold_reached = final_consensus >= threshold

    return {
        "consensusDiagnostics": {
            "available": True,
            "relevant": True,
            "rounds": rounds,
            "initialConsensus": initial_consensus,
            "finalConsensus": final_consensus,
            "threshold": threshold,
            "maxPhases": max_phases,
            "thresholdReached": threshold_reached,
            "trend": trend,
            "delta": delta,
            "series": series,
        },
        "used_fields": sorted(set(used_fields)),
        "missing_fields": sorted(set(missing_fields)),
    }
