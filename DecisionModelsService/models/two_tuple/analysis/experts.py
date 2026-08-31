from __future__ import annotations

from typing import Any

from models.shared_expression_domains import resolve_linguistic_2tuple_value

from ..aggregation.core import TwoTuple, delta_inverse
from ..aggregation.registry import aggregate
from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    EVIDENCE_TOLERANCE,
    as_list,
    as_object,
    assert_close,
    availability,
    effective_tie,
    finite_number,
    non_empty_string,
)
from .evidence import TwoTupleEvidence


def _final_execution(context: dict[str, Any]) -> dict[str, Any]:
    rounds = as_list(
        context.get("rounds"),
        "context.rounds",
        non_empty=True,
    )
    executed: list[tuple[int, dict[str, Any]]] = []

    for index, raw_round in enumerate(rounds):
        round_entry = as_object(
            raw_round,
            f"context.rounds[{index}]",
        )
        phase = round_entry.get("phase")
        if isinstance(phase, bool) or not isinstance(phase, int):
            raise ValueError(
                f"context.rounds[{index}].phase must be an integer"
            )
        execution = as_object(
            round_entry.get("execution"),
            f"context.rounds[{index}].execution",
        )
        executed.append((phase, execution))

    return max(executed, key=lambda item: item[0])[1]


def _expert_key(expert: dict[str, Any], index: int) -> str:
    for field in ("id", "email", "name"):
        value = expert.get(field)
        if value is None:
            continue
        normalized = str(value).strip()
        if normalized:
            return normalized
    return f"expert_{index + 1}"


def _expert_label(expert: dict[str, Any], index: int) -> str:
    for field in ("name", "email", "id"):
        value = expert.get(field)
        if value is None:
            continue
        normalized = str(value).strip()
        if normalized:
            return normalized
    return f"Expert {index + 1}"


def _optional_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _validate_decision_space(
    *,
    execution_input: dict[str, Any],
    evidence: TwoTupleEvidence,
) -> list[dict[str, Any]]:
    input_context = as_object(
        execution_input.get("context"),
        "execution.input.context",
    )
    alternatives = as_list(
        input_context.get("alternatives"),
        "execution.input.context.alternatives",
        non_empty=True,
    )
    criteria = as_list(
        input_context.get("criteria"),
        "execution.input.context.criteria",
        non_empty=True,
    )

    if len(alternatives) != len(evidence.alternative_ids):
        raise ValueError(
            "execution.input.context.alternatives length is inconsistent "
            "with executed 2-tuple evidence"
        )
    if len(criteria) != len(evidence.criterion_ids):
        raise ValueError(
            "execution.input.context.criteria length is inconsistent "
            "with executed 2-tuple evidence"
        )

    for index, raw_alternative in enumerate(alternatives):
        alternative = as_object(
            raw_alternative,
            f"execution.input.context.alternatives[{index}]",
        )
        alternative_id = non_empty_string(
            alternative.get("id"),
            f"execution.input.context.alternatives[{index}].id",
        )
        alternative_name = non_empty_string(
            alternative.get("name"),
            f"execution.input.context.alternatives[{index}].name",
        )
        if alternative_id != evidence.alternative_ids[index]:
            raise ValueError(
                "execution input alternative ids/order are inconsistent "
                "with executed 2-tuple evidence"
            )
        if alternative_name != evidence.alternative_names[index]:
            raise ValueError(
                "execution input alternative names are inconsistent "
                "with executed 2-tuple evidence"
            )

    normalized_criteria: list[dict[str, Any]] = []

    for index, raw_criterion in enumerate(criteria):
        criterion = as_object(
            raw_criterion,
            f"execution.input.context.criteria[{index}]",
        )
        criterion_id = non_empty_string(
            criterion.get("id"),
            f"execution.input.context.criteria[{index}].id",
        )
        criterion_name = non_empty_string(
            criterion.get("name"),
            f"execution.input.context.criteria[{index}].name",
        )
        expression_domain = as_object(
            criterion.get("expressionDomain"),
            (
                f"execution.input.context.criteria[{index}]"
                ".expressionDomain"
            ),
        )

        if expression_domain.get("typeKey") != "linguistic2Tuple":
            raise ValueError(
                f"execution.input.context.criteria[{index}] must use "
                "linguistic2Tuple"
            )
        if criterion_id != evidence.criterion_ids[index]:
            raise ValueError(
                "execution input criterion ids/order are inconsistent "
                "with executed 2-tuple evidence"
            )
        if criterion_name != evidence.criterion_names[index]:
            raise ValueError(
                "execution input criterion names are inconsistent "
                "with executed 2-tuple evidence"
            )

        raw_labels = as_list(
            as_object(
                expression_domain.get("definition"),
                (
                    f"execution.input.context.criteria[{index}]"
                    ".expressionDomain.definition"
                ),
            ).get("labels"),
            (
                f"execution.input.context.criteria[{index}]"
                ".expressionDomain.definition.labels"
            ),
            non_empty=True,
        )
        if len(raw_labels) != evidence.label_count:
            raise ValueError(
                "execution input linguistic scale is inconsistent "
                "with executed 2-tuple evidence"
            )

        for label_index, raw_label in enumerate(raw_labels):
            label = as_object(
                raw_label,
                (
                    f"execution.input.context.criteria[{index}]"
                    ".expressionDomain.definition.labels"
                    f"[{label_index}]"
                ),
            )
            expected = evidence.labels[label_index]
            if str(label.get("key") or "").strip() != expected["key"]:
                raise ValueError(
                    "execution input linguistic label keys are inconsistent "
                    "with executed 2-tuple evidence"
                )
            if str(label.get("label") or "").strip() != expected["label"]:
                raise ValueError(
                    "execution input linguistic labels are inconsistent "
                    "with executed 2-tuple evidence"
                )

        normalized_criteria.append(
            {
                "id": criterion_id,
                "name": criterion_name,
                "expressionDomain": expression_domain,
            }
        )

    return normalized_criteria


def _importance_weights(
    *,
    evaluations: list[Any],
    evidence: TwoTupleEvidence,
) -> list[float] | None:
    if evidence.expert_weights is None:
        return None

    raw_weights: list[float] = []
    for index, raw_evaluation in enumerate(evaluations):
        evaluation = as_object(
            raw_evaluation,
            f"execution.input.evaluations[{index}]",
        )
        value = finite_number(
            evaluation.get("weight"),
            f"execution.input.evaluations[{index}].weight",
        )
        if value < -EVIDENCE_TOLERANCE:
            raise ValueError(
                f"execution.input.evaluations[{index}].weight "
                "must be non-negative"
            )
        raw_weights.append(max(value, 0.0))

    total = sum(raw_weights)
    if total <= EVIDENCE_TOLERANCE:
        raise ValueError(
            "execution input expert weights must contain "
            "at least one positive value"
        )

    normalized = [value / total for value in raw_weights]
    for index, value in enumerate(normalized):
        assert_close(
            value,
            evidence.expert_weights[index],
            f"execution.input.evaluations[{index}].normalizedWeight",
        )
    return normalized


def _evaluation_matrix(
    *,
    raw_evaluation: dict[str, Any],
    expert_index: int,
    criteria: list[dict[str, Any]],
    evidence: TwoTupleEvidence,
) -> tuple[list[list[TwoTuple]], list[list[float]]]:
    payload = as_object(
        raw_evaluation.get("payload"),
        f"execution.input.evaluations[{expert_index}].payload",
    )

    matrix: list[list[TwoTuple]] = []
    beta_matrix: list[list[float]] = []

    for alternative_index, alternative_id in enumerate(
        evidence.alternative_ids
    ):
        row_payload = as_object(
            payload.get(alternative_id),
            (
                f"execution.input.evaluations[{expert_index}]"
                f".payload['{alternative_id}']"
            ),
        )
        tuple_row: list[TwoTuple] = []
        beta_row: list[float] = []

        for criterion_index, criterion in enumerate(criteria):
            criterion_id = evidence.criterion_ids[criterion_index]
            field = (
                f"execution.input.evaluations[{expert_index}]"
                f".payload['{alternative_id}']['{criterion_id}']"
            )
            if criterion_id not in row_payload:
                raise ValueError(f"{field} is required")

            resolved = resolve_linguistic_2tuple_value(
                value=row_payload[criterion_id],
                expression_domain=criterion["expressionDomain"],
                field=field,
            )
            tuple_value = TwoTuple(
                label_index=resolved["labelIndex"],
                alpha=resolved["alpha"],
            )
            beta = delta_inverse(
                tuple_value,
                label_count=evidence.label_count,
            )

            tuple_row.append(tuple_value)
            beta_row.append(beta)

            expected_beta = evidence.expert_aggregation_traces[
                alternative_index
            ][criterion_index]["input_betas"][expert_index]
            assert_close(
                beta,
                expected_beta,
                f"{field} beta",
            )

        matrix.append(tuple_row)
        beta_matrix.append(beta_row)

    return matrix, beta_matrix


def extract_expert_profiles(
    *,
    evidence: TwoTupleEvidence,
    context: dict[str, Any],
) -> list[dict[str, Any]]:
    execution = _final_execution(context)
    execution_input = as_object(
        execution.get("input"),
        "execution.input",
    )
    criteria = _validate_decision_space(
        execution_input=execution_input,
        evidence=evidence,
    )
    evaluations = as_list(
        execution_input.get("evaluations"),
        "execution.input.evaluations",
        non_empty=True,
    )

    if len(evaluations) != len(evidence.expert_keys):
        raise ValueError(
            "execution.input.evaluations length is inconsistent "
            "with rawOutput.expert_keys"
        )

    importance_weights = _importance_weights(
        evaluations=evaluations,
        evidence=evidence,
    )

    seen_keys: set[str] = set()
    profiles: list[dict[str, Any]] = []

    for expert_index, raw_evaluation in enumerate(evaluations):
        evaluation = as_object(
            raw_evaluation,
            f"execution.input.evaluations[{expert_index}]",
        )
        expert = as_object(
            evaluation.get("expert"),
            f"execution.input.evaluations[{expert_index}].expert",
        )

        expert_key = _expert_key(expert, expert_index)
        if expert_key in seen_keys:
            expert_key = f"{expert_key}_{expert_index + 1}"
        seen_keys.add(expert_key)

        if expert_key != evidence.expert_keys[expert_index]:
            raise ValueError(
                "execution input expert keys/order are inconsistent "
                "with executed 2-tuple evidence"
            )

        expert_id = _optional_text(expert.get("id"))
        expert_email = _optional_text(expert.get("email"))
        expert_label = _expert_label(expert, expert_index)

        if expert_id != evidence.expert_ids[expert_index]:
            raise ValueError(
                "execution input expert ids are inconsistent "
                "with executed 2-tuple evidence"
            )
        if expert_email != evidence.expert_emails[expert_index]:
            raise ValueError(
                "execution input expert emails are inconsistent "
                "with executed 2-tuple evidence"
            )
        if expert_label != evidence.expert_labels[expert_index]:
            raise ValueError(
                "execution input expert labels are inconsistent "
                "with executed 2-tuple evidence"
            )

        matrix, beta_matrix = _evaluation_matrix(
            raw_evaluation=evaluation,
            expert_index=expert_index,
            criteria=criteria,
            evidence=evidence,
        )

        profiles.append(
            {
                "expertIndex": expert_index,
                "expertKey": expert_key,
                "expertId": expert_id,
                "expertEmail": expert_email,
                "expertLabel": expert_label,
                "importanceWeight": (
                    importance_weights[expert_index]
                    if importance_weights is not None
                    else None
                ),
                "matrix": matrix,
                "betaMatrix": beta_matrix,
            }
        )

    return profiles


def _criteria_weights_for_aggregation(
    evidence: TwoTupleEvidence,
) -> list[float] | None:
    return (
        list(evidence.criterion_weights)
        if evidence.criterion_weights is not None
        else None
    )


def _personal_result(
    *,
    evidence: TwoTupleEvidence,
    profile: dict[str, Any],
) -> dict[str, Any]:
    criteria_method = evidence.criteria_aggregation["method"]
    criteria_options = evidence.criteria_aggregation["options"]
    criterion_weights = _criteria_weights_for_aggregation(evidence)

    values: list[TwoTuple] = []
    betas: list[float] = []

    for row in profile["matrix"]:
        result = aggregate(
            criteria_method,
            row,
            label_count=evidence.label_count,
            weights=criterion_weights,
            options=criteria_options,
        )
        values.append(result)
        betas.append(
            delta_inverse(
                result,
                label_count=evidence.label_count,
            )
        )

    ranking = sorted(
        range(len(betas)),
        key=lambda index: (-betas[index], index),
    )
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(ranking, start=1)
    }
    maximum_beta = max(betas)
    leading_group = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "alternativeIndex": index,
            "technicalRank": rank_by_index[index],
            "beta": betas[index],
        }
        for index in range(len(betas))
        if effective_tie(betas[index], maximum_beta)
    ]
    leading_group.sort(key=lambda item: item["technicalRank"])

    return {
        "technicalRankingIndexes": ranking,
        "technicalRanking": [
            {
                "alternativeId": evidence.alternative_ids[index],
                "name": evidence.alternative_names[index],
                "alternativeIndex": index,
                "technicalRank": rank,
                "beta": betas[index],
                "tuple": {
                    "labelIndex": values[index].label_index,
                    "labelKey": evidence.labels[
                        values[index].label_index
                    ]["key"],
                    "label": evidence.labels[
                        values[index].label_index
                    ]["label"],
                    "alpha": values[index].alpha,
                },
            }
            for rank, index in enumerate(ranking, start=1)
        ],
        "leadingGroup": leading_group,
        "finalBetas": betas,
    }


def _ranking_alignment(
    *,
    evidence: TwoTupleEvidence,
    personal: dict[str, Any],
) -> dict[str, Any]:
    collective_rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            evidence.ranking,
            start=1,
        )
    }
    personal_rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            personal["technicalRankingIndexes"],
            start=1,
        )
    }

    alternatives: list[dict[str, Any]] = []
    total_absolute_rank_difference = 0.0

    for index, alternative_id in enumerate(evidence.alternative_ids):
        collective_rank = collective_rank_by_index[index]
        personal_rank = personal_rank_by_index[index]
        delta = personal_rank - collective_rank
        absolute_delta = abs(delta)
        total_absolute_rank_difference += absolute_delta

        alternatives.append(
            {
                "alternativeId": alternative_id,
                "name": evidence.alternative_names[index],
                "alternativeIndex": index,
                "collectiveTechnicalRank": collective_rank,
                "personalTechnicalRank": personal_rank,
                "personalRankMinusCollectiveRank": delta,
                "absoluteRankDifference": absolute_delta,
                "collectiveBeta": evidence.collective_scores[index],
                "personalBeta": personal["finalBetas"][index],
                "personalBetaMinusCollectiveBeta": (
                    personal["finalBetas"][index]
                    - evidence.collective_scores[index]
                ),
            }
        )

    collective_leaders = {
        evidence.alternative_ids[index]
        for index in range(len(evidence.alternative_ids))
        if effective_tie(
            evidence.collective_scores[index],
            max(evidence.collective_scores),
        )
    }
    personal_leaders = {
        item["alternativeId"]
        for item in personal["leadingGroup"]
    }

    return {
        "technicalRankingMatchesCollective": (
            personal["technicalRankingIndexes"] == evidence.ranking
        ),
        "semanticLeadingGroupMatchesCollective": (
            personal_leaders == collective_leaders
        ),
        "totalAbsoluteRankDifference": total_absolute_rank_difference,
        "meanAbsoluteRankDifference": (
            total_absolute_rank_difference
            / len(evidence.alternative_ids)
        ),
        "maxAbsoluteRankDifference": max(
            item["absoluteRankDifference"]
            for item in alternatives
        ),
        "alternatives": alternatives,
    }


def _profile_distance(
    *,
    evidence: TwoTupleEvidence,
    beta_matrix: list[list[float]],
) -> dict[str, float]:
    absolute_differences = [
        abs(
            beta_matrix[alternative_index][criterion_index]
            - evidence.collective_beta_matrix[
                alternative_index
            ][criterion_index]
        )
        for alternative_index in range(len(evidence.alternative_ids))
        for criterion_index in range(len(evidence.criterion_ids))
    ]

    return {
        "meanAbsoluteBetaDistance": (
            sum(absolute_differences)
            / len(absolute_differences)
        ),
        "maxAbsoluteBetaDistance": max(absolute_differences),
    }


def _cell_disagreement(
    *,
    evidence: TwoTupleEvidence,
    profiles: list[dict[str, Any]],
) -> dict[str, Any]:
    if len(profiles) == 1:
        return {
            "availability": availability(False, "single_evaluator"),
            "metric": "mean_absolute_beta_distance_to_collective",
            "weighting": "not_applicable",
            "items": [],
        }

    use_importance_weights = evidence.expert_weights is not None
    items: list[dict[str, Any]] = []

    for alternative_index, alternative_id in enumerate(
        evidence.alternative_ids
    ):
        for criterion_index, criterion_id in enumerate(
            evidence.criterion_ids
        ):
            collective_beta = evidence.collective_beta_matrix[
                alternative_index
            ][criterion_index]
            distances = [
                abs(
                    profile["betaMatrix"][
                        alternative_index
                    ][criterion_index]
                    - collective_beta
                )
                for profile in profiles
            ]

            if use_importance_weights:
                disagreement = sum(
                    evidence.expert_weights[index] * distances[index]
                    for index in range(len(profiles))
                )
                weighting = "expert_importance_weights"
            else:
                disagreement = sum(distances) / len(distances)
                weighting = "equal_evaluators"

            items.append(
                {
                    "alternativeId": alternative_id,
                    "alternativeName": evidence.alternative_names[
                        alternative_index
                    ],
                    "alternativeIndex": alternative_index,
                    "criterionId": criterion_id,
                    "criterionName": evidence.criterion_names[
                        criterion_index
                    ],
                    "criterionIndex": criterion_index,
                    "collectiveBeta": collective_beta,
                    "meanAbsoluteBetaDistanceToCollective": disagreement,
                    "evaluatorAbsoluteDistances": [
                        {
                            "expertKey": profile["expertKey"],
                            "expertLabel": profile["expertLabel"],
                            "absoluteBetaDistance": distances[index],
                        }
                        for index, profile in enumerate(profiles)
                    ],
                }
            )

    maximum = max(
        item["meanAbsoluteBetaDistanceToCollective"]
        for item in items
    )
    strongest = [
        dict(item)
        for item in items
        if effective_tie(
            item["meanAbsoluteBetaDistanceToCollective"],
            maximum,
        )
    ]

    return {
        "availability": availability(True),
        "metric": "mean_absolute_beta_distance_to_collective",
        "weighting": weighting,
        "items": items,
        "strongestDisagreement": {
            "value": maximum,
            "items": strongest,
        },
    }


def _distance_extreme(
    evaluators: list[dict[str, Any]],
    *,
    select: str,
) -> dict[str, Any]:
    if len(evaluators) == 1:
        return availability(
            False,
            "single_evaluator",
            value=None,
            evaluators=[],
        )

    values = [
        evaluator["distanceToCollective"]["meanAbsoluteBetaDistance"]
        for evaluator in evaluators
    ]
    maximum = max(values)
    minimum = min(values)

    if effective_tie(maximum, minimum):
        return availability(
            False,
            "no_variation",
            value=None,
            evaluators=[],
        )

    target = minimum if select == "min" else maximum
    selected = [
        evaluator
        for evaluator in evaluators
        if effective_tie(
            evaluator["distanceToCollective"][
                "meanAbsoluteBetaDistance"
            ],
            target,
        )
    ]

    return availability(
        True,
        value=target,
        evaluators=[
            {
                "expertKey": evaluator["expertKey"],
                "expertId": evaluator["expertId"],
                "expertLabel": evaluator["expertLabel"],
                "expertEmail": evaluator["expertEmail"],
                "expertIndex": evaluator["expertIndex"],
            }
            for evaluator in selected
        ],
    )


def build_evaluator_facts(
    evidence: TwoTupleEvidence,
    context: dict[str, Any],
) -> dict[str, Any]:
    profiles = extract_expert_profiles(
        evidence=evidence,
        context=context,
    )

    evaluators: list[dict[str, Any]] = []
    for profile in profiles:
        personal = _personal_result(
            evidence=evidence,
            profile=profile,
        )
        evaluators.append(
            {
                "expertIndex": profile["expertIndex"],
                "expertKey": profile["expertKey"],
                "expertId": profile["expertId"],
                "expertLabel": profile["expertLabel"],
                "expertEmail": profile["expertEmail"],
                "importanceWeight": profile["importanceWeight"],
                "distanceToCollective": _profile_distance(
                    evidence=evidence,
                    beta_matrix=profile["betaMatrix"],
                ),
                "personalResult": personal,
                "alignmentWithCollective": _ranking_alignment(
                    evidence=evidence,
                    personal=personal,
                ),
            }
        )

    comparison = (
        availability(True)
        if len(evaluators) > 1
        else availability(False, "single_evaluator")
    )

    return {
        "method": {
            "profileDistanceMetric": "mean_absolute_beta_distance",
            "profileDistanceWeighting": "equal_cells",
            "cellDisagreementMetric": (
                "mean_absolute_beta_distance_to_collective"
            ),
            "personalRanking": (
                "same_criteria_aggregation_as_executed_model"
            ),
            "diagnosticNature": "descriptive",
        },
        "capabilities": {
            "compareEvaluators": comparison,
            "analyzeCellDisagreement": comparison,
            "comparePersonalAndCollectiveRanking": (
                availability(True)
                if len(evidence.alternative_ids) > 1
                else availability(False, "single_alternative")
            ),
        },
        "items": evaluators,
        "closestToCollective": _distance_extreme(
            evaluators,
            select="min",
        ),
        "farthestFromCollective": _distance_extreme(
            evaluators,
            select="max",
        ),
        "cellDisagreement": _cell_disagreement(
            evidence=evidence,
            profiles=profiles,
        ),
    }


__all__ = [
    "build_evaluator_facts",
    "extract_expert_profiles",
]
