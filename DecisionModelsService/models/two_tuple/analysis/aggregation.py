from __future__ import annotations

from typing import Any

from .common import availability
from .evidence import TwoTupleEvidence


_METHOD_LABELS = {
    "arithmetic_mean": "2-tuple arithmetic mean",
    "weighted_average": "2-tuple weighted average",
    "l2towa": "L2TOWA",
}


def _stage_summary(
    *,
    stage: dict[str, Any],
    source_kind: str,
) -> dict[str, Any]:
    method = stage["method"]

    summary = {
        "method": method,
        "methodLabel": _METHOD_LABELS[method],
        "options": dict(stage["options"]),
        "argumentCount": stage["argument_count"],
        "sourceKind": source_kind,
        "weightSemantics": stage["weight_semantics"],
        "effectiveWeights": list(stage["effective_weights"]),
        "configuredArgumentWeights": (
            list(stage["configured_argument_weights"])
            if stage["configured_argument_weights"] is not None
            else None
        ),
        "usesArgumentImportanceWeights": (
            stage["weight_semantics"] == "argument_importance"
        ),
        "usesEqualArguments": (
            stage["weight_semantics"] == "equal_arguments"
        ),
        "usesOrderedPositions": (
            stage["weight_semantics"]
            == "ordered_positions_descending_beta"
        ),
        "l2towa": (
            dict(stage["l2towa"])
            if stage["l2towa"] is not None
            else None
        ),
    }

    if method == "l2towa":
        summary["interpretationGuard"] = (
            "L2TOWA weights belong to descending ordered beta "
            "positions, not permanently to experts or criteria."
        )
    else:
        summary["interpretationGuard"] = None

    return summary


def _expert_sources(
    evidence: TwoTupleEvidence,
    trace: dict[str, Any],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    for position, source_index in enumerate(
        trace["source_indexes_in_aggregation_order"],
        start=1,
    ):
        items.append(
            {
                "position": position,
                "expertIndex": source_index,
                "expertKey": evidence.expert_keys[source_index],
                "expertId": evidence.expert_ids[source_index],
                "expertLabel": evidence.expert_labels[source_index],
                "expertEmail": evidence.expert_emails[source_index],
                "inputBeta": trace["input_betas"][source_index],
                "aggregationBeta": trace["aggregation_betas"][
                    position - 1
                ],
                "effectiveWeight": trace["effective_weights"][
                    position - 1
                ],
                "aggregationContribution": trace["contributions"][
                    position - 1
                ],
            }
        )

    return items


def _expert_trace_facts(
    evidence: TwoTupleEvidence,
) -> dict[str, Any]:
    cells: list[dict[str, Any]] = []

    for alternative_index, alternative_id in enumerate(
        evidence.alternative_ids
    ):
        for criterion_index, criterion_id in enumerate(
            evidence.criterion_ids
        ):
            trace = evidence.expert_aggregation_traces[
                alternative_index
            ][criterion_index]

            cells.append(
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
                    "aggregatedBeta": trace["aggregated_beta"],
                    "sources": _expert_sources(
                        evidence,
                        trace,
                    ),
                }
            )

    return {
        "comparison": (
            availability(True)
            if len(evidence.expert_keys) > 1
            else availability(False, "single_evaluator")
        ),
        "cells": cells,
    }


def _criterion_sources(
    evidence: TwoTupleEvidence,
    trace: dict[str, Any],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    for position, source_index in enumerate(
        trace["source_indexes_in_aggregation_order"],
        start=1,
    ):
        items.append(
            {
                "position": position,
                "criterionIndex": source_index,
                "criterionId": evidence.criterion_ids[source_index],
                "criterionName": evidence.criterion_names[source_index],
                "inputBeta": trace["input_betas"][source_index],
                "aggregationBeta": trace["aggregation_betas"][
                    position - 1
                ],
                "effectiveWeight": trace["effective_weights"][
                    position - 1
                ],
                "aggregationContribution": trace["contributions"][
                    position - 1
                ],
            }
        )

    return items


def _criteria_trace_facts(
    evidence: TwoTupleEvidence,
) -> dict[str, Any]:
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            evidence.ranking,
            start=1,
        )
    }

    alternatives: list[dict[str, Any]] = []

    for alternative_index, alternative_id in enumerate(
        evidence.alternative_ids
    ):
        trace = evidence.criteria_aggregation_traces[
            alternative_index
        ]
        alternatives.append(
            {
                "alternativeId": alternative_id,
                "alternativeName": evidence.alternative_names[
                    alternative_index
                ],
                "alternativeIndex": alternative_index,
                "technicalRank": rank_by_index[
                    alternative_index
                ],
                "aggregatedBeta": trace["aggregated_beta"],
                "finalTuple": evidence.collective_values[
                    alternative_index
                ],
                "sources": _criterion_sources(
                    evidence,
                    trace,
                ),
            }
        )

    return {
        "comparison": (
            availability(True)
            if len(evidence.criterion_ids) > 1
            else availability(False, "single_criterion")
        ),
        "alternatives": alternatives,
    }


def build_aggregation_facts(
    evidence: TwoTupleEvidence,
) -> dict[str, Any]:
    expert_stage = _stage_summary(
        stage=evidence.expert_aggregation_evidence,
        source_kind="evaluators",
    )
    criteria_stage = _stage_summary(
        stage=evidence.criteria_aggregation_evidence,
        source_kind="criteria",
    )

    return {
        "pipeline": [
            {
                "order": 1,
                "key": "expert_aggregation",
                "input": "individual evaluator 2-tuples",
                "output": "collective alternative-by-criterion 2-tuples",
                "method": expert_stage["method"],
            },
            {
                "order": 2,
                "key": "criteria_aggregation",
                "input": "collective criterion 2-tuples by alternative",
                "output": "final 2-tuple per alternative",
                "method": criteria_stage["method"],
            },
            {
                "order": 3,
                "key": "ranking",
                "input": "final alternative 2-tuples",
                "output": "descending collective ranking",
                "method": "descending_beta",
            },
        ],
        "expertAggregation": {
            "summary": expert_stage,
            "trace": _expert_trace_facts(evidence),
        },
        "criteriaAggregation": {
            "summary": criteria_stage,
            "trace": _criteria_trace_facts(evidence),
        },
        "capabilities": {
            "compareExpertAggregationInputs": (
                availability(True)
                if len(evidence.expert_keys) > 1
                else availability(False, "single_evaluator")
            ),
            "compareCriteriaAggregationInputs": (
                availability(True)
                if len(evidence.criterion_ids) > 1
                else availability(False, "single_criterion")
            ),
            "analyzeCriterionImportanceWeights": (
                availability(True)
                if evidence.criteria_aggregation_evidence[
                    "weight_semantics"
                ] == "argument_importance"
                else availability(
                    False,
                    "criteria_aggregation_has_no_argument_importance_weights",
                )
            ),
            "analyzeExpertImportanceWeights": (
                availability(True)
                if evidence.expert_aggregation_evidence[
                    "weight_semantics"
                ] == "argument_importance"
                else availability(
                    False,
                    "expert_aggregation_has_no_argument_importance_weights",
                )
            ),
        },
    }
