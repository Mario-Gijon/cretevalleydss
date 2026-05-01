from __future__ import annotations

from typing import Any


def _to_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _extract_collective_pairwise_cells(
    collective: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    cells: dict[str, dict[str, Any]] = {}
    if not isinstance(collective, dict):
        return cells

    for criterion_name, rows in collective.items():
        if not isinstance(criterion_name, str) or not criterion_name.strip():
            continue
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            alternative = row.get("id")
            if not isinstance(alternative, str) or not alternative.strip():
                continue
            for compared_alternative, raw_value in row.items():
                if compared_alternative == "id":
                    continue
                if (
                    not isinstance(compared_alternative, str)
                    or not compared_alternative.strip()
                    or compared_alternative == alternative
                ):
                    continue
                value = _to_number(raw_value)
                if value is None:
                    continue
                key = f"{criterion_name}::{alternative}::{compared_alternative}"
                cells[key] = {
                    "criterion": criterion_name,
                    "alternative": alternative,
                    "comparedAlternative": compared_alternative,
                    "value": value,
                    "distanceFromNeutral": abs(value - 0.5),
                }
    return cells


def _extract_expert_pairwise_vectors(
    canonical_by_expert: dict[str, Any],
) -> dict[str, dict[str, float]]:
    vectors: dict[str, dict[str, float]] = {}
    if not isinstance(canonical_by_expert, dict):
        return vectors

    for expert_email, expert_payload in canonical_by_expert.items():
        if not isinstance(expert_payload, dict):
            continue
        vector: dict[str, float] = {}
        for criterion_name, criterion_cells in expert_payload.items():
            if not isinstance(criterion_name, str) or not criterion_name.strip():
                continue
            if not isinstance(criterion_cells, dict):
                continue
            for cell_key, cell_payload in criterion_cells.items():
                if not isinstance(cell_payload, dict):
                    continue
                alternative = cell_payload.get("alternative")
                compared_alternative = cell_payload.get("comparedAlternative")
                if not isinstance(alternative, str) or not isinstance(compared_alternative, str):
                    if isinstance(cell_key, str) and "::" in cell_key:
                        parts = cell_key.split("::", 1)
                        if len(parts) == 2:
                            alternative = parts[0]
                            compared_alternative = parts[1]
                if (
                    not isinstance(alternative, str)
                    or not alternative.strip()
                    or not isinstance(compared_alternative, str)
                    or not compared_alternative.strip()
                    or alternative == compared_alternative
                ):
                    continue
                value = _to_number(cell_payload.get("value"))
                if value is None:
                    continue
                key = f"{criterion_name}::{alternative}::{compared_alternative}"
                vector[key] = value
        if vector:
            vectors[str(expert_email)] = vector
    return vectors


def analyze_pairwise_structure_layer(
    context: dict[str, Any],
    common_results: dict[str, Any] | None = None,
) -> dict:
    result = context.get("result") or {}
    evaluations = context.get("evaluations") or {}
    collective = result.get("collectiveEvaluations") or {}
    canonical_by_expert = evaluations.get("canonicalByExpert") or {}

    collective_cells = _extract_collective_pairwise_cells(collective)
    expert_vectors = _extract_expert_pairwise_vectors(canonical_by_expert)

    pairwise_diagnostics: dict[str, Any] = {
        "available": False,
        "neutralValue": 0.5,
    }
    notes: list[str] = []
    insights: list[dict[str, Any]] = []

    if not collective_cells:
        notes.append(
            "Detailed pairwise diagnostics were not available because comparable pairwise matrices were not provided."
        )
        return {
            "notes": notes,
            "insights": insights,
            "warnings": [],
            "metrics": {"pairwiseDiagnostics": pairwise_diagnostics},
        }

    pairwise_diagnostics["available"] = True

    strongest_collective = max(
        collective_cells.values(),
        key=lambda item: item["distanceFromNeutral"],
    )
    weakest_collective = min(
        collective_cells.values(),
        key=lambda item: item["distanceFromNeutral"],
    )
    pairwise_diagnostics["strongestCollectivePreference"] = strongest_collective
    pairwise_diagnostics["mostNeutralCollectivePreference"] = weakest_collective

    criterion_groups: dict[str, list[float]] = {}
    for item in collective_cells.values():
        criterion_groups.setdefault(item["criterion"], []).append(item["distanceFromNeutral"])

    criterion_intensity = []
    for criterion_name, values in criterion_groups.items():
        if not values:
            continue
        criterion_intensity.append(
            {
                "criterion": criterion_name,
                "averageIntensity": sum(values) / len(values),
                "cellCount": len(values),
            }
        )
    criterion_intensity.sort(key=lambda item: item["averageIntensity"], reverse=True)
    pairwise_diagnostics["criterionIntensity"] = criterion_intensity

    insights.append(
        {
            "code": "STRONGEST_COLLECTIVE_PREFERENCE",
            "importance": "medium",
            "message": (
                f"The strongest collective preference appears under {strongest_collective['criterion']}, "
                f"where {strongest_collective['alternative']} is preferred over {strongest_collective['comparedAlternative']}."
            ),
            "evidenceRefs": ["metric:pairwiseDiagnostics"],
        }
    )

    if criterion_intensity:
        insights.append(
            {
                "code": "PAIRWISE_PREFERENCE_INTENSITY",
                "importance": "low",
                "message": (
                    f"{criterion_intensity[0]['criterion']} contains the strongest average pairwise preference intensity."
                ),
                "evidenceRefs": ["metric:pairwiseDiagnostics"],
            }
        )

    disagreement_hotspots = []
    if expert_vectors:
        aggregated: dict[str, dict[str, Any]] = {}
        for expert_vector in expert_vectors.values():
            overlap_keys = [key for key in expert_vector.keys() if key in collective_cells]
            for key in overlap_keys:
                diff = abs(expert_vector[key] - collective_cells[key]["value"])
                if key not in aggregated:
                    aggregated[key] = {
                        "criterion": collective_cells[key]["criterion"],
                        "alternative": collective_cells[key]["alternative"],
                        "comparedAlternative": collective_cells[key]["comparedAlternative"],
                        "sumDifference": 0.0,
                        "count": 0,
                    }
                aggregated[key]["sumDifference"] += diff
                aggregated[key]["count"] += 1

        for item in aggregated.values():
            if item["count"] <= 0:
                continue
            disagreement_hotspots.append(
                {
                    "criterion": item["criterion"],
                    "alternative": item["alternative"],
                    "comparedAlternative": item["comparedAlternative"],
                    "averageDifference": item["sumDifference"] / item["count"],
                    "expertCount": item["count"],
                }
            )
        disagreement_hotspots.sort(
            key=lambda item: item["averageDifference"], reverse=True
        )

    pairwise_diagnostics["disagreementHotspots"] = disagreement_hotspots[:10]

    if disagreement_hotspots:
        top_hotspot = disagreement_hotspots[0]
        insights.append(
            {
                "code": "PAIRWISE_DISAGREEMENT_HOTSPOT",
                "importance": "medium",
                "message": (
                    f"The largest expert-to-collective difference appears in the comparison between "
                    f"{top_hotspot['alternative']} and {top_hotspot['comparedAlternative']} under "
                    f"{top_hotspot['criterion']}."
                ),
                "evidenceRefs": ["metric:pairwiseDiagnostics"],
            }
        )

    return {
        "notes": notes,
        "insights": insights,
        "warnings": [],
        "metrics": {"pairwiseDiagnostics": pairwise_diagnostics},
    }
