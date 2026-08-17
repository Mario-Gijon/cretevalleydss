from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .common import (
    EVIDENCE_TOLERANCE,
    MODEL_FLOAT_TOLERANCE,
    as_list,
    as_object,
    assert_close,
    finite_number,
    non_empty_string,
    required,
    scale_labels,
    tuple_fact,
    validated_numeric_list,
    validated_numeric_matrix,
    validated_string_list,
    validated_tuple_matrix,
    validated_weights,
)


@dataclass(frozen=True)
class TopsisEvidence:
    source_phase: int
    executed_rounds: int
    alternative_ids: list[str]
    alternative_names: list[str]
    criterion_ids: list[str]
    criterion_names: list[str]
    expert_keys: list[str]
    expert_weights: list[float]
    criterion_weights: list[float]
    criterion_directions: list[str]
    scale_labels: list[list[dict[str, Any]]]
    collective_beta_matrix: list[list[float]]
    collective_matrix: list[list[dict[str, Any]]]
    positive_ideal_beta: list[float]
    negative_ideal_beta: list[float]
    positive_ideal: list[dict[str, Any]]
    negative_ideal: list[dict[str, Any]]
    positive_distances: list[float]
    negative_distances: list[float]
    closeness: list[float]
    ranking: list[int]
    positive_contributions: list[list[float]]
    negative_contributions: list[list[float]]


def _executed_rounds(context: dict[str, Any]) -> list[dict[str, Any]]:
    rounds = as_list(
        context.get("rounds"),
        "context.rounds",
        non_empty=True,
    )
    normalized: list[dict[str, Any]] = []
    seen_phases: set[int] = set()

    for index, raw_round in enumerate(rounds):
        entry = as_object(raw_round, f"context.rounds[{index}]")
        phase = entry.get("phase")
        if isinstance(phase, bool) or not isinstance(phase, int):
            raise ValueError(f"context.rounds[{index}].phase must be an integer")
        if phase in seen_phases:
            raise ValueError(
                f"context.rounds contains duplicate executed phase {phase}"
            )
        seen_phases.add(phase)
        normalized.append(
            {
                "phase": phase,
                "execution": as_object(
                    entry.get("execution"),
                    f"context.rounds[{index}].execution",
                ),
            }
        )

    return sorted(normalized, key=lambda entry: entry["phase"])


def _raw_output(
    final_round: dict[str, Any],
) -> dict[str, Any]:
    result = as_object(
        final_round["execution"].get("result"),
        "context.rounds[-1].execution.result",
    )
    return as_object(
        result.get("rawOutput"),
        "context.rounds[-1].execution.result.rawOutput",
    )


def _directions(raw: dict[str, Any], criterion_count: int) -> list[str]:
    values = as_list(
        required(raw, "criterion_directions", "rawOutput"),
        "rawOutput.criterion_directions",
    )
    if len(values) != criterion_count:
        raise ValueError(
            "rawOutput.criterion_directions length must match criterion_ids"
        )

    result: list[str] = []
    for index, value in enumerate(values):
        direction = non_empty_string(
            value,
            f"rawOutput.criterion_directions[{index}]",
        ).lower()
        if direction not in {"max", "min"}:
            raise ValueError(f"Unsupported criterion direction '{value}'")
        result.append(direction)
    return result


def _scales(
    raw: dict[str, Any],
    criterion_ids: list[str],
) -> list[list[dict[str, Any]]]:
    raw_scales = as_list(
        required(raw, "criterion_scales", "rawOutput"),
        "rawOutput.criterion_scales",
    )
    if len(raw_scales) != len(criterion_ids):
        raise ValueError(
            "rawOutput.criterion_scales length must match criterion_ids"
        )

    return [
        scale_labels(raw_scale, index, criterion_ids[index])
        for index, raw_scale in enumerate(raw_scales)
    ]


def _validate_beta_ranges(
    matrix: list[list[float]],
    scales: list[list[dict[str, Any]]],
) -> None:
    for alternative_index, row in enumerate(matrix):
        for criterion_index, beta in enumerate(row):
            maximum_index = len(scales[criterion_index]) - 1
            if (
                beta < -EVIDENCE_TOLERANCE
                or beta > maximum_index + EVIDENCE_TOLERANCE
            ):
                raise ValueError(
                    "rawOutput.collective_beta_matrix"
                    f"[{alternative_index}][{criterion_index}] "
                    "is outside its linguistic scale"
                )


def _ideal_evidence(
    *,
    raw: dict[str, Any],
    matrix: list[list[float]],
    directions: list[str],
    scales: list[list[dict[str, Any]]],
) -> tuple[
    list[float],
    list[float],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    criterion_count = len(directions)
    positive_beta = validated_numeric_list(
        required(raw, "positive_ideal_beta", "rawOutput"),
        "rawOutput.positive_ideal_beta",
        criterion_count,
    )
    negative_beta = validated_numeric_list(
        required(raw, "negative_ideal_beta", "rawOutput"),
        "rawOutput.negative_ideal_beta",
        criterion_count,
    )
    positive_raw = as_list(
        required(raw, "positive_ideal", "rawOutput"),
        "rawOutput.positive_ideal",
    )
    negative_raw = as_list(
        required(raw, "negative_ideal", "rawOutput"),
        "rawOutput.negative_ideal",
    )
    if len(positive_raw) != criterion_count:
        raise ValueError("rawOutput.positive_ideal length must match criteria")
    if len(negative_raw) != criterion_count:
        raise ValueError("rawOutput.negative_ideal length must match criteria")

    positive: list[dict[str, Any]] = []
    negative: list[dict[str, Any]] = []

    for criterion_index in range(criterion_count):
        column = [row[criterion_index] for row in matrix]
        if directions[criterion_index] == "max":
            expected_positive = max(column)
            expected_negative = min(column)
        else:
            expected_positive = min(column)
            expected_negative = max(column)

        assert_close(
            positive_beta[criterion_index],
            expected_positive,
            f"rawOutput.positive_ideal_beta[{criterion_index}]",
        )
        assert_close(
            negative_beta[criterion_index],
            expected_negative,
            f"rawOutput.negative_ideal_beta[{criterion_index}]",
        )

        positive.append(
            tuple_fact(
                positive_raw[criterion_index],
                beta=positive_beta[criterion_index],
                labels=scales[criterion_index],
                field=f"rawOutput.positive_ideal[{criterion_index}]",
            )
        )
        negative.append(
            tuple_fact(
                negative_raw[criterion_index],
                beta=negative_beta[criterion_index],
                labels=scales[criterion_index],
                field=f"rawOutput.negative_ideal[{criterion_index}]",
            )
        )

    return positive_beta, negative_beta, positive, negative


def _ranking(
    raw: dict[str, Any],
    closeness: list[float],
) -> list[int]:
    alternative_count = len(closeness)
    values = as_list(
        required(raw, "collective_ranking", "rawOutput"),
        "rawOutput.collective_ranking",
    )
    if len(values) != alternative_count:
        raise ValueError(
            "rawOutput.collective_ranking length must match alternatives"
        )

    ranking: list[int] = []
    for position, raw_index in enumerate(values):
        if (
            isinstance(raw_index, bool)
            or not isinstance(raw_index, int)
            or raw_index < 0
            or raw_index >= alternative_count
        ):
            raise ValueError(
                f"rawOutput.collective_ranking[{position}] "
                "must be a valid alternative index"
            )
        ranking.append(raw_index)

    if len(set(ranking)) != alternative_count:
        raise ValueError(
            "rawOutput.collective_ranking must be a permutation "
            "of alternative indexes"
        )

    expected = sorted(
        range(alternative_count),
        key=lambda index: (-closeness[index], index),
    )
    if ranking != expected:
        raise ValueError(
            "rawOutput.collective_ranking is inconsistent with "
            "executed closeness coefficients"
        )

    return ranking


def _distance_evidence(
    *,
    raw: dict[str, Any],
    matrix: list[list[float]],
    positive_ideal_beta: list[float],
    negative_ideal_beta: list[float],
    criterion_weights: list[float],
) -> tuple[
    list[float],
    list[float],
    list[float],
    list[list[float]],
    list[list[float]],
]:
    alternative_count = len(matrix)
    positive_distances = validated_numeric_list(
        required(raw, "positive_distances", "rawOutput"),
        "rawOutput.positive_distances",
        alternative_count,
        non_negative=True,
    )
    negative_distances = validated_numeric_list(
        required(raw, "negative_distances", "rawOutput"),
        "rawOutput.negative_distances",
        alternative_count,
        non_negative=True,
    )
    closeness = validated_numeric_list(
        required(raw, "closeness_coefficients", "rawOutput"),
        "rawOutput.closeness_coefficients",
        alternative_count,
    )
    scores = validated_numeric_list(
        required(raw, "collective_scores", "rawOutput"),
        "rawOutput.collective_scores",
        alternative_count,
    )

    positive_contributions: list[list[float]] = []
    negative_contributions: list[list[float]] = []

    for alternative_index, row in enumerate(matrix):
        coefficient = closeness[alternative_index]
        if (
            coefficient < -EVIDENCE_TOLERANCE
            or coefficient > 1.0 + EVIDENCE_TOLERANCE
        ):
            raise ValueError(
                f"rawOutput.closeness_coefficients[{alternative_index}] "
                "must be between 0 and 1"
            )
        assert_close(
            scores[alternative_index],
            coefficient,
            f"rawOutput.collective_scores[{alternative_index}]",
        )

        row_positive: list[float] = []
        row_negative: list[float] = []
        for criterion_index, beta in enumerate(row):
            weight = criterion_weights[criterion_index]
            row_positive.append(
                weight * abs(beta - positive_ideal_beta[criterion_index])
            )
            row_negative.append(
                weight * abs(beta - negative_ideal_beta[criterion_index])
            )

        assert_close(
            positive_distances[alternative_index],
            sum(row_positive),
            f"rawOutput.positive_distances[{alternative_index}]",
        )
        assert_close(
            negative_distances[alternative_index],
            sum(row_negative),
            f"rawOutput.negative_distances[{alternative_index}]",
        )

        denominator = (
            positive_distances[alternative_index]
            + negative_distances[alternative_index]
        )
        expected_closeness = (
            0.5
            if denominator <= MODEL_FLOAT_TOLERANCE
            else negative_distances[alternative_index] / denominator
        )
        assert_close(
            coefficient,
            expected_closeness,
            f"rawOutput.closeness_coefficients[{alternative_index}]",
        )

        positive_contributions.append(row_positive)
        negative_contributions.append(row_negative)

    return (
        positive_distances,
        negative_distances,
        closeness,
        positive_contributions,
        negative_contributions,
    )


def extract_topsis_evidence(context: dict[str, Any]) -> TopsisEvidence:
    if not isinstance(context, dict):
        raise ValueError("Model issue analysis context must be an object")

    rounds = _executed_rounds(context)
    final_round = rounds[-1]
    raw = _raw_output(final_round)

    alternative_ids = validated_string_list(
        required(raw, "alternative_ids", "rawOutput"),
        "rawOutput.alternative_ids",
    )
    alternative_names = validated_string_list(
        required(raw, "alternative_names", "rawOutput"),
        "rawOutput.alternative_names",
    )
    criterion_ids = validated_string_list(
        required(raw, "criterion_ids", "rawOutput"),
        "rawOutput.criterion_ids",
    )
    criterion_names = validated_string_list(
        required(raw, "criterion_names", "rawOutput"),
        "rawOutput.criterion_names",
    )
    expert_keys = validated_string_list(
        required(raw, "expert_keys", "rawOutput"),
        "rawOutput.expert_keys",
    )

    alternative_count = len(alternative_ids)
    criterion_count = len(criterion_ids)
    evaluator_count = len(expert_keys)

    if len(alternative_names) != alternative_count:
        raise ValueError(
            "rawOutput.alternative_names length must match alternative_ids"
        )
    if len(criterion_names) != criterion_count:
        raise ValueError(
            "rawOutput.criterion_names length must match criterion_ids"
        )

    criterion_weights = validated_weights(
        required(raw, "criterion_weights", "rawOutput"),
        "rawOutput.criterion_weights",
        criterion_count,
    )
    expert_weights = validated_weights(
        required(raw, "expert_weights", "rawOutput"),
        "rawOutput.expert_weights",
        evaluator_count,
    )
    directions = _directions(raw, criterion_count)
    scales = _scales(raw, criterion_ids)

    beta_matrix = validated_numeric_matrix(
        required(raw, "collective_beta_matrix", "rawOutput"),
        "rawOutput.collective_beta_matrix",
        alternative_count,
        criterion_count,
    )
    _validate_beta_ranges(beta_matrix, scales)

    tuple_matrix = validated_tuple_matrix(
        required(raw, "collective_matrix", "rawOutput"),
        betas=beta_matrix,
        scales=scales,
        row_count=alternative_count,
        column_count=criterion_count,
    )

    (
        positive_ideal_beta,
        negative_ideal_beta,
        positive_ideal,
        negative_ideal,
    ) = _ideal_evidence(
        raw=raw,
        matrix=beta_matrix,
        directions=directions,
        scales=scales,
    )

    (
        positive_distances,
        negative_distances,
        closeness,
        positive_contributions,
        negative_contributions,
    ) = _distance_evidence(
        raw=raw,
        matrix=beta_matrix,
        positive_ideal_beta=positive_ideal_beta,
        negative_ideal_beta=negative_ideal_beta,
        criterion_weights=criterion_weights,
    )
    ranking = _ranking(raw, closeness)

    return TopsisEvidence(
        source_phase=final_round["phase"],
        executed_rounds=len(rounds),
        alternative_ids=alternative_ids,
        alternative_names=alternative_names,
        criterion_ids=criterion_ids,
        criterion_names=criterion_names,
        expert_keys=expert_keys,
        expert_weights=expert_weights,
        criterion_weights=criterion_weights,
        criterion_directions=directions,
        scale_labels=scales,
        collective_beta_matrix=beta_matrix,
        collective_matrix=tuple_matrix,
        positive_ideal_beta=positive_ideal_beta,
        negative_ideal_beta=negative_ideal_beta,
        positive_ideal=positive_ideal,
        negative_ideal=negative_ideal,
        positive_distances=positive_distances,
        negative_distances=negative_distances,
        closeness=closeness,
        ranking=ranking,
        positive_contributions=positive_contributions,
        negative_contributions=negative_contributions,
    )
