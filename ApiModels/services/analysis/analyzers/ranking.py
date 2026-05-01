from __future__ import annotations

from typing import Any


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _to_float(value: Any) -> float | None:
    if _is_number(value):
        return float(value)
    return None


def _alternatives(context: dict[str, Any]) -> list[str]:
    alternatives = context.get("problem", {}).get("alternatives") or []
    result: list[str] = []
    for item in alternatives:
        name = item.get("name") if isinstance(item, dict) else None
        if isinstance(name, str) and name.strip():
            result.append(name)
    return result


def _ranking_from_result(result: dict[str, Any]) -> list[str]:
    ranked_with_scores = result.get("rankedWithScores") or []
    if isinstance(ranked_with_scores, list) and ranked_with_scores:
        names = [entry.get("name") for entry in ranked_with_scores if isinstance(entry, dict)]
        names = [name for name in names if isinstance(name, str) and name.strip()]
        if names:
            return names

    ranking = result.get("ranking") or []
    if isinstance(ranking, list) and ranking:
        names = [item for item in ranking if isinstance(item, str) and item.strip()]
        if names:
            return names

    return []


def _scores_from_result(result: dict[str, Any], alternatives: list[str]) -> dict[str, float]:
    ranked_with_scores = result.get("rankedWithScores") or []
    scores_from_ranked: dict[str, float] = {}
    if isinstance(ranked_with_scores, list):
        for entry in ranked_with_scores:
            if not isinstance(entry, dict):
                continue
            name = entry.get("name")
            score = _to_float(entry.get("score"))
            if isinstance(name, str) and name.strip() and score is not None:
                scores_from_ranked[name] = score
    if scores_from_ranked:
        return scores_from_ranked

    scores_by_alternative = result.get("scoresByAlternative") or {}
    if isinstance(scores_by_alternative, dict) and scores_by_alternative:
        normalized: dict[str, float] = {}
        for name, score in scores_by_alternative.items():
            score_number = _to_float(score)
            if isinstance(name, str) and name.strip() and score_number is not None:
                normalized[name] = score_number
        if normalized:
            return normalized

    raw_output = result.get("rawOutput") or {}
    collective_scores = raw_output.get("collective_scores")
    if isinstance(collective_scores, list) and alternatives and len(collective_scores) == len(alternatives):
        mapped: dict[str, float] = {}
        for index, score in enumerate(collective_scores):
            score_number = _to_float(score)
            if score_number is None:
                continue
            mapped[alternatives[index]] = score_number
        if mapped:
            return mapped

    return {}


def _ranking_from_raw_output(result: dict[str, Any], alternatives: list[str]) -> list[str]:
    raw_output = result.get("rawOutput") or {}
    ranking_indexes = raw_output.get("collective_ranking")
    if not isinstance(ranking_indexes, list) or not alternatives:
        return []

    ranking: list[str] = []
    for index in ranking_indexes:
        if isinstance(index, int) and 0 <= index < len(alternatives):
            ranking.append(alternatives[index])
    return ranking


def analyze_ranking(context: dict[str, Any]) -> dict[str, Any]:
    used_fields: list[str] = []
    missing_fields: list[str] = []

    result = context.get("result") or {}
    alternatives = _alternatives(context)
    if alternatives:
        used_fields.append("problem.alternatives")
    else:
        missing_fields.append("problem.alternatives")

    ranking = _ranking_from_result(result)
    if ranking:
        used_fields.append("result.rankedWithScores|result.ranking")
    else:
        ranking = _ranking_from_raw_output(result, alternatives)
        if ranking:
            used_fields.append("result.rawOutput.collective_ranking")

    scores_by_alternative = _scores_from_result(result, alternatives)
    if scores_by_alternative:
        used_fields.append("result.rankedWithScores|result.scoresByAlternative|result.rawOutput.collective_scores")
    else:
        missing_fields.append("result.scores")

    if not ranking:
        missing_fields.append("result.ranking")

    winner = ranking[0] if ranking else None
    runner_up = ranking[1] if len(ranking) > 1 else None

    winner_score = scores_by_alternative.get(winner) if winner else None
    runner_up_score = scores_by_alternative.get(runner_up) if runner_up else None

    score_gap: float | None = None
    normalized_gap: float | None = None
    close_decision = False
    tied_scores = False
    confidence_level = "unknown"
    confidence_reason = "Insufficient ranking data"

    if winner and runner_up and winner_score is not None and runner_up_score is not None:
        score_gap = winner_score - runner_up_score
        if score_gap < 0:
            score_gap = abs(score_gap)
        tied_scores = score_gap <= 1e-12

        score_values = list(scores_by_alternative.values())
        score_range = max(score_values) - min(score_values) if len(score_values) >= 2 else 0.0
        denominator = score_range if score_range > 0 else max(abs(winner_score), 1.0)
        normalized_gap = score_gap / denominator if denominator else None

        if tied_scores:
            confidence_level = "low"
            close_decision = True
            confidence_reason = "The top alternatives are tied in score."
        elif normalized_gap is not None and normalized_gap >= 0.15:
            confidence_level = "high"
            confidence_reason = "The leading alternative has a clear score advantage over the runner-up."
        elif normalized_gap is not None and normalized_gap >= 0.05:
            confidence_level = "medium"
            confidence_reason = "The leading alternative has a moderate score advantage."
        else:
            confidence_level = "low"
            close_decision = True
            confidence_reason = "The top alternatives are close in score."

    ranking_strength = {
        "winner": winner,
        "runnerUp": runner_up,
        "scoreGap": score_gap,
        "normalizedScoreGap": normalized_gap,
        "tiedScores": tied_scores,
        "ranking": ranking,
        "scoresByAlternative": scores_by_alternative,
    }

    return {
        "ranking": ranking,
        "scoresByAlternative": scores_by_alternative,
        "rankingStrength": ranking_strength,
        "winner": winner,
        "runnerUp": runner_up,
        "confidence": {
            "level": confidence_level,
            "scoreGap": score_gap,
            "isCloseDecision": close_decision,
            "reason": confidence_reason,
        },
        "used_fields": used_fields,
        "missing_fields": missing_fields,
    }
