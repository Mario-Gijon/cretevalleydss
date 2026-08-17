from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

FLOAT_TOLERANCE = 1e-6


@dataclass(frozen=True)
class CriterionEvidence:
    criterion_id: str
    name: str


@dataclass(frozen=True)
class ExpertEvidence:
    expert_key: str
    name: str
    criterion_order: list[str]
    rank_by_criterion: dict[str, int]
    utility_by_criterion: dict[str, float]


@dataclass(frozen=True)
class MccEvidence:
    eps: float
    status: str
    objective: float | None
    original_weights_by_expert: dict[str, dict[str, float]]
    adjusted_weights_by_expert: dict[str, dict[str, float]]
    weights_by_criterion: dict[str, float]


@dataclass(frozen=True)
class PreferenceOrderEvidence:
    source_phase: int
    criteria: list[CriterionEvidence]
    experts: list[ExpertEvidence]
    collective_weights: dict[str, float]
    use_mcc: bool
    mcc: MccEvidence | None


def _as_object(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{field} must be an object")
    return value


def _as_list(
    value: Any,
    field: str,
    *,
    non_empty: bool = False,
) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")

    if non_empty and not value:
        raise ValueError(f"{field} must not be empty")

    return value


def _non_empty_string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")

    return value.strip()


def _finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be numeric")

    number = float(value)

    if not math.isfinite(number):
        raise ValueError(f"{field} must be finite")

    return number


def _assert_close(
    actual: float,
    expected: float,
    field: str,
) -> None:
    if not math.isclose(
        float(actual),
        float(expected),
        rel_tol=FLOAT_TOLERANCE,
        abs_tol=FLOAT_TOLERANCE,
    ):
        raise ValueError(
            f"{field} is inconsistent with executed evidence "
            f"(got {actual}, expected {expected})"
        )


def _model_key(
    execution: dict[str, Any],
) -> str | None:
    model_context = execution.get("modelContext")

    if isinstance(model_context, dict):
        value = model_context.get("apiModelKey")

        if isinstance(value, str) and value.strip():
            return value.strip()

    result = execution.get("result")

    if isinstance(result, dict):
        model_execution = result.get("modelExecution")

        if isinstance(model_execution, dict):
            value = model_execution.get("apiModelKey")

            if isinstance(value, str) and value.strip():
                return value.strip()

    return None


def _raw_output(
    execution: dict[str, Any],
) -> dict[str, Any]:
    result = _as_object(
        execution.get("result"),
        "execution.result",
    )

    candidates = [
        result.get("rawOutput"),
        (
            result.get("standardResult", {}).get("rawOutput")
            if isinstance(result.get("standardResult"), dict)
            else None
        ),
        (
            result.get("modelExecution", {}).get("rawOutput")
            if isinstance(result.get("modelExecution"), dict)
            else None
        ),
        (
            result.get("modelExecution", {})
            .get("data", {})
            .get("rawOutput")
            if isinstance(result.get("modelExecution"), dict)
            and isinstance(
                result.get("modelExecution", {}).get("data"),
                dict,
            )
            else None
        ),
        (
            result.get("data", {}).get("rawOutput")
            if isinstance(result.get("data"), dict)
            else None
        ),
    ]

    for candidate in candidates:
        if isinstance(candidate, dict):
            return candidate

    raise ValueError(
        "Preference-order execution result.rawOutput is required"
    )


def _looks_like_preference_order_execution(
    execution: dict[str, Any],
) -> bool:
    try:
        raw = _raw_output(execution)
    except ValueError:
        return False

    if not isinstance(
        raw.get("expertWeightsByExpert"),
        dict,
    ):
        return False

    execution_input = execution.get("input")

    if not isinstance(execution_input, dict):
        return False

    evaluations = execution_input.get("evaluations")

    if not isinstance(evaluations, list) or not evaluations:
        return False

    return all(
        isinstance(evaluation, dict)
        and isinstance(evaluation.get("payload"), dict)
        and isinstance(
            evaluation["payload"].get("criterionOrder"),
            list,
        )
        for evaluation in evaluations
    )


def _preference_order_round(
    context: dict[str, Any],
) -> tuple[int, dict[str, Any]]:
    rounds = _as_list(
        context.get("rounds"),
        "context.rounds",
        non_empty=True,
    )

    candidates: list[
        tuple[int, dict[str, Any]]
    ] = []

    for index, raw_round in enumerate(rounds):
        round_entry = _as_object(
            raw_round,
            f"context.rounds[{index}]",
        )

        phase = round_entry.get("phase")

        if isinstance(phase, bool) or not isinstance(phase, int):
            raise ValueError(
                f"context.rounds[{index}].phase must be an integer"
            )

        execution = _as_object(
            round_entry.get("execution"),
            f"context.rounds[{index}].execution",
        )

        key = _model_key(execution)

        if key == "preference_order_criteria_weights":
            candidates.append(
                (phase, execution)
            )

        elif (
            key is None
            and _looks_like_preference_order_execution(
                execution
            )
        ):
            candidates.append(
                (phase, execution)
            )

    if not candidates:
        raise ValueError(
            "No executed preference_order_criteria_weights round "
            "is available for Model Analysis"
        )

    return max(
        candidates,
        key=lambda item: item[0],
    )


def _criteria_from_execution(
    execution: dict[str, Any],
) -> list[CriterionEvidence]:
    execution_input = _as_object(
        execution.get("input"),
        "execution.input",
    )

    model_context = _as_object(
        execution_input.get("context"),
        "execution.input.context",
    )

    raw_criteria = _as_list(
        model_context.get("criteria"),
        "execution.input.context.criteria",
        non_empty=True,
    )

    criteria: list[CriterionEvidence] = []
    seen_ids: set[str] = set()

    for index, raw_criterion in enumerate(
        raw_criteria
    ):
        criterion = _as_object(
            raw_criterion,
            (
                "execution.input.context."
                f"criteria[{index}]"
            ),
        )

        criterion_id = _non_empty_string(
            criterion.get("id"),
            (
                "execution.input.context."
                f"criteria[{index}].id"
            ),
        )

        name = _non_empty_string(
            criterion.get("name"),
            (
                "execution.input.context."
                f"criteria[{index}].name"
            ),
        )

        if criterion_id in seen_ids:
            raise ValueError(
                "execution.input.context.criteria "
                "contains duplicate id "
                f"'{criterion_id}'"
            )

        seen_ids.add(criterion_id)

        criteria.append(
            CriterionEvidence(
                criterion_id=criterion_id,
                name=name,
            )
        )

    return criteria


def _semantic_expert_name(
    *,
    context: dict[str, Any],
    expert_id: str | None,
    expert_key: str,
) -> str | None:
    directory = context.get(
        "semanticDirectory"
    )

    if not isinstance(directory, dict):
        return None

    experts_by_id = directory.get(
        "expertsById"
    )

    if not isinstance(experts_by_id, dict):
        return None

    candidates = []

    if expert_id:
        candidates.append(
            experts_by_id.get(expert_id)
        )

    candidates.append(
        experts_by_id.get(expert_key)
    )

    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue

        for field in (
            "name",
            "fullName",
            "email",
        ):
            value = candidate.get(field)

            if (
                isinstance(value, str)
                and value.strip()
            ):
                return value.strip()

    return None


def _expert_key(
    expert: dict[str, Any],
    field: str,
) -> tuple[str, str | None]:
    email = expert.get("email")
    expert_id = expert.get("id")

    normalized_email = (
        email.strip()
        if (
            isinstance(email, str)
            and email.strip()
        )
        else None
    )

    normalized_id = (
        expert_id.strip()
        if (
            isinstance(expert_id, str)
            and expert_id.strip()
        )
        else None
    )

    key = normalized_email or normalized_id

    if key is None:
        raise ValueError(
            f"{field} must provide a "
            "non-empty email or id"
        )

    return key, normalized_id


def _expected_utility_by_criterion(
    criterion_order: list[str],
) -> dict[str, float]:
    n_criteria = len(criterion_order)

    denominator = (
        n_criteria
        * (n_criteria + 1)
        / 2.0
    )

    return {
        criterion_id: (
            n_criteria
            - position
            + 1
        ) / denominator
        for position, criterion_id
        in enumerate(
            criterion_order,
            start=1,
        )
    }


def _validated_weight_vector(
    value: Any,
    *,
    criterion_ids: list[str],
    field: str,
) -> dict[str, float]:
    vector = _as_object(
        value,
        field,
    )

    expected_ids = set(
        criterion_ids
    )

    if set(vector) != expected_ids:
        raise ValueError(
            f"{field} must contain exactly "
            "the current criterion ids"
        )

    normalized: dict[
        str,
        float,
    ] = {}

    total = 0.0

    for criterion_id in criterion_ids:
        weight = _finite_number(
            vector[criterion_id],
            f"{field}.{criterion_id}",
        )

        if (
            weight < -FLOAT_TOLERANCE
            or weight
            > 1.0 + FLOAT_TOLERANCE
        ):
            raise ValueError(
                f"{field}.{criterion_id} "
                "must be between 0 and 1"
            )

        normalized[
            criterion_id
        ] = weight

        total += weight

    _assert_close(
        total,
        1.0,
        field,
    )

    return normalized


def _experts_from_execution(
    *,
    context: dict[str, Any],
    execution: dict[str, Any],
    criteria: list[CriterionEvidence],
    raw: dict[str, Any],
) -> list[ExpertEvidence]:
    execution_input = _as_object(
        execution.get("input"),
        "execution.input",
    )

    evaluations = _as_list(
        execution_input.get("evaluations"),
        "execution.input.evaluations",
        non_empty=True,
    )

    criterion_ids = [
        criterion.criterion_id
        for criterion in criteria
    ]

    criterion_id_set = set(
        criterion_ids
    )

    raw_weights = _as_object(
        raw.get(
            "expertWeightsByExpert"
        ),
        (
            "rawOutput."
            "expertWeightsByExpert"
        ),
    )

    experts: list[
        ExpertEvidence
    ] = []

    seen_keys: set[str] = set()

    for index, raw_evaluation in enumerate(
        evaluations
    ):
        evaluation = _as_object(
            raw_evaluation,
            (
                "execution.input."
                f"evaluations[{index}]"
            ),
        )

        expert = _as_object(
            evaluation.get("expert"),
            (
                "execution.input."
                f"evaluations[{index}].expert"
            ),
        )

        expert_key, expert_id = _expert_key(
            expert,
            (
                "execution.input."
                f"evaluations[{index}].expert"
            ),
        )

        if expert_key in seen_keys:
            raise ValueError(
                "Duplicate executed "
                "evaluation for expert "
                f"'{expert_key}'"
            )

        seen_keys.add(
            expert_key
        )

        payload = _as_object(
            evaluation.get("payload"),
            (
                "execution.input."
                f"evaluations[{index}].payload"
            ),
        )

        if set(payload) != {
            "criterionOrder"
        }:
            raise ValueError(
                "execution.input."
                f"evaluations[{index}].payload "
                "must contain exactly "
                "criterionOrder"
            )

        raw_order = _as_list(
            payload.get(
                "criterionOrder"
            ),
            (
                "execution.input."
                f"evaluations[{index}].payload."
                "criterionOrder"
            ),
            non_empty=True,
        )

        criterion_order = [
            _non_empty_string(
                value,
                (
                    "execution.input."
                    f"evaluations[{index}].payload."
                    f"criterionOrder[{position}]"
                ),
            )
            for position, value
            in enumerate(raw_order)
        ]

        if (
            len(criterion_order)
            != len(criterion_ids)
        ):
            raise ValueError(
                f"Expert '{expert_key}' "
                "criterionOrder must contain "
                "every current criterion "
                "exactly once"
            )

        if (
            len(set(criterion_order))
            != len(criterion_order)
        ):
            raise ValueError(
                f"Expert '{expert_key}' "
                "criterionOrder contains "
                "duplicate criteria"
            )

        if (
            set(criterion_order)
            != criterion_id_set
        ):
            raise ValueError(
                f"Expert '{expert_key}' "
                "criterionOrder must contain "
                "exactly the current criteria"
            )

        if expert_key not in raw_weights:
            raise ValueError(
                "rawOutput."
                "expertWeightsByExpert "
                "is missing expert "
                f"'{expert_key}'"
            )

        stored_utility = (
            _validated_weight_vector(
                raw_weights[
                    expert_key
                ],
                criterion_ids=criterion_ids,
                field=(
                    "rawOutput."
                    "expertWeightsByExpert."
                    f"{expert_key}"
                ),
            )
        )

        expected_utility = (
            _expected_utility_by_criterion(
                criterion_order
            )
        )

        for criterion_id in criterion_ids:
            _assert_close(
                stored_utility[
                    criterion_id
                ],
                expected_utility[
                    criterion_id
                ],
                (
                    "rawOutput."
                    "expertWeightsByExpert."
                    f"{expert_key}."
                    f"{criterion_id}"
                ),
            )

        explicit_name = (
            expert.get("name")
        )

        name = (
            explicit_name.strip()
            if (
                isinstance(
                    explicit_name,
                    str,
                )
                and explicit_name.strip()
            )
            else (
                _semantic_expert_name(
                    context=context,
                    expert_id=expert_id,
                    expert_key=expert_key,
                )
                or expert_key
            )
        )

        rank_by_criterion = {
            criterion_id: position
            for position, criterion_id
            in enumerate(
                criterion_order,
                start=1,
            )
        }

        experts.append(
            ExpertEvidence(
                expert_key=expert_key,
                name=name,
                criterion_order=(
                    criterion_order
                ),
                rank_by_criterion=(
                    rank_by_criterion
                ),
                utility_by_criterion=(
                    stored_utility
                ),
            )
        )

    if set(raw_weights) != seen_keys:
        raise ValueError(
            "rawOutput."
            "expertWeightsByExpert must "
            "contain exactly the "
            "executed experts"
        )

    return experts


def _mcc_evidence(
    *,
    raw: dict[str, Any],
    criterion_ids: list[str],
    expert_keys: list[str],
    expert_weights_by_expert: dict[
        str,
        dict[str, float],
    ],
) -> MccEvidence:
    mcc = _as_object(
        raw.get("mcc"),
        "rawOutput.mcc",
    )

    original_source = _as_object(
        mcc.get(
            "originalWeightsByExpert"
        ),
        (
            "rawOutput.mcc."
            "originalWeightsByExpert"
        ),
    )

    adjusted_source = _as_object(
        mcc.get(
            "adjustedWeightsByExpert"
        ),
        (
            "rawOutput.mcc."
            "adjustedWeightsByExpert"
        ),
    )

    expected_experts = set(
        expert_keys
    )

    if (
        set(original_source)
        != expected_experts
    ):
        raise ValueError(
            "rawOutput.mcc."
            "originalWeightsByExpert must "
            "contain exactly the executed experts"
        )

    if (
        set(adjusted_source)
        != expected_experts
    ):
        raise ValueError(
            "rawOutput.mcc."
            "adjustedWeightsByExpert must "
            "contain exactly the executed experts"
        )

    original: dict[
        str,
        dict[str, float],
    ] = {}

    adjusted: dict[
        str,
        dict[str, float],
    ] = {}

    for expert_key in expert_keys:
        original[
            expert_key
        ] = _validated_weight_vector(
            original_source[
                expert_key
            ],
            criterion_ids=criterion_ids,
            field=(
                "rawOutput.mcc."
                "originalWeightsByExpert."
                f"{expert_key}"
            ),
        )

        adjusted[
            expert_key
        ] = _validated_weight_vector(
            adjusted_source[
                expert_key
            ],
            criterion_ids=criterion_ids,
            field=(
                "rawOutput.mcc."
                "adjustedWeightsByExpert."
                f"{expert_key}"
            ),
        )

        for criterion_id in criterion_ids:
            _assert_close(
                original[
                    expert_key
                ][criterion_id],
                expert_weights_by_expert[
                    expert_key
                ][criterion_id],
                (
                    "rawOutput.mcc."
                    "originalWeightsByExpert."
                    f"{expert_key}."
                    f"{criterion_id}"
                ),
            )

    collective = (
        _validated_weight_vector(
            mcc.get(
                "weightsByCriterion"
            ),
            criterion_ids=criterion_ids,
            field=(
                "rawOutput.mcc."
                "weightsByCriterion"
            ),
        )
    )

    eps = _finite_number(
        mcc.get("eps"),
        "rawOutput.mcc.eps",
    )

    if eps < 0:
        raise ValueError(
            "rawOutput.mcc.eps "
            "must be non-negative"
        )

    status = _non_empty_string(
        mcc.get("status"),
        "rawOutput.mcc.status",
    )

    objective_raw = mcc.get(
        "objective"
    )

    objective = (
        None
        if objective_raw is None
        else _finite_number(
            objective_raw,
            "rawOutput.mcc.objective",
        )
    )

    if (
        objective is not None
        and objective
        < -FLOAT_TOLERANCE
    ):
        raise ValueError(
            "rawOutput.mcc.objective "
            "must be non-negative"
        )

    return MccEvidence(
        eps=eps,
        status=status,
        objective=objective,
        original_weights_by_expert=(
            original
        ),
        adjusted_weights_by_expert=(
            adjusted
        ),
        weights_by_criterion=(
            collective
        ),
    )


def extract_preference_order_evidence(
    context: dict[str, Any],
) -> PreferenceOrderEvidence:
    """
    Extract and validate authoritative
    evidence for this model analysis.
    """

    if not isinstance(context, dict):
        raise ValueError(
            "Model issue analysis context "
            "must be an object"
        )

    (
        source_phase,
        execution,
    ) = _preference_order_round(
        context
    )

    criteria = _criteria_from_execution(
        execution
    )

    criterion_ids = [
        criterion.criterion_id
        for criterion in criteria
    ]

    raw = _raw_output(
        execution
    )

    experts = _experts_from_execution(
        context=context,
        execution=execution,
        criteria=criteria,
        raw=raw,
    )

    expert_keys = [
        expert.expert_key
        for expert in experts
    ]

    expert_weights = {
        expert.expert_key: (
            expert.utility_by_criterion
        )
        for expert in experts
    }

    use_mcc = raw.get(
        "useMcc"
    )

    if not isinstance(use_mcc, bool):
        raise ValueError(
            "rawOutput.useMcc "
            "must be boolean"
        )

    n_experts = raw.get(
        "nExperts"
    )

    if (
        isinstance(n_experts, bool)
        or not isinstance(
            n_experts,
            int,
        )
        or n_experts
        != len(experts)
    ):
        raise ValueError(
            "rawOutput.nExperts must equal "
            "the number of executed experts"
        )

    if use_mcc:
        if len(experts) < 2:
            raise ValueError(
                "MCC evidence requires "
                "at least two experts"
            )

        mcc = _mcc_evidence(
            raw=raw,
            criterion_ids=criterion_ids,
            expert_keys=expert_keys,
            expert_weights_by_expert=(
                expert_weights
            ),
        )

        collective_weights = dict(
            mcc.weights_by_criterion
        )

    else:
        if len(experts) != 1:
            raise ValueError(
                "A non-MCC preference-order "
                "execution must contain "
                "one expert"
            )

        if (
            "mcc" in raw
            and raw.get("mcc")
            is not None
        ):
            raise ValueError(
                "rawOutput.mcc must be "
                "absent for a non-MCC execution"
            )

        mcc = None

        collective_weights = dict(
            experts[
                0
            ].utility_by_criterion
        )

    return PreferenceOrderEvidence(
        source_phase=source_phase,
        criteria=criteria,
        experts=experts,
        collective_weights=(
            collective_weights
        ),
        use_mcc=use_mcc,
        mcc=mcc,
    )


__all__ = [
    "CriterionEvidence",
    "ExpertEvidence",
    "MccEvidence",
    "PreferenceOrderEvidence",
    "extract_preference_order_evidence",
]