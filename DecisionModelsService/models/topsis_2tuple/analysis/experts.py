from __future__ import annotations

from typing import Any

from models.shared_expression_domains import resolve_linguistic_2tuple_value

from ..run import (
    calculate_closeness_coefficients,
    calculate_ideal_solutions,
    calculate_weighted_distances,
    rank_closeness_coefficients,
)
from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    EVIDENCE_TOLERANCE,
    availability,
    as_list,
    as_object,
    assert_close,
    effective_tie,
    finite_number,
    non_empty_string,
    tuple_fact,
)
from .evidence import TopsisEvidence


def _final_execution(context: dict[str, Any]) -> dict[str, Any]:
    rounds = as_list(context.get("rounds"), "context.rounds", non_empty=True)
    executed: list[tuple[int, dict[str, Any]]] = []
    for index, raw_round in enumerate(rounds):
        round_entry = as_object(raw_round, f"context.rounds[{index}]")
        phase = round_entry.get("phase")
        if isinstance(phase, bool) or not isinstance(phase, int):
            raise ValueError(f"context.rounds[{index}].phase must be an integer")
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


def _criterion_direction(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"benefit", "max"}:
        return "max"
    if normalized in {"cost", "min"}:
        return "min"
    raise ValueError(f"Unsupported criterion type: {value}")


def _validate_input_decision_space(
    *,
    execution_input: dict[str, Any],
    evidence: TopsisEvidence,
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
            "with executed TOPSIS evidence"
        )
    if len(criteria) != len(evidence.criterion_ids):
        raise ValueError(
            "execution.input.context.criteria length is inconsistent "
            "with executed TOPSIS evidence"
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
                "execution.input.context.alternatives order/ids are "
                "inconsistent with executed TOPSIS evidence"
            )
        if alternative_name != evidence.alternative_names[index]:
            raise ValueError(
                "execution.input.context.alternatives names are "
                "inconsistent with executed TOPSIS evidence"
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
        direction = _criterion_direction(criterion.get("type"))
        expression_domain = as_object(
            criterion.get("expressionDomain"),
            f"execution.input.context.criteria[{index}].expressionDomain",
        )
        if expression_domain.get("typeKey") != "linguistic2Tuple":
            raise ValueError(
                f"execution.input.context.criteria[{index}] must use "
                "linguistic2Tuple"
            )

        if criterion_id != evidence.criterion_ids[index]:
            raise ValueError(
                "execution.input.context.criteria order/ids are inconsistent "
                "with executed TOPSIS evidence"
            )
        if criterion_name != evidence.criterion_names[index]:
            raise ValueError(
                "execution.input.context.criteria names are inconsistent "
                "with executed TOPSIS evidence"
            )
        if direction != evidence.criterion_directions[index]:
            raise ValueError(
                "execution.input.context.criteria directions are inconsistent "
                "with executed TOPSIS evidence"
            )

        raw_labels = expression_domain.get("definition", {}).get("labels")
        labels = as_list(
            raw_labels,
            f"execution.input.context.criteria[{index}]"
            ".expressionDomain.definition.labels",
            non_empty=True,
        )
        if len(labels) != len(evidence.scale_labels[index]):
            raise ValueError(
                "execution input linguistic scale is inconsistent with "
                "executed TOPSIS evidence"
            )
        for label_index, raw_label in enumerate(labels):
            label = as_object(
                raw_label,
                f"execution.input.context.criteria[{index}]"
                f".expressionDomain.definition.labels[{label_index}]",
            )
            expected = evidence.scale_labels[index][label_index]
            if str(label.get("key") or "").strip() != expected["key"]:
                raise ValueError(
                    "execution input linguistic label keys are inconsistent "
                    "with executed TOPSIS evidence"
                )
            if str(label.get("label") or "").strip() != expected["label"]:
                raise ValueError(
                    "execution input linguistic labels are inconsistent "
                    "with executed TOPSIS evidence"
                )

        normalized_criteria.append(
            {
                "id": criterion_id,
                "name": criterion_name,
                "direction": direction,
                "expressionDomain": expression_domain,
            }
        )

    return normalized_criteria


def _normalized_input_weights(
    evaluations: list[Any],
) -> list[float]:
    weights: list[float] = []
    for index, raw_evaluation in enumerate(evaluations):
        evaluation = as_object(raw_evaluation, f"execution.input.evaluations[{index}]")
        weight = finite_number(
            evaluation.get("weight"),
            f"execution.input.evaluations[{index}].weight",
        )
        if weight < -EVIDENCE_TOLERANCE or weight > 1.0 + EVIDENCE_TOLERANCE:
            raise ValueError(
                f"execution.input.evaluations[{index}].weight must be between 0 and 1"
            )
        if weight < 0:
            weight = 0.0
        elif weight > 1:
            weight = 1.0
        weights.append(weight)

    total = sum(weights)
    if total <= EVIDENCE_TOLERANCE:
        raise ValueError(
            "execution.input.evaluations must contain at least one positive weight"
        )
    return [weight / total for weight in weights]


def _expert_matrices(
    *,
    context: dict[str, Any],
    evidence: TopsisEvidence,
) -> list[dict[str, Any]]:
    execution = _final_execution(context)
    execution_input = as_object(execution.get("input"), "execution.input")
    criteria = _validate_input_decision_space(
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
            "execution.input.evaluations length is inconsistent with "
            "rawOutput.expert_keys"
        )

    normalized_weights = _normalized_input_weights(evaluations)
    seen_keys: set[str] = set()
    experts: list[dict[str, Any]] = []

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
                "execution input evaluator order/identity is inconsistent "
                "with rawOutput.expert_keys"
            )
        assert_close(
            evidence.expert_weights[expert_index],
            normalized_weights[expert_index],
            f"rawOutput.expert_weights[{expert_index}]",
        )

        payload = as_object(
            evaluation.get("payload"),
            f"execution.input.evaluations[{expert_index}].payload",
        )
        unknown_alternative_ids = set(payload) - set(evidence.alternative_ids)
        if unknown_alternative_ids:
            raise ValueError(
                f"execution.input.evaluations[{expert_index}].payload "
                "contains unknown alternative rows"
            )

        beta_matrix: list[list[float]] = []
        tuple_matrix: list[list[dict[str, Any]]] = []
        for alternative_index, alternative_id in enumerate(evidence.alternative_ids):
            alternative_payload = as_object(
                payload.get(alternative_id),
                f"execution.input.evaluations[{expert_index}]"
                f".payload['{alternative_id}']",
            )
            unknown_criterion_ids = set(alternative_payload) - set(evidence.criterion_ids)
            if unknown_criterion_ids:
                raise ValueError(
                    f"execution.input.evaluations[{expert_index}]"
                    f".payload['{alternative_id}'] contains unknown criterion cells"
                )

            beta_row: list[float] = []
            tuple_row: list[dict[str, Any]] = []
            for criterion_index, criterion_id in enumerate(evidence.criterion_ids):
                field = (
                    f"execution.input.evaluations[{expert_index}]"
                    f".payload['{alternative_id}']['{criterion_id}']"
                )
                if criterion_id not in alternative_payload:
                    raise ValueError(f"{field} is required")
                raw_value = alternative_payload[criterion_id]
                resolved = resolve_linguistic_2tuple_value(
                    value=raw_value,
                    expression_domain=criteria[criterion_index]["expressionDomain"],
                    field=field,
                )
                beta = float(resolved["beta"])
                beta_row.append(beta)
                tuple_row.append(
                    tuple_fact(
                        raw_value,
                        beta=beta,
                        labels=evidence.scale_labels[criterion_index],
                        field=field,
                    )
                )

            beta_matrix.append(beta_row)
            tuple_matrix.append(tuple_row)

        experts.append(
            {
                "expertIndex": expert_index,
                "expertKey": expert_key,
                "expertId": (
                    str(expert.get("id")).strip()
                    if expert.get("id") is not None and str(expert.get("id")).strip()
                    else None
                ),
                "name": (
                    str(expert.get("name")).strip()
                    if expert.get("name") is not None and str(expert.get("name")).strip()
                    else None
                ),
                "email": (
                    str(expert.get("email")).strip()
                    if expert.get("email") is not None and str(expert.get("email")).strip()
                    else None
                ),
                "configuredWeight": evidence.expert_weights[expert_index],
                "betaMatrix": beta_matrix,
                "tupleMatrix": tuple_matrix,
            }
        )

    # Validate that the exact submitted matrices and executed expert weights
    # reproduce the stored collective beta matrix.
    for alternative_index in range(len(evidence.alternative_ids)):
        for criterion_index in range(len(evidence.criterion_ids)):
            aggregated = sum(
                expert["configuredWeight"]
                * expert["betaMatrix"][alternative_index][criterion_index]
                for expert in experts
            )
            assert_close(
                evidence.collective_beta_matrix[alternative_index][criterion_index],
                aggregated,
                "rawOutput.collective_beta_matrix"
                f"[{alternative_index}][{criterion_index}]",
            )

    return experts


def _orientation_adjusted_score(
    *,
    beta: float,
    direction: str,
    maximum_index: int,
) -> float:
    if maximum_index <= 0:
        return 0.5
    if direction == "max":
        return beta / maximum_index
    return (maximum_index - beta) / maximum_index


def _personal_result(
    *,
    evidence: TopsisEvidence,
    matrix: list[list[float]],
) -> dict[str, Any]:
    scales = [
        {
            "criterionId": evidence.criterion_ids[index],
            "labelCount": len(evidence.scale_labels[index]),
            "maximumIndex": len(evidence.scale_labels[index]) - 1,
            "labels": evidence.scale_labels[index],
        }
        for index in range(len(evidence.criterion_ids))
    ]
    ideals = calculate_ideal_solutions(
        collective_beta_matrix=matrix,
        criterion_directions=evidence.criterion_directions,
        criterion_scales=scales,
    )
    distances = calculate_weighted_distances(
        collective_beta_matrix=matrix,
        positive_ideal_beta=ideals["positive_ideal_beta"],
        negative_ideal_beta=ideals["negative_ideal_beta"],
        weights=evidence.criterion_weights,
    )
    closeness = calculate_closeness_coefficients(
        positive_distances=distances["positive_distances"],
        negative_distances=distances["negative_distances"],
    )
    ranking = rank_closeness_coefficients(closeness)
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(ranking, start=1)
    }
    collective_rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(evidence.ranking, start=1)
    }

    technical_ranking = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "originalIndex": index,
            "technicalRank": rank,
            "closeness": closeness[index],
            "positiveDistance": distances["positive_distances"][index],
            "negativeDistance": distances["negative_distances"][index],
            "collectiveTechnicalRank": collective_rank_by_index[index],
            "personalRankMinusCollectiveRank": (
                rank - collective_rank_by_index[index]
            ),
            "absoluteRankDifference": abs(
                rank - collective_rank_by_index[index]
            ),
        }
        for rank, index in enumerate(ranking, start=1)
    ]

    maximum = max(closeness)
    leading_group = [
        {
            "alternativeId": evidence.alternative_ids[index],
            "name": evidence.alternative_names[index],
            "originalIndex": index,
            "technicalRank": rank_by_index[index],
            "closeness": closeness[index],
        }
        for index in range(len(evidence.alternative_ids))
        if effective_tie(closeness[index], maximum)
    ]
    leading_group.sort(key=lambda item: item["technicalRank"])

    weighted_discrimination = sum(
        evidence.criterion_weights[index]
        * abs(
            ideals["positive_ideal_beta"][index]
            - ideals["negative_ideal_beta"][index]
        )
        for index in range(len(evidence.criterion_ids))
    )
    if len(evidence.alternative_ids) == 1:
        winner = availability(False, "single_alternative", alternative=None)
    elif weighted_discrimination <= ANALYTICAL_TIE_TOLERANCE:
        winner = availability(False, "no_discrimination", alternative=None)
    elif len(leading_group) != 1:
        winner = availability(False, "no_variation", alternative=None)
    else:
        winner = availability(True, alternative=dict(leading_group[0]))

    return {
        "technicalRanking": technical_ranking,
        "leadingGroup": leading_group,
        "winner": winner,
        "sameTechnicalRankingAsCollective": ranking == evidence.ranking,
        "meanAbsoluteRankDifferenceFromCollective": (
            sum(
                abs(rank_by_index[index] - collective_rank_by_index[index])
                for index in range(len(evidence.alternative_ids))
            )
            / len(evidence.alternative_ids)
        ),
        "positiveIdealBeta": list(ideals["positive_ideal_beta"]),
        "negativeIdealBeta": list(ideals["negative_ideal_beta"]),
    }


def _alignment(
    *,
    evidence: TopsisEvidence,
    expert: dict[str, Any],
) -> tuple[float, float, list[list[dict[str, Any]]]]:
    total = 0.0
    normalized_total = 0.0
    cells: list[list[dict[str, Any]]] = []

    for alternative_index in range(len(evidence.alternative_ids)):
        row: list[dict[str, Any]] = []
        for criterion_index in range(len(evidence.criterion_ids)):
            beta = expert["betaMatrix"][alternative_index][criterion_index]
            collective_beta = evidence.collective_beta_matrix[alternative_index][criterion_index]
            absolute_deviation = abs(beta - collective_beta)
            maximum_index = len(evidence.scale_labels[criterion_index]) - 1
            normalized_deviation = (
                absolute_deviation / maximum_index
                if maximum_index > 0
                else 0.0
            )
            criterion_weight = evidence.criterion_weights[criterion_index]
            total += criterion_weight * absolute_deviation
            normalized_total += criterion_weight * normalized_deviation

            row.append(
                {
                    "alternativeId": evidence.alternative_ids[alternative_index],
                    "alternativeName": evidence.alternative_names[alternative_index],
                    "alternativeIndex": alternative_index,
                    "criterionId": evidence.criterion_ids[criterion_index],
                    "criterionName": evidence.criterion_names[criterion_index],
                    "criterionIndex": criterion_index,
                    "beta": beta,
                    "tuple": expert["tupleMatrix"][alternative_index][criterion_index],
                    "collectiveBeta": collective_beta,
                    "absoluteDeviationFromCollective": absolute_deviation,
                    "scaleNormalizedAbsoluteDeviationFromCollective": normalized_deviation,
                    "orientationAdjustedFavorableScore": _orientation_adjusted_score(
                        beta=beta,
                        direction=evidence.criterion_directions[criterion_index],
                        maximum_index=maximum_index,
                    ),
                }
            )
        cells.append(row)

    alternative_count = len(evidence.alternative_ids)
    return (
        total / alternative_count,
        normalized_total / alternative_count,
        cells,
    )


def _extreme_evaluators(
    evaluator_items: list[dict[str, Any]],
    *,
    select: str,
) -> dict[str, Any]:
    if len(evaluator_items) == 1:
        return availability(
            False,
            "single_evaluator",
            distance=None,
            evaluators=[],
        )

    distances = [item["distanceToCollective"] for item in evaluator_items]
    if effective_tie(max(distances), min(distances)):
        return availability(
            False,
            "no_variation",
            distance=None,
            evaluators=[],
        )

    target = min(distances) if select == "min" else max(distances)
    selected = [
        item
        for item in evaluator_items
        if effective_tie(item["distanceToCollective"], target)
    ]
    return availability(
        True,
        distance=target,
        evaluators=[
            {
                "expertKey": item["expertKey"],
                "expertId": item["expertId"],
                "name": item["name"],
                "expertIndex": item["expertIndex"],
            }
            for item in selected
        ],
    )


def _extreme_group(
    items: list[dict[str, Any]],
    *,
    value_key: str,
    identity_keys: tuple[str, ...],
    singular_reason: str,
    select: str,
) -> dict[str, Any]:
    if len(items) == 1:
        return availability(False, singular_reason, value=None, items=[])

    values = [float(item[value_key]) for item in items]
    if effective_tie(max(values), min(values)):
        return availability(False, "no_variation", value=None, items=[])

    target = max(values) if select == "max" else min(values)
    selected = [item for item in items if effective_tie(float(item[value_key]), target)]
    return availability(
        True,
        value=target,
        items=[
            {key: item[key] for key in identity_keys}
            for item in selected
        ],
    )


def _disagreement(
    *,
    evidence: TopsisEvidence,
    experts: list[dict[str, Any]],
) -> dict[str, Any]:
    cells: list[dict[str, Any]] = []
    for alternative_index, alternative_id in enumerate(evidence.alternative_ids):
        for criterion_index, criterion_id in enumerate(evidence.criterion_ids):
            collective_beta = evidence.collective_beta_matrix[alternative_index][criterion_index]
            weighted_mad = sum(
                expert["configuredWeight"]
                * abs(expert["betaMatrix"][alternative_index][criterion_index] - collective_beta)
                for expert in experts
            )
            maximum_index = len(evidence.scale_labels[criterion_index]) - 1
            normalized = weighted_mad / maximum_index if maximum_index > 0 else 0.0
            cells.append(
                {
                    "alternativeId": alternative_id,
                    "alternativeName": evidence.alternative_names[alternative_index],
                    "alternativeIndex": alternative_index,
                    "criterionId": criterion_id,
                    "criterionName": evidence.criterion_names[criterion_index],
                    "criterionIndex": criterion_index,
                    "collectiveBeta": collective_beta,
                    "weightedMeanAbsoluteDeviation": weighted_mad,
                    "scaleNormalizedWeightedMeanAbsoluteDeviation": normalized,
                }
            )

    by_criterion_items: list[dict[str, Any]] = []
    for criterion_index, criterion_id in enumerate(evidence.criterion_ids):
        selected = [cell for cell in cells if cell["criterionIndex"] == criterion_index]
        by_criterion_items.append(
            {
                "criterionId": criterion_id,
                "name": evidence.criterion_names[criterion_index],
                "index": criterion_index,
                "meanWeightedMeanAbsoluteDeviation": sum(
                    cell["weightedMeanAbsoluteDeviation"] for cell in selected
                ) / len(selected),
                "meanScaleNormalizedWeightedMeanAbsoluteDeviation": sum(
                    cell["scaleNormalizedWeightedMeanAbsoluteDeviation"] for cell in selected
                ) / len(selected),
            }
        )

    by_alternative_items: list[dict[str, Any]] = []
    for alternative_index, alternative_id in enumerate(evidence.alternative_ids):
        selected = [cell for cell in cells if cell["alternativeIndex"] == alternative_index]
        by_alternative_items.append(
            {
                "alternativeId": alternative_id,
                "name": evidence.alternative_names[alternative_index],
                "index": alternative_index,
                "meanWeightedMeanAbsoluteDeviation": sum(
                    cell["weightedMeanAbsoluteDeviation"] for cell in selected
                ) / len(selected),
                "meanScaleNormalizedWeightedMeanAbsoluteDeviation": sum(
                    cell["scaleNormalizedWeightedMeanAbsoluteDeviation"] for cell in selected
                ) / len(selected),
            }
        )

    overall_raw = sum(cell["weightedMeanAbsoluteDeviation"] for cell in cells) / len(cells)
    overall_normalized = sum(
        cell["scaleNormalizedWeightedMeanAbsoluteDeviation"] for cell in cells
    ) / len(cells)

    return {
        "overallMeanWeightedMeanAbsoluteDeviation": overall_raw,
        "overallMeanScaleNormalizedWeightedMeanAbsoluteDeviation": overall_normalized,
        "cells": cells,
        "byCriterion": {
            "comparison": (
                availability(True)
                if len(by_criterion_items) > 1
                else availability(False, "single_criterion")
            ),
            "items": by_criterion_items,
            "mostDisagreement": _extreme_group(
                by_criterion_items,
                value_key="meanScaleNormalizedWeightedMeanAbsoluteDeviation",
                identity_keys=("criterionId", "name", "index"),
                singular_reason="single_criterion",
                select="max",
            ),
            "leastDisagreement": _extreme_group(
                by_criterion_items,
                value_key="meanScaleNormalizedWeightedMeanAbsoluteDeviation",
                identity_keys=("criterionId", "name", "index"),
                singular_reason="single_criterion",
                select="min",
            ),
        },
        "byAlternative": {
            "comparison": (
                availability(True)
                if len(by_alternative_items) > 1
                else availability(False, "single_alternative")
            ),
            "items": by_alternative_items,
            "mostDisagreement": _extreme_group(
                by_alternative_items,
                value_key="meanScaleNormalizedWeightedMeanAbsoluteDeviation",
                identity_keys=("alternativeId", "name", "index"),
                singular_reason="single_alternative",
                select="max",
            ),
            "leastDisagreement": _extreme_group(
                by_alternative_items,
                value_key="meanScaleNormalizedWeightedMeanAbsoluteDeviation",
                identity_keys=("alternativeId", "name", "index"),
                singular_reason="single_alternative",
                select="min",
            ),
        },
    }


def _equivalent_submissions(experts: list[dict[str, Any]]) -> bool:
    if len(experts) <= 1:
        return True
    reference = experts[0]["betaMatrix"]
    for expert in experts[1:]:
        for row_index, row in enumerate(expert["betaMatrix"]):
            for column_index, value in enumerate(row):
                if abs(value - reference[row_index][column_index]) > ANALYTICAL_TIE_TOLERANCE:
                    return False
    return True



def extract_expert_profiles(
    *,
    evidence: TopsisEvidence,
    context: dict[str, Any],
) -> list[dict[str, Any]]:
    """Return validated expert matrices reconstructed from executed input."""
    return _expert_matrices(context=context, evidence=evidence)

def build_evaluator_facts(
    evidence: TopsisEvidence,
    context: dict[str, Any],
) -> dict[str, Any]:
    experts = extract_expert_profiles(evidence=evidence, context=context)
    evaluator_items: list[dict[str, Any]] = []

    for expert in experts:
        distance, normalized_distance, cells = _alignment(
            evidence=evidence,
            expert=expert,
        )
        personal_result = _personal_result(
            evidence=evidence,
            matrix=expert["betaMatrix"],
        )
        evaluator_items.append(
            {
                "expertIndex": expert["expertIndex"],
                "expertKey": expert["expertKey"],
                "expertId": expert["expertId"],
                "name": expert["name"],
                "email": expert["email"],
                "configuredWeight": expert["configuredWeight"],
                "distanceToCollective": distance,
                "scaleNormalizedDistanceToCollective": normalized_distance,
                "cells": cells,
                "personalResult": personal_result,
            }
        )

    equivalent = _equivalent_submissions(experts)
    evaluator_count = len(evaluator_items)
    if evaluator_count == 1:
        comparison = availability(False, "single_evaluator")
    elif equivalent:
        comparison = availability(False, "no_variation")
    else:
        comparison = availability(True)

    return {
        "method": {
            "alignmentDistance": {
                "kind": "derived_diagnostic",
                "formula": "mean_i sum_j w_j * |beta_eij - beta_collective_ij|",
                "usesCriterionWeights": True,
                "usesEvaluatorWeight": False,
            },
            "scaleNormalizedAlignmentDistance": {
                "kind": "derived_diagnostic",
                "formula": "mean_i sum_j w_j * |beta_eij - beta_collective_ij| / maxIndex_j",
                "usesCriterionWeights": True,
                "usesEvaluatorWeight": False,
            },
            "cellDisagreement": {
                "kind": "derived_diagnostic",
                "formula": "sum_e lambda_e * |beta_eij - beta_collective_ij|",
                "usesEvaluatorWeights": True,
            },
            "personalRanking": {
                "kind": "derived_diagnostic",
                "method": "same_topsis_2tuple_on_single_evaluator_matrix",
                "usesCollectiveCriterionWeights": True,
            },
            "orientationAdjustedFavorableScore": {
                "kind": "derived_diagnostic",
                "benefitFormula": "beta / maxIndex",
                "costFormula": "(maxIndex - beta) / maxIndex",
                "isTopsisScore": False,
            },
        },
        "capabilities": {
            "analyzeEvaluatorProfiles": availability(True),
            "compareEvaluators": comparison,
            "analyzeEvaluatorDisagreement": (
                availability(True)
                if evaluator_count > 1
                else availability(False, "single_evaluator")
            ),
            "analyzePersonalRankings": availability(True),
        },
        "variation": {
            "equivalentSubmissions": equivalent,
            "hasEvaluatorVariation": (evaluator_count > 1 and not equivalent),
        },
        "comparison": comparison,
        "closestToCollective": _extreme_evaluators(evaluator_items, select="min"),
        "farthestFromCollective": _extreme_evaluators(evaluator_items, select="max"),
        "disagreement": _disagreement(evidence=evidence, experts=experts),
        "items": evaluator_items,
    }
