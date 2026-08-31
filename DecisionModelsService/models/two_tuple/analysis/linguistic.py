from __future__ import annotations

from typing import Any

from .common import (
    EVIDENCE_TOLERANCE,
    availability,
    effective_tie,
)
from .evidence import TwoTupleEvidence


def _is_zero_alpha(alpha: float) -> bool:
    return abs(alpha) <= EVIDENCE_TOLERANCE


def _translation_direction(alpha: float) -> str:
    if _is_zero_alpha(alpha):
        return "exact"
    return "toward_lower_label" if alpha < 0 else "toward_higher_label"


def _adjacent_label(
    *,
    tuple_value: dict[str, Any],
    labels: list[dict[str, Any]],
) -> dict[str, Any] | None:
    alpha = float(tuple_value["alpha"])
    if _is_zero_alpha(alpha):
        return None

    label_index = int(tuple_value["labelIndex"])
    adjacent_index = (
        label_index - 1
        if alpha < 0
        else label_index + 1
    )
    if adjacent_index < 0 or adjacent_index >= len(labels):
        raise ValueError(
            "Canonical 2-tuple symbolic translation points "
            "outside its linguistic scale"
        )

    adjacent = labels[adjacent_index]
    return {
        "labelKey": adjacent["key"],
        "label": adjacent["label"],
        "labelIndex": adjacent_index,
    }


def _translation_fact(
    *,
    beta: float,
    tuple_value: dict[str, Any],
    labels: list[dict[str, Any]],
) -> dict[str, Any]:
    alpha = float(tuple_value["alpha"])
    absolute_alpha = abs(alpha)
    exact = _is_zero_alpha(alpha)

    return {
        "beta": beta,
        "tuple": dict(tuple_value),
        "isExactLabel": exact,
        "hasSymbolicTranslation": not exact,
        "translationDirection": _translation_direction(alpha),
        "absoluteAlpha": absolute_alpha,
        "isExactMidpoint": (
            not exact
            and abs(alpha + 0.5) <= EVIDENCE_TOLERANCE
        ),
        "adjacentLabel": _adjacent_label(
            tuple_value=tuple_value,
            labels=labels,
        ),
    }


def _summary(
    items: list[dict[str, Any]],
) -> dict[str, Any]:
    if not items:
        raise ValueError(
            "2-tuple translation summary requires at least one item"
        )

    count = len(items)
    exact_count = sum(
        1
        for item in items
        if item["isExactLabel"]
    )
    translated_count = count - exact_count
    positive_count = sum(
        1
        for item in items
        if item["tuple"]["alpha"] > EVIDENCE_TOLERANCE
    )
    negative_count = sum(
        1
        for item in items
        if item["tuple"]["alpha"] < -EVIDENCE_TOLERANCE
    )
    midpoint_count = sum(
        1
        for item in items
        if item["isExactMidpoint"]
    )
    absolute_alphas = [
        float(item["absoluteAlpha"])
        for item in items
    ]

    return {
        "valueCount": count,
        "exactLabelCount": exact_count,
        "translatedValueCount": translated_count,
        "translatedShare": translated_count / count,
        "zeroAlphaCount": exact_count,
        "positiveAlphaCount": positive_count,
        "negativeAlphaCount": negative_count,
        "exactMidpointCount": midpoint_count,
        "meanAbsoluteAlpha": (
            sum(absolute_alphas) / count
        ),
        "maxAbsoluteAlpha": max(absolute_alphas),
    }


def _collective_items(
    evidence: TwoTupleEvidence,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    for alternative_index, alternative_id in enumerate(
        evidence.alternative_ids
    ):
        for criterion_index, criterion_id in enumerate(
            evidence.criterion_ids
        ):
            translation = _translation_fact(
                beta=evidence.collective_beta_matrix[
                    alternative_index
                ][criterion_index],
                tuple_value=evidence.collective_matrix[
                    alternative_index
                ][criterion_index],
                labels=evidence.labels,
            )
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
                    **translation,
                }
            )

    return items


def _final_items(
    evidence: TwoTupleEvidence,
) -> list[dict[str, Any]]:
    rank_by_index = {
        alternative_index: rank
        for rank, alternative_index in enumerate(
            evidence.ranking,
            start=1,
        )
    }

    return [
        {
            "alternativeId": evidence.alternative_ids[index],
            "alternativeName": evidence.alternative_names[index],
            "alternativeIndex": index,
            "technicalRank": rank_by_index[index],
            **_translation_fact(
                beta=evidence.collective_scores[index],
                tuple_value=evidence.collective_values[index],
                labels=evidence.labels,
            ),
        }
        for index in range(len(evidence.alternative_ids))
    ]


def _by_criterion(
    evidence: TwoTupleEvidence,
    collective_items: list[dict[str, Any]],
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []

    for criterion_index, criterion_id in enumerate(
        evidence.criterion_ids
    ):
        values = [
            item
            for item in collective_items
            if item["criterionIndex"] == criterion_index
        ]
        items.append(
            {
                "criterionId": criterion_id,
                "name": evidence.criterion_names[criterion_index],
                "index": criterion_index,
                **_summary(values),
            }
        )

    return {
        "comparison": (
            availability(True)
            if len(items) > 1
            else availability(False, "single_criterion")
        ),
        "items": items,
    }


def _by_alternative(
    evidence: TwoTupleEvidence,
    collective_items: list[dict[str, Any]],
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []

    for alternative_index, alternative_id in enumerate(
        evidence.alternative_ids
    ):
        values = [
            item
            for item in collective_items
            if item["alternativeIndex"] == alternative_index
        ]
        items.append(
            {
                "alternativeId": alternative_id,
                "name": evidence.alternative_names[
                    alternative_index
                ],
                "index": alternative_index,
                **_summary(values),
            }
        )

    return {
        "comparison": (
            availability(True)
            if len(items) > 1
            else availability(False, "single_alternative")
        ),
        "items": items,
    }


def _strongest_translations(
    items: list[dict[str, Any]],
) -> dict[str, Any]:
    translated = [
        item
        for item in items
        if item["hasSymbolicTranslation"]
    ]

    if not translated:
        return availability(
            False,
            "no_symbolic_translation",
            maxAbsoluteAlpha=None,
            items=[],
        )

    maximum = max(
        item["absoluteAlpha"]
        for item in translated
    )
    selected = [
        item
        for item in translated
        if effective_tie(
            item["absoluteAlpha"],
            maximum,
        )
    ]

    return availability(
        True,
        maxAbsoluteAlpha=maximum,
        items=[
            dict(item)
            for item in selected
        ],
    )


def build_linguistic_facts(
    evidence: TwoTupleEvidence,
) -> dict[str, Any]:
    collective_items = _collective_items(evidence)
    final_items = _final_items(evidence)

    return {
        "method": {
            "representation": "linguistic_2tuple",
            "betaMeaning": "linguistic_position",
            "alphaMeaning": "symbolic_translation",
            "alphaIsUncertainty": False,
            "alphaRange": {
                "minimumInclusive": -0.5,
                "maximumExclusive": 0.5,
            },
            "halfStepConvention": (
                "upper_label_with_alpha_-0.5"
            ),
            "commonLabelCount": evidence.label_count,
            "maximumLabelIndex": evidence.label_count - 1,
            "labels": [
                dict(label)
                for label in evidence.labels
            ],
        },
        "capabilities": {
            "analyzeSymbolicTranslation": availability(True),
            "compareCriteriaTranslation": (
                availability(True)
                if len(evidence.criterion_ids) > 1
                else availability(False, "single_criterion")
            ),
            "compareAlternativeTranslation": (
                availability(True)
                if len(evidence.alternative_ids) > 1
                else availability(False, "single_alternative")
            ),
        },
        "collective": {
            "summary": _summary(collective_items),
            "items": collective_items,
            "byCriterion": _by_criterion(
                evidence,
                collective_items,
            ),
            "byAlternative": _by_alternative(
                evidence,
                collective_items,
            ),
            "strongestTranslations": (
                _strongest_translations(
                    collective_items
                )
            ),
        },
        "final": {
            "summary": _summary(final_items),
            "items": final_items,
            "strongestTranslations": (
                _strongest_translations(final_items)
            ),
        },
    }
