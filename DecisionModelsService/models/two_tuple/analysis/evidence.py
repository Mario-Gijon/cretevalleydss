from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..aggregation.definitions import AGGREGATION_METHODS
from ..aggregation.operators import generate_owa_weights
from ..aggregation.registry import resolve_l2towa_quantifier
from .common import (
    EVIDENCE_TOLERANCE,
    as_list,
    as_object,
    assert_close,
    finite_number,
    non_empty_string,
    required,
    tuple_fact,
    validated_labels,
    validated_numeric_list,
    validated_numeric_matrix,
    validated_optional_string_list,
    validated_string_list,
    validated_tuple_matrix,
    validated_weights,
)


SUPPORTED_METHODS = {
    "arithmetic_mean",
    "weighted_average",
    "l2towa",
}


@dataclass(frozen=True)
class TwoTupleEvidence:
    source_phase: int
    executed_rounds: int

    alternative_ids: list[str]
    alternative_names: list[str]
    criterion_ids: list[str]
    criterion_names: list[str]

    expert_keys: list[str]
    expert_ids: list[str | None]
    expert_labels: list[str]
    expert_emails: list[str | None]

    labels: list[dict[str, Any]]
    label_count: int

    collective_beta_matrix: list[list[float]]
    collective_matrix: list[list[dict[str, Any]]]
    collective_values: list[dict[str, Any]]
    collective_scores: list[float]
    ranking: list[int]

    expert_aggregation: dict[str, Any]
    criteria_aggregation: dict[str, Any]
    expert_aggregation_evidence: dict[str, Any]
    criteria_aggregation_evidence: dict[str, Any]

    expert_weights: list[float] | None
    criterion_weights: list[float] | None

    expert_aggregation_traces: list[list[dict[str, Any]]]
    criteria_aggregation_traces: list[dict[str, Any]]


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
            raise ValueError(
                f"context.rounds[{index}].phase must be an integer"
            )
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


def _raw_output(final_round: dict[str, Any]) -> dict[str, Any]:
    result = as_object(
        final_round["execution"].get("result"),
        "context.rounds[-1].execution.result",
    )
    return as_object(
        result.get("rawOutput"),
        "context.rounds[-1].execution.result.rawOutput",
    )


def _positive_int(value: Any, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{field} must be an integer greater than or equal to 1")
    return value


def _aggregation_config(
    raw: Any,
    field: str,
) -> dict[str, Any]:
    config = as_object(raw, field)
    method = non_empty_string(config.get("method"), f"{field}.method")
    if method not in SUPPORTED_METHODS:
        raise ValueError(f"{field}.method '{method}' is not supported")

    options = config.get("options", {})
    if options is None:
        options = {}
    options = as_object(options, f"{field}.options")

    return {
        "method": method,
        "options": dict(options),
    }


def _published_method_definition(method: str) -> dict[str, Any]:
    for definition in AGGREGATION_METHODS:
        if isinstance(definition, dict) and definition.get("key") == method:
            return definition
    raise ValueError(f"Unsupported aggregation method '{method}'")


def _validated_index_list(
    raw: Any,
    field: str,
    expected_length: int,
) -> list[int]:
    values = as_list(raw, field)
    if len(values) != expected_length:
        raise ValueError(
            f"{field} length must be {expected_length}, got {len(values)}"
        )

    result: list[int] = []
    for index, raw_value in enumerate(values):
        if (
            isinstance(raw_value, bool)
            or not isinstance(raw_value, int)
            or raw_value < 0
            or raw_value >= expected_length
        ):
            raise ValueError(
                f"{field}[{index}] must be a valid source index"
            )
        result.append(raw_value)

    if len(set(result)) != expected_length:
        raise ValueError(f"{field} must be a permutation of source indexes")

    return result


def _validate_weight_list_matches(
    actual: list[float],
    expected: list[float],
    field: str,
) -> None:
    if len(actual) != len(expected):
        raise ValueError(f"{field} length is inconsistent")
    for index, (actual_value, expected_value) in enumerate(
        zip(actual, expected, strict=True)
    ):
        assert_close(
            actual_value,
            expected_value,
            f"{field}[{index}]",
        )


def _stage_evidence(
    *,
    raw_stage: Any,
    config: dict[str, Any],
    expected_argument_count: int,
    field: str,
) -> dict[str, Any]:
    stage = as_object(raw_stage, field)
    method = non_empty_string(stage.get("method"), f"{field}.method")
    if method != config["method"]:
        raise ValueError(
            f"{field}.method must match the executed aggregation configuration"
        )

    options = as_object(stage.get("options", {}), f"{field}.options")
    if options != config["options"]:
        raise ValueError(
            f"{field}.options must match the executed aggregation configuration"
        )

    argument_count = _positive_int(
        stage.get("argument_count"),
        f"{field}.argument_count",
    )
    if argument_count != expected_argument_count:
        raise ValueError(
            f"{field}.argument_count must be {expected_argument_count}"
        )

    weight_semantics = non_empty_string(
        stage.get("weight_semantics"),
        f"{field}.weight_semantics",
    )

    effective_weights = validated_weights(
        stage.get("effective_weights"),
        f"{field}.effective_weights",
        expected_argument_count,
    )

    configured_raw = required(
        stage,
        "configured_argument_weights",
        field,
        allow_none=True,
    )
    l2towa_raw = required(
        stage,
        "l2towa",
        field,
        allow_none=True,
    )

    configured_weights: list[float] | None
    l2towa: dict[str, Any] | None

    if method == "arithmetic_mean":
        if weight_semantics != "equal_arguments":
            raise ValueError(
                f"{field}.weight_semantics must be 'equal_arguments'"
            )
        if configured_raw is not None:
            raise ValueError(
                f"{field}.configured_argument_weights must be null "
                "for arithmetic_mean"
            )
        if l2towa_raw is not None:
            raise ValueError(
                f"{field}.l2towa must be null for arithmetic_mean"
            )

        expected_weights = [
            1.0 / expected_argument_count
            for _ in range(expected_argument_count)
        ]
        _validate_weight_list_matches(
            effective_weights,
            expected_weights,
            f"{field}.effective_weights",
        )
        configured_weights = None
        l2towa = None

    elif method == "weighted_average":
        if weight_semantics != "argument_importance":
            raise ValueError(
                f"{field}.weight_semantics must be 'argument_importance'"
            )
        if configured_raw is None:
            raise ValueError(
                f"{field}.configured_argument_weights is required "
                "for weighted_average"
            )
        if l2towa_raw is not None:
            raise ValueError(
                f"{field}.l2towa must be null for weighted_average"
            )

        configured_weights = validated_weights(
            configured_raw,
            f"{field}.configured_argument_weights",
            expected_argument_count,
            require_sum_one=False,
        )
        total = sum(configured_weights)
        expected_weights = [
            value / total
            for value in configured_weights
        ]
        _validate_weight_list_matches(
            effective_weights,
            expected_weights,
            f"{field}.effective_weights",
        )
        l2towa = None

    else:
        if weight_semantics != "ordered_positions_descending_beta":
            raise ValueError(
                f"{field}.weight_semantics must describe descending "
                "ordered beta positions for L2TOWA"
            )
        if configured_raw is not None:
            raise ValueError(
                f"{field}.configured_argument_weights must be null "
                "for L2TOWA"
            )
        if l2towa_raw is None:
            raise ValueError(f"{field}.l2towa is required for L2TOWA")

        l2towa_object = as_object(l2towa_raw, f"{field}.l2towa")
        quantifier = non_empty_string(
            l2towa_object.get("quantifier"),
            f"{field}.l2towa.quantifier",
        )
        if quantifier != config["options"].get("quantifier"):
            raise ValueError(
                f"{field}.l2towa.quantifier must match configuration"
            )

        a = finite_number(
            l2towa_object.get("a"),
            f"{field}.l2towa.a",
        )
        b = finite_number(
            l2towa_object.get("b"),
            f"{field}.l2towa.b",
        )
        ordering = non_empty_string(
            l2towa_object.get("ordering"),
            f"{field}.l2towa.ordering",
        )
        if ordering != "descending_beta":
            raise ValueError(
                f"{field}.l2towa.ordering must be 'descending_beta'"
            )

        method_definition = _published_method_definition("l2towa")
        expected_a, expected_b = resolve_l2towa_quantifier(
            method_definition=method_definition,
            options=config["options"],
        )
        assert_close(a, expected_a, f"{field}.l2towa.a")
        assert_close(b, expected_b, f"{field}.l2towa.b")

        positional_weights = validated_weights(
            l2towa_object.get("positional_weights"),
            f"{field}.l2towa.positional_weights",
            expected_argument_count,
        )
        expected_weights = generate_owa_weights(
            expected_argument_count,
            a=expected_a,
            b=expected_b,
        )
        _validate_weight_list_matches(
            positional_weights,
            expected_weights,
            f"{field}.l2towa.positional_weights",
        )
        _validate_weight_list_matches(
            effective_weights,
            expected_weights,
            f"{field}.effective_weights",
        )

        configured_weights = None
        l2towa = {
            "quantifier": quantifier,
            "a": a,
            "b": b,
            "positional_weights": positional_weights,
            "ordering": ordering,
        }

    return {
        "method": method,
        "options": dict(options),
        "argument_count": argument_count,
        "weight_semantics": weight_semantics,
        "configured_argument_weights": configured_weights,
        "effective_weights": effective_weights,
        "l2towa": l2towa,
    }


def _top_level_importance_weights(
    *,
    raw: dict[str, Any],
    key: str,
    stage: dict[str, Any],
    expected_length: int,
) -> list[float] | None:
    raw_value = required(
        raw,
        key,
        "rawOutput",
        allow_none=True,
    )

    if stage["weight_semantics"] != "argument_importance":
        if raw_value is not None:
            raise ValueError(
                f"rawOutput.{key} must be null when the selected "
                "aggregation method does not use argument-importance weights"
            )
        return None

    weights = validated_weights(
        raw_value,
        f"rawOutput.{key}",
        expected_length,
    )
    _validate_weight_list_matches(
        weights,
        stage["effective_weights"],
        f"rawOutput.{key}",
    )
    return weights


def _validate_beta_range(
    beta: float,
    *,
    label_count: int,
    field: str,
) -> None:
    maximum_index = label_count - 1
    if (
        beta < -EVIDENCE_TOLERANCE
        or beta > maximum_index + EVIDENCE_TOLERANCE
    ):
        raise ValueError(
            f"{field} must be within the common linguistic scale "
            f"[0, {maximum_index}]"
        )


def _validate_beta_matrix_ranges(
    matrix: list[list[float]],
    *,
    label_count: int,
    field: str,
) -> None:
    for row_index, row in enumerate(matrix):
        for column_index, beta in enumerate(row):
            _validate_beta_range(
                beta,
                label_count=label_count,
                field=f"{field}[{row_index}][{column_index}]",
            )


def _collective_values(
    *,
    raw: dict[str, Any],
    scores: list[float],
    labels: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    raw_values = as_list(
        required(raw, "collective_values", "rawOutput"),
        "rawOutput.collective_values",
    )
    if len(raw_values) != len(scores):
        raise ValueError(
            "rawOutput.collective_values length must match alternatives"
        )

    return [
        tuple_fact(
            raw_tuple,
            beta=scores[index],
            labels=labels,
            field=f"rawOutput.collective_values[{index}]",
        )
        for index, raw_tuple in enumerate(raw_values)
    ]


def _ranking(
    raw: dict[str, Any],
    scores: list[float],
) -> list[int]:
    alternative_count = len(scores)
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
        key=lambda index: (-scores[index], index),
    )
    if ranking != expected:
        raise ValueError(
            "rawOutput.collective_ranking is inconsistent with "
            "executed final beta values"
        )

    return ranking


def _trace(
    *,
    raw_trace: Any,
    stage: dict[str, Any],
    expected_output_beta: float,
    label_count: int,
    field: str,
    expected_input_betas: list[float] | None = None,
) -> dict[str, Any]:
    trace = as_object(raw_trace, field)
    argument_count = stage["argument_count"]

    input_betas = validated_numeric_list(
        trace.get("input_betas"),
        f"{field}.input_betas",
        argument_count,
    )
    for index, beta in enumerate(input_betas):
        _validate_beta_range(
            beta,
            label_count=label_count,
            field=f"{field}.input_betas[{index}]",
        )

    if expected_input_betas is not None:
        _validate_weight_list_matches(
            input_betas,
            expected_input_betas,
            f"{field}.input_betas",
        )

    source_indexes = _validated_index_list(
        trace.get("source_indexes_in_aggregation_order"),
        f"{field}.source_indexes_in_aggregation_order",
        argument_count,
    )

    if stage["method"] == "l2towa":
        expected_order = [
            index
            for index, _beta in sorted(
                enumerate(input_betas),
                key=lambda item: (-item[1], item[0]),
            )
        ]
    else:
        expected_order = list(range(argument_count))

    if source_indexes != expected_order:
        raise ValueError(
            f"{field}.source_indexes_in_aggregation_order is inconsistent "
            "with the executed aggregation method"
        )

    aggregation_betas = validated_numeric_list(
        trace.get("aggregation_betas"),
        f"{field}.aggregation_betas",
        argument_count,
    )
    expected_aggregation_betas = [
        input_betas[index]
        for index in source_indexes
    ]
    _validate_weight_list_matches(
        aggregation_betas,
        expected_aggregation_betas,
        f"{field}.aggregation_betas",
    )

    effective_weights = validated_weights(
        trace.get("effective_weights"),
        f"{field}.effective_weights",
        argument_count,
    )
    _validate_weight_list_matches(
        effective_weights,
        stage["effective_weights"],
        f"{field}.effective_weights",
    )

    contributions = validated_numeric_list(
        trace.get("contributions"),
        f"{field}.contributions",
        argument_count,
        non_negative=True,
    )
    expected_contributions = [
        beta * weight
        for beta, weight in zip(
            aggregation_betas,
            effective_weights,
            strict=True,
        )
    ]
    _validate_weight_list_matches(
        contributions,
        expected_contributions,
        f"{field}.contributions",
    )

    aggregated_beta = finite_number(
        trace.get("aggregated_beta"),
        f"{field}.aggregated_beta",
    )
    _validate_beta_range(
        aggregated_beta,
        label_count=label_count,
        field=f"{field}.aggregated_beta",
    )
    assert_close(
        aggregated_beta,
        sum(contributions),
        f"{field}.aggregated_beta",
    )
    assert_close(
        aggregated_beta,
        expected_output_beta,
        f"{field}.aggregated_beta",
    )

    return {
        "input_betas": input_betas,
        "source_indexes_in_aggregation_order": source_indexes,
        "aggregation_betas": aggregation_betas,
        "effective_weights": effective_weights,
        "contributions": contributions,
        "aggregated_beta": aggregated_beta,
    }


def _expert_traces(
    *,
    raw: dict[str, Any],
    stage: dict[str, Any],
    collective_beta_matrix: list[list[float]],
    label_count: int,
) -> list[list[dict[str, Any]]]:
    raw_rows = as_list(
        required(raw, "expert_aggregation_traces", "rawOutput"),
        "rawOutput.expert_aggregation_traces",
    )
    if len(raw_rows) != len(collective_beta_matrix):
        raise ValueError(
            "rawOutput.expert_aggregation_traces row count "
            "must match alternatives"
        )

    result: list[list[dict[str, Any]]] = []
    for alternative_index, raw_row in enumerate(raw_rows):
        row = as_list(
            raw_row,
            f"rawOutput.expert_aggregation_traces[{alternative_index}]",
        )
        if len(row) != len(collective_beta_matrix[alternative_index]):
            raise ValueError(
                "rawOutput.expert_aggregation_traces column count "
                "must match criteria"
            )

        result.append(
            [
                _trace(
                    raw_trace=raw_trace,
                    stage=stage,
                    expected_output_beta=collective_beta_matrix[
                        alternative_index
                    ][criterion_index],
                    label_count=label_count,
                    field=(
                        "rawOutput.expert_aggregation_traces"
                        f"[{alternative_index}][{criterion_index}]"
                    ),
                )
                for criterion_index, raw_trace in enumerate(row)
            ]
        )

    return result


def _criteria_traces(
    *,
    raw: dict[str, Any],
    stage: dict[str, Any],
    collective_beta_matrix: list[list[float]],
    collective_scores: list[float],
    label_count: int,
) -> list[dict[str, Any]]:
    raw_traces = as_list(
        required(raw, "criteria_aggregation_traces", "rawOutput"),
        "rawOutput.criteria_aggregation_traces",
    )
    if len(raw_traces) != len(collective_scores):
        raise ValueError(
            "rawOutput.criteria_aggregation_traces length "
            "must match alternatives"
        )

    return [
        _trace(
            raw_trace=raw_trace,
            stage=stage,
            expected_output_beta=collective_scores[alternative_index],
            label_count=label_count,
            field=f"rawOutput.criteria_aggregation_traces[{alternative_index}]",
            expected_input_betas=collective_beta_matrix[alternative_index],
        )
        for alternative_index, raw_trace in enumerate(raw_traces)
    ]


def extract_two_tuple_evidence(
    context: dict[str, Any],
) -> TwoTupleEvidence:
    if not isinstance(context, dict):
        raise ValueError("Model issue analysis context must be an object")

    rounds = _executed_rounds(context)
    final_round = rounds[-1]
    raw = _raw_output(final_round)

    alternative_ids = validated_string_list(
        required(raw, "alternative_ids", "rawOutput"),
        "rawOutput.alternative_ids",
        unique=True,
    )
    alternative_names = validated_string_list(
        required(raw, "alternative_names", "rawOutput"),
        "rawOutput.alternative_names",
    )
    criterion_ids = validated_string_list(
        required(raw, "criterion_ids", "rawOutput"),
        "rawOutput.criterion_ids",
        unique=True,
    )
    criterion_names = validated_string_list(
        required(raw, "criterion_names", "rawOutput"),
        "rawOutput.criterion_names",
    )
    expert_keys = validated_string_list(
        required(raw, "expert_keys", "rawOutput"),
        "rawOutput.expert_keys",
        unique=True,
    )
    expert_labels = validated_string_list(
        required(raw, "expert_labels", "rawOutput"),
        "rawOutput.expert_labels",
    )

    alternative_count = len(alternative_ids)
    criterion_count = len(criterion_ids)
    expert_count = len(expert_keys)

    if len(alternative_names) != alternative_count:
        raise ValueError(
            "rawOutput.alternative_names length must match alternative_ids"
        )
    if len(criterion_names) != criterion_count:
        raise ValueError(
            "rawOutput.criterion_names length must match criterion_ids"
        )
    if len(expert_labels) != expert_count:
        raise ValueError(
            "rawOutput.expert_labels length must match expert_keys"
        )

    expert_ids = validated_optional_string_list(
        required(raw, "expert_ids", "rawOutput"),
        "rawOutput.expert_ids",
        expert_count,
    )
    expert_emails = validated_optional_string_list(
        required(raw, "expert_emails", "rawOutput"),
        "rawOutput.expert_emails",
        expert_count,
    )

    label_count = _positive_int(
        required(raw, "label_count", "rawOutput"),
        "rawOutput.label_count",
    )
    labels = validated_labels(
        required(raw, "labels", "rawOutput"),
        label_count=label_count,
    )

    collective_beta_matrix = validated_numeric_matrix(
        required(raw, "collective_beta_matrix", "rawOutput"),
        "rawOutput.collective_beta_matrix",
        alternative_count,
        criterion_count,
    )
    _validate_beta_matrix_ranges(
        collective_beta_matrix,
        label_count=label_count,
        field="rawOutput.collective_beta_matrix",
    )

    collective_matrix = validated_tuple_matrix(
        required(raw, "collective_matrix", "rawOutput"),
        betas=collective_beta_matrix,
        labels=labels,
        row_count=alternative_count,
        column_count=criterion_count,
    )

    collective_scores = validated_numeric_list(
        required(raw, "collective_scores", "rawOutput"),
        "rawOutput.collective_scores",
        alternative_count,
    )
    for index, beta in enumerate(collective_scores):
        _validate_beta_range(
            beta,
            label_count=label_count,
            field=f"rawOutput.collective_scores[{index}]",
        )

    collective_values = _collective_values(
        raw=raw,
        scores=collective_scores,
        labels=labels,
    )
    ranking = _ranking(raw, collective_scores)

    expert_aggregation = _aggregation_config(
        required(raw, "expert_aggregation", "rawOutput"),
        "rawOutput.expert_aggregation",
    )
    criteria_aggregation = _aggregation_config(
        required(raw, "criteria_aggregation", "rawOutput"),
        "rawOutput.criteria_aggregation",
    )

    expert_stage = _stage_evidence(
        raw_stage=required(
            raw,
            "expert_aggregation_evidence",
            "rawOutput",
        ),
        config=expert_aggregation,
        expected_argument_count=expert_count,
        field="rawOutput.expert_aggregation_evidence",
    )
    criteria_stage = _stage_evidence(
        raw_stage=required(
            raw,
            "criteria_aggregation_evidence",
            "rawOutput",
        ),
        config=criteria_aggregation,
        expected_argument_count=criterion_count,
        field="rawOutput.criteria_aggregation_evidence",
    )

    expert_weights = _top_level_importance_weights(
        raw=raw,
        key="expert_weights",
        stage=expert_stage,
        expected_length=expert_count,
    )
    criterion_weights = _top_level_importance_weights(
        raw=raw,
        key="criterion_weights",
        stage=criteria_stage,
        expected_length=criterion_count,
    )

    expert_traces = _expert_traces(
        raw=raw,
        stage=expert_stage,
        collective_beta_matrix=collective_beta_matrix,
        label_count=label_count,
    )
    criteria_traces = _criteria_traces(
        raw=raw,
        stage=criteria_stage,
        collective_beta_matrix=collective_beta_matrix,
        collective_scores=collective_scores,
        label_count=label_count,
    )

    return TwoTupleEvidence(
        source_phase=final_round["phase"],
        executed_rounds=len(rounds),
        alternative_ids=alternative_ids,
        alternative_names=alternative_names,
        criterion_ids=criterion_ids,
        criterion_names=criterion_names,
        expert_keys=expert_keys,
        expert_ids=expert_ids,
        expert_labels=expert_labels,
        expert_emails=expert_emails,
        labels=labels,
        label_count=label_count,
        collective_beta_matrix=collective_beta_matrix,
        collective_matrix=collective_matrix,
        collective_values=collective_values,
        collective_scores=collective_scores,
        ranking=ranking,
        expert_aggregation=expert_aggregation,
        criteria_aggregation=criteria_aggregation,
        expert_aggregation_evidence=expert_stage,
        criteria_aggregation_evidence=criteria_stage,
        expert_weights=expert_weights,
        criterion_weights=criterion_weights,
        expert_aggregation_traces=expert_traces,
        criteria_aggregation_traces=criteria_traces,
    )
