from __future__ import annotations

from typing import Any

from .common import (
    ANALYTICAL_TIE_TOLERANCE,
    EVIDENCE_TOLERANCE,
    availability,
    effective_tie,
)
from .evidence import TopsisEvidence


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
    adjacent_index = label_index - 1 if alpha < 0 else label_index + 1
    if adjacent_index < 0 or adjacent_index >= len(labels):
        raise ValueError(
            "Canonical 2-tuple symbolic translation points outside "
            "its linguistic scale"
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
    midpoint = (
        not exact
        and abs(alpha + 0.5) <= EVIDENCE_TOLERANCE
    )

    return {
        "beta": beta,
        "tuple": dict(tuple_value),
        "isExactLabel": exact,
        "hasSymbolicTranslation": not exact,
        "translationDirection": _translation_direction(alpha),
        "absoluteAlpha": absolute_alpha,
        "isExactMidpoint": midpoint,
        "adjacentLabel": _adjacent_label(
            tuple_value=tuple_value,
            labels=labels,
        ),
    }


def _summary(items: list[dict[str, Any]]) -> dict[str, Any]:
    if not items:
        raise ValueError("2-tuple translation summary requires at least one item")

    count = len(items)
    exact_count = sum(1 for item in items if item["isExactLabel"])
    translated_count = count - exact_count
    positive_count = sum(
        1 for item in items if item["tuple"]["alpha"] > EVIDENCE_TOLERANCE
    )
    negative_count = sum(
        1 for item in items if item["tuple"]["alpha"] < -EVIDENCE_TOLERANCE
    )
    midpoint_count = sum(1 for item in items if item["isExactMidpoint"])
    absolute_alphas = [float(item["absoluteAlpha"]) for item in items]

    return {
        "valueCount": count,
        "exactLabelCount": exact_count,
        "translatedValueCount": translated_count,
        "translatedShare": translated_count / count,
        "zeroAlphaCount": exact_count,
        "positiveAlphaCount": positive_count,
        "negativeAlphaCount": negative_count,
        "exactMidpointCount": midpoint_count,
        "meanAbsoluteAlpha": sum(absolute_alphas) / count,
        "maxAbsoluteAlpha": max(absolute_alphas),
    }


def _collective_items(evidence: TopsisEvidence) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for alternative_index, alternative_id in enumerate(evidence.alternative_ids):
        for criterion_index, criterion_id in enumerate(evidence.criterion_ids):
            translation = _translation_fact(
                beta=evidence.collective_beta_matrix[alternative_index][criterion_index],
                tuple_value=evidence.collective_matrix[alternative_index][criterion_index],
                labels=evidence.scale_labels[criterion_index],
            )
            items.append(
                {
                    "alternativeId": alternative_id,
                    "alternativeName": evidence.alternative_names[alternative_index],
                    "alternativeIndex": alternative_index,
                    "criterionId": criterion_id,
                    "criterionName": evidence.criterion_names[criterion_index],
                    "criterionIndex": criterion_index,
                    **translation,
                }
            )
    return items


def _ideal_items(
    evidence: TopsisEvidence,
    *,
    positive: bool,
) -> list[dict[str, Any]]:
    betas = evidence.positive_ideal_beta if positive else evidence.negative_ideal_beta
    tuples = evidence.positive_ideal if positive else evidence.negative_ideal
    return [
        {
            "criterionId": evidence.criterion_ids[index],
            "criterionName": evidence.criterion_names[index],
            "criterionIndex": index,
            **_translation_fact(
                beta=betas[index],
                tuple_value=tuples[index],
                labels=evidence.scale_labels[index],
            ),
        }
        for index in range(len(evidence.criterion_ids))
    ]


def _by_criterion(
    evidence: TopsisEvidence,
    collective_items: list[dict[str, Any]],
) -> dict[str, Any]:
    items = []
    for criterion_index, criterion_id in enumerate(evidence.criterion_ids):
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
    evidence: TopsisEvidence,
    collective_items: list[dict[str, Any]],
) -> dict[str, Any]:
    items = []
    for alternative_index, alternative_id in enumerate(evidence.alternative_ids):
        values = [
            item
            for item in collective_items
            if item["alternativeIndex"] == alternative_index
        ]
        items.append(
            {
                "alternativeId": alternative_id,
                "name": evidence.alternative_names[alternative_index],
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
    collective_items: list[dict[str, Any]],
) -> dict[str, Any]:
    translated = [
        item for item in collective_items if item["hasSymbolicTranslation"]
    ]
    if not translated:
        return availability(
            False,
            "no_variation",
            maxAbsoluteAlpha=None,
            items=[],
        )

    maximum = max(item["absoluteAlpha"] for item in translated)
    selected = [
        item
        for item in translated
        if effective_tie(item["absoluteAlpha"], maximum)
    ]

    return availability(
        True,
        maxAbsoluteAlpha=maximum,
        items=[dict(item) for item in selected],
    )


def _validate_common_granularity(evidence: TopsisEvidence) -> int:
    counts = {len(labels) for labels in evidence.scale_labels}
    if len(counts) != 1:
        raise ValueError(
            "Executed 2-Tuple TOPSIS evidence must use one common "
            "linguistic granularity"
        )
    return next(iter(counts))


def build_linguistic_facts(
    evidence: TopsisEvidence,
) -> dict[str, Any]:
    label_count = _validate_common_granularity(evidence)
    collective_items = _collective_items(evidence)
    positive_ideal_items = _ideal_items(evidence, positive=True)
    negative_ideal_items = _ideal_items(evidence, positive=False)

    return {
        "method": {
            "representation": "linguistic_2tuple",
            "alphaMeaning": "symbolic_translation",
            "alphaIsUncertainty": False,
            "alphaRange": {
                "minimumInclusive": -0.5,
                "maximumExclusive": 0.5,
            },
            "halfStepConvention": "upper_label_with_alpha_-0.5",
            "commonLabelCount": label_count,
            "maximumLabelIndex": label_count - 1,
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
            "byCriterion": _by_criterion(evidence, collective_items),
            "byAlternative": _by_alternative(evidence, collective_items),
            "strongestTranslations": _strongest_translations(collective_items),
        },
        "ideals": {
            "positive": {
                "summary": _summary(positive_ideal_items),
                "items": positive_ideal_items,
            },
            "negative": {
                "summary": _summary(negative_ideal_items),
                "items": negative_ideal_items,
            },
        },
    }
