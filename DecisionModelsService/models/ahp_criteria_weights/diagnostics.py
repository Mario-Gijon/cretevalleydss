"""Optional, read-only consistency diagnostics for one AHP expert matrix."""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from .run import (
    CONSISTENCY_REVIEW_THRESHOLD,
    SAATY_SCALE_VALUES,
    SCALE_TOLERANCE,
    _build_matrix,
    _calculate_consistency_metrics,
    _non_empty_string,
    _normalize_criteria,
    _principal_eigenvector,
    _resolve_expert_key,
)


TRIAD_DISCREPANCY_TOLERANCE = 1e-12
MAX_REPORTED_TRIADS = 5
MAX_TRIADS_FOR_RECOMMENDATIONS = 3
MAX_RECOMMENDATIONS = 5
MIN_CR_IMPROVEMENT = 1e-12


def _comparison_key(first_id: str, second_id: str) -> frozenset[str]:
    return frozenset((first_id, second_id))


def _index_stored_comparisons(evaluation: dict[str, Any]) -> dict[frozenset[str], dict[str, Any]]:
    comparisons = evaluation.get("payload", {}).get("comparisons", [])
    stored_by_pair: dict[frozenset[str], dict[str, Any]] = {}
    for comparison in comparisons:
        criterion_id = _non_empty_string(comparison.get("criterionId"))
        compared_criterion_id = _non_empty_string(comparison.get("comparedCriterionId"))
        stored_by_pair[_comparison_key(criterion_id, compared_criterion_id)] = {
            "criterionId": criterion_id,
            "comparedCriterionId": compared_criterion_id,
            "value": float(comparison["value"]),
        }
    return stored_by_pair


def _build_triad_diagnostics(
    *,
    matrix: np.ndarray,
    criteria: list[dict[str, str]],
    stored_by_pair: dict[frozenset[str], dict[str, Any]],
) -> list[dict[str, Any]]:
    triads: list[dict[str, Any]] = []

    for first_index in range(len(criteria) - 2):
        for second_index in range(first_index + 1, len(criteria) - 1):
            for third_index in range(second_index + 1, len(criteria)):
                first = criteria[first_index]
                second = criteria[second_index]
                third = criteria[third_index]
                first_to_second = float(matrix[first_index, second_index])
                second_to_third = float(matrix[second_index, third_index])
                first_to_third = float(matrix[first_index, third_index])
                implied_ratio = first_to_second * second_to_third
                cycle_ratio = implied_ratio / first_to_third
                discrepancy = abs(math.log(cycle_ratio))

                # Saaty values are represented as binary floats. Treat only
                # residuals below numerical noise as a perfect cycle; this
                # does not affect the CR calculation or the stored judgments.
                if discrepancy <= TRIAD_DISCREPANCY_TOLERANCE:
                    continue

                directed_comparisons = [
                    {
                        "fromCriterionId": first["id"],
                        "toCriterionId": second["id"],
                        "value": first_to_second,
                    },
                    {
                        "fromCriterionId": second["id"],
                        "toCriterionId": third["id"],
                        "value": second_to_third,
                    },
                    {
                        "fromCriterionId": first["id"],
                        "toCriterionId": third["id"],
                        "value": first_to_third,
                    },
                ]
                stored_comparisons = [
                    stored_by_pair[_comparison_key(edge["fromCriterionId"], edge["toCriterionId"])]
                    for edge in directed_comparisons
                ]
                triads.append(
                    {
                        "criterionIndices": (first_index, second_index, third_index),
                        "criteria": [
                            {"id": first["id"], "name": first["name"]},
                            {"id": second["id"], "name": second["name"]},
                            {"id": third["id"], "name": third["name"]},
                        ],
                        "comparisons": [
                            {
                                **edge,
                                "storedComparison": stored,
                            }
                            for edge, stored in zip(directed_comparisons, stored_comparisons)
                        ],
                        "impliedRatio": implied_ratio,
                        "directRatio": first_to_third,
                        "cycleRatio": cycle_ratio,
                        "multiplicativeDiscrepancy": discrepancy,
                        # A cycle is a local review signal, not an additive
                        # decomposition of global CR or proof that one edge is wrong.
                        "candidateComparisons": stored_comparisons,
                    }
                )

    triads.sort(
        key=lambda triad: (
            -triad["multiplicativeDiscrepancy"],
            *triad["criterionIndices"],
        )
    )
    return triads


def _build_counterfactual_recommendations(
    *,
    matrix: np.ndarray,
    criteria: list[dict[str, str]],
    stored_by_pair: dict[frozenset[str], dict[str, Any]],
    triads: list[dict[str, Any]],
    original_cr: float | None,
) -> list[dict[str, Any]]:
    if original_cr is None:
        return []

    criterion_index = {criterion["id"]: index for index, criterion in enumerate(criteria)}
    candidate_edges: dict[frozenset[str], set[tuple[str, str, str]]] = {}
    for triad in triads[:MAX_TRIADS_FOR_RECOMMENDATIONS]:
        triad_ids = tuple(criterion["id"] for criterion in triad["criteria"])
        for stored in triad["candidateComparisons"]:
            key = _comparison_key(stored["criterionId"], stored["comparedCriterionId"])
            candidate_edges.setdefault(key, set()).add(triad_ids)

    recommendations: list[dict[str, Any]] = []
    for pair_key in sorted(
        candidate_edges,
        key=lambda pair: tuple(sorted(criterion_index[criterion_id] for criterion_id in pair)),
    ):
        stored = stored_by_pair[pair_key]
        first_id = stored["criterionId"]
        second_id = stored["comparedCriterionId"]
        first_index = criterion_index[first_id]
        second_index = criterion_index[second_id]
        current_value = stored["value"]
        involved_triads = sorted(
            candidate_edges[pair_key],
            key=lambda ids: tuple(criterion_index[criterion_id] for criterion_id in ids),
        )

        for suggested_value in SAATY_SCALE_VALUES:
            if math.isclose(
                current_value,
                suggested_value,
                rel_tol=0,
                abs_tol=SCALE_TOLERANCE,
            ):
                continue

            counterfactual_matrix = matrix.copy()
            counterfactual_matrix[first_index, second_index] = suggested_value
            counterfactual_matrix[second_index, first_index] = 1.0 / suggested_value
            counterfactual_lambda_max, _ = _principal_eigenvector(counterfactual_matrix)
            counterfactual_metrics = _calculate_consistency_metrics(
                lambda_max=counterfactual_lambda_max,
                criterion_count=len(criteria),
            )
            counterfactual_cr = counterfactual_metrics["consistencyRatio"]
            improvement = original_cr - counterfactual_cr
            if improvement <= MIN_CR_IMPROVEMENT:
                continue

            recommendations.append(
                {
                    "comparison": {
                        "criterionId": first_id,
                        "comparedCriterionId": second_id,
                    },
                    "currentValue": current_value,
                    "suggestedValue": suggested_value,
                    "originalCR": original_cr,
                    "counterfactualCR": counterfactual_cr,
                    "improvement": improvement,
                    "supportedTriads": [list(triad_ids) for triad_ids in involved_triads],
                }
            )

    recommendations.sort(
        key=lambda item: (
            -item["improvement"],
            item["counterfactualCR"],
            criterion_index[item["comparison"]["criterionId"]],
            criterion_index[item["comparison"]["comparedCriterionId"]],
            item["suggestedValue"],
        )
    )
    return recommendations[:MAX_RECOMMENDATIONS]


def diagnose_ahp_consistency(*, context: Any, evaluation: Any) -> dict[str, Any]:
    """Analyze one complete expert AHP matrix without changing it or applying MCC.

    The input uses the same ``context`` and single-evaluation shape as the final
    AHP runner. Incomplete or invalid matrices raise ``ValueError`` through the
    existing AHP validators instead of returning a partial CR.
    """

    criteria = _normalize_criteria(context)
    expert_key, expert_name = _resolve_expert_key(evaluation, 0)
    matrix, completed = _build_matrix(
        evaluation=evaluation,
        criteria=criteria,
        evaluation_index=0,
    )
    lambda_max, _ = _principal_eigenvector(matrix)
    consistency = _calculate_consistency_metrics(
        lambda_max=lambda_max,
        criterion_count=len(criteria),
    )
    stored_by_pair = _index_stored_comparisons(evaluation)
    triads = _build_triad_diagnostics(
        matrix=matrix,
        criteria=criteria,
        stored_by_pair=stored_by_pair,
    )
    recommendations = _build_counterfactual_recommendations(
        matrix=matrix,
        criteria=criteria,
        stored_by_pair=stored_by_pair,
        triads=triads,
        original_cr=consistency["consistencyRatio"],
    )
    candidate_comparisons: list[dict[str, Any]] = []
    seen_candidate_pairs: set[frozenset[str]] = set()
    for triad in triads[:MAX_REPORTED_TRIADS]:
        for comparison in triad["candidateComparisons"]:
            pair_key = _comparison_key(
                comparison["criterionId"],
                comparison["comparedCriterionId"],
            )
            if pair_key not in seen_candidate_pairs:
                seen_candidate_pairs.add(pair_key)
                candidate_comparisons.append(comparison)

    return {
        "expertKey": expert_key,
        "expertName": expert_name,
        "criterionCount": len(criteria),
        "completedComparisons": completed,
        "requiredComparisons": completed,
        "lambdaMax": lambda_max,
        **consistency,
        "consistencyThreshold": CONSISTENCY_REVIEW_THRESHOLD,
        "triads": [
            {
                key: value
                for key, value in triad.items()
                if key != "criterionIndices"
            }
            for triad in triads[:MAX_REPORTED_TRIADS]
        ],
        "candidateComparisons": candidate_comparisons,
        "recommendations": recommendations,
    }
