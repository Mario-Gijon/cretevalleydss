from __future__ import annotations

import math
from typing import Any


SCORE_VALIDATION_TOLERANCE = 1e-9


def _object(value: Any, field: str) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field} must be an object")
    return value


def _list(value: Any, field: str, *, non_empty: bool = False) -> list[Any] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")
    if non_empty and not value:
        raise ValueError(f"{field} must not be empty")
    return value


def _string(value: Any, field: str, fallback: str | None = None) -> str:
    if not isinstance(value, str) or not value.strip():
        if fallback is not None:
            return fallback
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def _finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _required_finite(value: Any, field: str) -> float:
    number = _finite(value)
    if number is None:
        raise ValueError(f"{field} must be a finite number")
    return number


def _executions(context: dict[str, Any]) -> list[dict[str, Any]]:
    rounds = _list(context.get("rounds"), "context.rounds", non_empty=True)
    normalized: list[dict[str, Any]] = []
    seen: set[int] = set()
    for index, item in enumerate(rounds or []):
        entry = _object(item, f"context.rounds[{index}]")
        phase = entry.get("phase")
        if isinstance(phase, bool) or not isinstance(phase, int):
            raise ValueError(f"context.rounds[{index}].phase must be an integer")
        if phase in seen:
            raise ValueError(f"context.rounds contains duplicate phase {phase}")
        seen.add(phase)
        execution = _object(entry.get("execution"), f"context.rounds[{index}].execution")
        normalized.append({"phase": phase, "execution": execution})
    return sorted(normalized, key=lambda item: item["phase"])


def _directions(criteria: list[dict[str, Any]]) -> list[str | None]:
    directions: list[str | None] = []
    for index, criterion in enumerate(criteria):
        value = str(criterion.get("type") or "").strip().lower()
        if value in {"benefit", "max"}:
            directions.append("max")
        elif value in {"cost", "min"}:
            directions.append("min")
        else:
            directions.append(None)
    return directions


def _matrix_from_standard_result(
    collective: Any,
    alternative_ids: list[str],
    criterion_ids: list[str],
) -> list[list[float]] | None:
    if not isinstance(collective, dict):
        return None
    rows: list[list[float]] = []
    for alternative_id in alternative_ids:
        values = collective.get(alternative_id)
        if not isinstance(values, dict):
            return None
        row = [_finite(values.get(criterion_id)) for criterion_id in criterion_ids]
        if any(value is None for value in row):
            return None
        rows.append([float(value) for value in row])
    return rows


def _matrix_from_raw(
    raw_matrix: Any,
    row_count: int,
    column_count: int,
    field: str,
) -> list[list[float]] | None:
    if raw_matrix is None:
        return None
    rows = _list(raw_matrix, field)
    if rows is None or len(rows) != row_count:
        return None
    normalized: list[list[float]] = []
    for row_index, raw_row in enumerate(rows):
        row = _list(raw_row, f"{field}[{row_index}]")
        if row is None or len(row) != column_count:
            return None
        values = [_finite(value) for value in row]
        if any(value is None for value in values):
            return None
        normalized.append([float(value) for value in values])
    return normalized


def _same_number(left: float, right: float) -> bool:
    return math.isclose(
        left,
        right,
        rel_tol=SCORE_VALIDATION_TOLERANCE,
        abs_tol=SCORE_VALIDATION_TOLERANCE,
    )


def _same_matrix(left: list[list[float]], right: list[list[float]]) -> bool:
    return len(left) == len(right) and all(
        len(left_row) == len(right_row)
        and all(_same_number(a, b) for a, b in zip(left_row, right_row))
        for left_row, right_row in zip(left, right)
    )


def _validate_ranked_alternatives(
    raw_ranking: Any,
    ranked: list[dict[str, Any]],
    input_alternatives: list[dict[str, Any]],
) -> None:
    if input_alternatives and len(input_alternatives) != len(ranked):
        raise ValueError("execution input alternative count conflicts with standardResult")
    if raw_ranking is None or not input_alternatives:
        return
    ranking = _list(raw_ranking, "rawOutput.collective_ranking")
    if ranking is None or len(ranking) != len(ranked):
        raise ValueError("rawOutput.collective_ranking must match rankedAlternatives")
    ids = [_string(item.get("id"), f"input.context.alternatives[{index}].id") for index, item in enumerate(input_alternatives)]
    names = [_string(item.get("name"), f"input.context.alternatives[{index}].name") for index, item in enumerate(input_alternatives)]
    if len(set(ids)) != len(ids):
        raise ValueError("input.context.alternatives contains duplicate ids")
    expected_ids: list[str] = []
    for position, raw_index in enumerate(ranking):
        if isinstance(raw_index, bool) or not isinstance(raw_index, int) or raw_index < 0 or raw_index >= len(ids):
            raise ValueError(f"rawOutput.collective_ranking[{position}] is invalid")
        expected_ids.append(ids[raw_index])
    actual_ids = [item["alternativeId"] for item in sorted(ranked, key=lambda item: item["technicalRank"])]
    if expected_ids != actual_ids:
        raise ValueError("standardResult.rankedAlternatives conflicts with rawOutput.collective_ranking")
    for item in ranked:
        input_index = ids.index(item["alternativeId"])
        if names[input_index] != item["name"]:
            raise ValueError("standardResult alternative names conflict with execution input")


def _validate_score_vectors(
    raw_scores: Any,
    ranked: list[dict[str, Any]],
    input_alternatives: list[dict[str, Any]],
) -> None:
    if raw_scores is None or not input_alternatives:
        return
    scores = _list(raw_scores, "rawOutput.collective_scores")
    if scores is None or len(scores) != len(input_alternatives):
        raise ValueError("rawOutput.collective_scores must match execution alternatives")
    ids = [_string(item.get("id"), f"input.context.alternatives[{index}].id") for index, item in enumerate(input_alternatives)]
    scores_by_id = {alternative_id: _finite(scores[index]) for index, alternative_id in enumerate(ids)}
    for item in ranked:
        raw_score = scores_by_id[item["alternativeId"]]
        if raw_score is not None and item["score"] is not None and not _same_number(raw_score, item["score"]):
            raise ValueError("standardResult scores conflict with rawOutput.collective_scores")


def _reconstruct_distances(
    matrix: list[list[float]],
    weights: list[float],
    directions: list[str | None],
    criterion_indices: list[int],
    ranked: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]] | None, str | None]:
    if len(matrix) < 1 or not matrix[0]:
        return None, "matrix_unavailable"
    if (
        len(weights) != len(matrix[0])
        or len(directions) != len(matrix[0])
        or len(criterion_indices) != len(matrix[0])
    ):
        return None, "criterion_metadata_mismatch"
    if any(direction not in {"max", "min"} for direction in directions):
        return None, "criterion_directions_unavailable"
    if any(item["score"] is None for item in ranked):
        return None, "executed_scores_unavailable"

    columns = list(zip(*matrix))
    norms = [math.sqrt(sum(value * value for value in column)) for column in columns]
    if any(not math.isfinite(norm) or norm == 0 for norm in norms):
        return None, "zero_or_non_finite_column_norm"

    normalized = [
        [matrix[row][column] / norms[column] for column in range(len(norms))]
        for row in range(len(matrix))
    ]
    weighted = [
        [normalized[row][column] * weights[column] for column in range(len(norms))]
        for row in range(len(matrix))
    ]
    positive_ideal: list[float] = []
    negative_ideal: list[float] = []
    for column, direction in enumerate(directions):
        values = [row[column] for row in weighted]
        positive_ideal.append(max(values) if direction == "max" else min(values))
        negative_ideal.append(min(values) if direction == "max" else max(values))

    distances: list[dict[str, Any]] = []
    for row_index, weighted_row in enumerate(weighted):
        positive_contributions = [
            (value - ideal) ** 2
            for value, ideal in zip(weighted_row, positive_ideal)
        ]
        negative_contributions = [
            (value - ideal) ** 2
            for value, ideal in zip(weighted_row, negative_ideal)
        ]
        positive_squared_distance = sum(positive_contributions)
        negative_squared_distance = sum(negative_contributions)
        positive_distance = math.sqrt(positive_squared_distance)
        negative_distance = math.sqrt(negative_squared_distance)
        denominator = positive_distance + negative_distance
        if not math.isfinite(denominator) or denominator == 0:
            return None, "zero_or_non_finite_ideal_distance_sum"
        closeness = negative_distance / denominator
        if not math.isfinite(closeness):
            return None, "non_finite_reconstructed_closeness"
        distances.append({
            "rowIndex": row_index,
            "positiveDistance": positive_distance,
            "negativeDistance": negative_distance,
            "positiveSquaredDistance": positive_squared_distance,
            "negativeSquaredDistance": negative_squared_distance,
            "positiveSquaredContributions": [
                {"criterionIndex": index, "value": value}
                for index, value in zip(criterion_indices, positive_contributions)
            ],
            "negativeSquaredContributions": [
                {"criterionIndex": index, "value": value}
                for index, value in zip(criterion_indices, negative_contributions)
            ],
            "closeness": closeness,
        })

    # Execution input order is recovered from the matrix rows. The caller checks
    # this vector against the actual score vector before exposing any distances.
    return distances, None


def extract_topsis_evidence(context: dict[str, Any]) -> dict[str, Any]:
    """Validate standard TOPSIS outputs and reconstruct only verifiable evidence."""
    if not isinstance(context, dict):
        raise ValueError("Model issue analysis context must be an object")
    rounds = _executions(context)
    final_round = rounds[-1]
    execution = final_round["execution"]
    result = _object(execution.get("result"), "context.rounds[-1].execution.result") or {}
    standard = _object(result.get("standardResult"), "execution.result.standardResult") or {}
    raw = _object(result.get("rawOutput"), "execution.result.rawOutput") or {}
    input_data = _object(execution.get("input"), "execution.input") or {}
    input_context = _object(input_data.get("context"), "execution.input.context") or {}
    input_alternatives_raw = _list(input_context.get("alternatives"), "execution.input.context.alternatives") or []
    input_alternatives = [
        _object(alternative, f"execution.input.context.alternatives[{index}]") or {}
        for index, alternative in enumerate(input_alternatives_raw)
    ]
    input_criteria_raw = _list(input_context.get("criteria"), "execution.input.context.criteria") or []
    input_criteria = [
        _object(criterion, f"execution.input.context.criteria[{index}]") or {}
        for index, criterion in enumerate(input_criteria_raw)
    ]

    raw_ranked = _list(standard.get("rankedAlternatives"), "standardResult.rankedAlternatives", non_empty=True)
    ranked: list[dict[str, Any]] = []
    seen_alternatives: set[str] = set()
    for index, raw_item in enumerate(raw_ranked or []):
        item = _object(raw_item, f"standardResult.rankedAlternatives[{index}]") or {}
        alternative_id = _string(item.get("alternativeId"), f"standardResult.rankedAlternatives[{index}].alternativeId")
        name = _string(item.get("name"), f"standardResult.rankedAlternatives[{index}].name")
        if alternative_id in seen_alternatives:
            raise ValueError("standardResult.rankedAlternatives contains duplicate alternatives")
        seen_alternatives.add(alternative_id)
        rank = item.get("rank")
        if isinstance(rank, bool) or not isinstance(rank, int) or rank < 1:
            raise ValueError(f"standardResult.rankedAlternatives[{index}].rank must be a positive integer")
        score = _finite(item.get("score"))
        if score is not None and not 0 <= score <= 1:
            raise ValueError(f"standardResult.rankedAlternatives[{index}].score is outside TOPSIS relative-closeness range [0, 1]")
        ranked.append({"alternativeId": alternative_id, "name": name, "technicalRank": rank, "score": score})
    if sorted(item["technicalRank"] for item in ranked) != list(range(1, len(ranked) + 1)):
        raise ValueError("standardResult ranks must form a consecutive technical ordering")
    ranked.sort(key=lambda item: item["technicalRank"])

    _validate_ranked_alternatives(raw.get("collective_ranking"), ranked, input_alternatives)
    _validate_score_vectors(raw.get("collective_scores"), ranked, input_alternatives)

    criteria: list[dict[str, Any]] = []
    for index, criterion in enumerate(input_criteria):
        criterion_id = _string(criterion.get("id"), f"execution.input.context.criteria[{index}].id")
        name = _string(criterion.get("name"), f"execution.input.context.criteria[{index}].name")
        criteria.append({"criterionId": criterion_id, "name": name, "direction": _directions([criterion])[0], "index": index})
    if len({item["criterionId"] for item in criteria}) != len(criteria):
        raise ValueError("execution.input.context.criteria contains duplicate ids")

    input_alternative_ids = [
        _string(item.get("id"), f"execution.input.context.alternatives[{index}].id")
        for index, item in enumerate(input_alternatives)
        if isinstance(item, dict)
    ]
    if len(set(input_alternative_ids)) != len(input_alternative_ids):
        raise ValueError("execution.input.context.alternatives contains duplicate ids")
    matrix_alternative_ids = input_alternative_ids or [item["alternativeId"] for item in ranked]
    standard_matrix = _matrix_from_standard_result(
        standard.get("collectiveEvaluations"),
        matrix_alternative_ids,
        [item["criterionId"] for item in criteria],
    ) if criteria else None
    raw_matrix = _matrix_from_raw(
        raw.get("collective_matrix"), len(ranked), len(criteria), "rawOutput.collective_matrix"
    ) if criteria and len(input_alternative_ids) == len(ranked) else None
    collective_matrix = standard_matrix or raw_matrix
    if standard_matrix is not None and raw_matrix is not None and not _same_matrix(standard_matrix, raw_matrix):
        raise ValueError("standardResult.collectiveEvaluations conflicts with rawOutput.collective_matrix")

    weights: list[float] | None = None
    parameters = _object(input_data.get("modelParameters"), "execution.input.modelParameters") or {}
    raw_weights = _object(parameters.get("weights"), "execution.input.modelParameters.weights")
    if raw_weights is not None and criteria and all(item["criterionId"] in raw_weights for item in criteria):
        weights = [_required_finite(raw_weights[item["criterionId"]], f"weights[{item['criterionId']}]") for item in criteria]
        for criterion, weight in zip(criteria, weights):
            criterion["configuredWeight"] = weight
    else:
        for criterion in criteria:
            criterion["configuredWeight"] = None

    if collective_matrix is not None:
        for index, criterion in enumerate(criteria):
            values = [row[index] for row in collective_matrix]
            minimum = min(values)
            maximum = max(values)
            criterion["minimumEvaluation"] = minimum
            criterion["maximumEvaluation"] = maximum
            criterion["hasObservedVariation"] = minimum != maximum
            criterion["collectiveEvaluations"] = values
            criterion["relativeFavorability"] = [
                0.5 if minimum == maximum else (
                    (value - minimum) / (maximum - minimum)
                    if criterion["direction"] == "max"
                    else (maximum - value) / (maximum - minimum)
                ) if criterion["direction"] in {"max", "min"} else None
                for value in values
            ]

    distance_items: list[dict[str, Any]] | None = None
    distance_reason: str | None = "required_execution_evidence_unavailable"
    if collective_matrix is not None and weights is not None and criteria and len(input_alternative_ids) == len(ranked):
        # clean_matrix removes constant columns; when all columns are constant it
        # keeps all of them. Map the retained matrix back to its executed criteria.
        varying = [index for index in range(len(criteria)) if any(row[index] != collective_matrix[0][index] for row in collective_matrix[1:])]
        retained = varying if varying else list(range(len(criteria)))
        matrix_used = _matrix_from_raw(
            raw.get("matrix_used"), len(ranked), len(retained), "rawOutput.matrix_used"
        )
        if matrix_used is not None and len(retained) != len(criteria):
            expected_matrix = [[row[index] for index in retained] for row in collective_matrix]
            if not _same_matrix(expected_matrix, matrix_used):
                matrix_used = None
        elif matrix_used is not None and not _same_matrix(matrix_used, collective_matrix):
            matrix_used = None
        if matrix_used is not None:
            used_weights = [weights[index] for index in retained]
            used_directions = [criteria[index]["direction"] for index in retained]
            distance_items, distance_reason = _reconstruct_distances(
                matrix_used, used_weights, used_directions, retained, ranked
            )
            if distance_items is not None:
                input_order = input_alternative_ids
                if len(input_order) == len(distance_items):
                    distance_by_id = {input_order[item["rowIndex"]]: item for item in distance_items}
                    validated: list[dict[str, Any]] = []
                    for item in ranked:
                        distance = distance_by_id.get(item["alternativeId"])
                        if distance is None or item["score"] is None or not _same_number(distance["closeness"], item["score"]):
                            validated = []
                            break
                        positive_by_criterion = {
                            contribution["criterionIndex"]: contribution["value"]
                            for contribution in distance["positiveSquaredContributions"]
                        }
                        negative_by_criterion = {
                            contribution["criterionIndex"]: contribution["value"]
                            for contribution in distance["negativeSquaredContributions"]
                        }
                        positive_contributions = [
                            {
                                "criterionId": criterion["criterionId"],
                                "criterionName": criterion["name"],
                                "direction": criterion["direction"],
                                "configuredWeight": criterion["configuredWeight"],
                                "squaredDistanceContribution": positive_by_criterion.get(criterion["index"], 0.0),
                            }
                            for criterion in criteria
                        ]
                        negative_contributions = [
                            {
                                "criterionId": criterion["criterionId"],
                                "criterionName": criterion["name"],
                                "direction": criterion["direction"],
                                "configuredWeight": criterion["configuredWeight"],
                                "squaredDistanceContribution": negative_by_criterion.get(criterion["index"], 0.0),
                            }
                            for criterion in criteria
                        ]
                        if not _same_number(
                            sum(item["squaredDistanceContribution"] for item in positive_contributions),
                            distance["positiveSquaredDistance"],
                        ) or not _same_number(
                            sum(item["squaredDistanceContribution"] for item in negative_contributions),
                            distance["negativeSquaredDistance"],
                        ):
                            validated = []
                            break
                        validated.append({
                            **distance,
                            "positiveSquaredContributions": positive_contributions,
                            "negativeSquaredContributions": negative_contributions,
                            "alternativeId": item["alternativeId"],
                            "name": item["name"],
                            "technicalRank": item["technicalRank"],
                        })
                    if validated:
                        distance_items = validated
                        distance_reason = None
                    else:
                        distance_items = None
                        distance_reason = "reconstructed_scores_do_not_match_execution"
                else:
                    distance_items = None
                    distance_reason = "alternative_order_unavailable"
    return {
        "sourcePhase": final_round["phase"],
        "inputAlternatives": (
            [
                {
                    "alternativeId": _string(item.get("id"), f"execution.input.context.alternatives[{index}].id"),
                    "name": _string(item.get("name"), f"execution.input.context.alternatives[{index}].name"),
                }
                for index, item in enumerate(input_alternatives)
            ]
            if input_alternatives
            else [{"alternativeId": item["alternativeId"], "name": item["name"]} for item in ranked]
        ),
        "matrixAlternativeIds": matrix_alternative_ids,
        "rankedAlternatives": ranked,
        "criteria": criteria,
        "inputAlternativeIds": input_alternative_ids,
        "collectiveMatrix": collective_matrix,
        "aggregation": {"method": "arithmetic_mean", "expertWeightsApplied": False},
        "distances": {"available": distance_items is not None, "reason": distance_reason, "items": distance_items or []},
    }


__all__ = ["extract_topsis_evidence"]
