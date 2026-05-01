from __future__ import annotations

from typing import Any


def _is_borda_model(model: dict[str, Any]) -> bool:
    candidates = [
        model.get("apiModelKey"),
        model.get("modelFamilyKey"),
        model.get("versionLabel"),
    ]
    normalized = [str(value or "").strip().lower() for value in candidates]
    return any("borda" in value for value in normalized if value)


def build_borda_notes(context: dict[str, Any], metrics: dict[str, Any]) -> dict[str, Any]:
    model = context.get("model") or {}
    if not _is_borda_model(model):
        return {"sections": [], "insights": [], "warnings": []}

    ranking_strength = metrics.get("rankingStrength") or {}
    tied_scores = bool(ranking_strength.get("tiedScores"))
    normalized_gap = ranking_strength.get("normalizedScoreGap")
    near_tie = (
        isinstance(normalized_gap, (int, float))
        and not isinstance(normalized_gap, bool)
        and float(normalized_gap) <= 0.05
    )
    close_result = tied_scores or near_tie

    winner = ranking_strength.get("winner")
    runner_up = ranking_strength.get("runnerUp")
    criterion_influence = metrics.get("criterionInfluence") or {}
    winner_strengths = criterion_influence.get("winnerStrengthCriteria") or []

    winner_lead_criterion = None
    runner_up_lead_criterion = None
    for item in winner_strengths:
        if not isinstance(item, dict):
            continue
        criterion = item.get("criterion")
        advantage = item.get("advantage")
        if not isinstance(criterion, str) or not criterion.strip():
            continue
        if isinstance(advantage, (int, float)) and not isinstance(advantage, bool):
            if advantage > 0 and winner_lead_criterion is None:
                winner_lead_criterion = criterion
            if advantage < 0 and runner_up_lead_criterion is None:
                runner_up_lead_criterion = criterion

    base_text = (
        "Borda is an ordinal, rank-based method: it rewards relative position under each criterion more than the "
        "magnitude of raw numeric differences."
    )

    if close_result:
        if (
            winner
            and runner_up
            and winner_lead_criterion
            and runner_up_lead_criterion
        ):
            base_text += (
                f" This tie or near-tie is consistent with that behavior: {winner} performs better on "
                f"{winner_lead_criterion}, while {runner_up} performs better on {runner_up_lead_criterion}, "
                "so both alternatives can end up with very similar Borda scores."
            )
        else:
            base_text += (
                " Because Borda is rank-based, it may produce a tie or near-tie when different alternatives rank "
                "better under different criteria. The method focuses on relative positions, not only on the size "
                "of numerical differences."
            )
    else:
        base_text += (
            " Large raw differences may help interpretation, but they do not automatically imply larger Borda point gaps."
        )

    sections = [
        {
            "key": "borda_method_note",
            "title": "Borda interpretation note",
            "text": base_text,
            "tables": [],
        }
    ]

    return {"sections": sections, "insights": [], "warnings": []}
