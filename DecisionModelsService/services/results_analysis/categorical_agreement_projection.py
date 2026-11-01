"""Optional 2D projection of saved categorical agreement patterns.

This is auxiliary Results Analysis evidence. It is not an AHPSort distance and
does not use AHP priorities, profile values, or any numerical model input.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.manifold import MDS


MIN_EXPERT_COUNT = 3
MIN_ALTERNATIVE_COUNT = 3
MAX_NORMALIZED_STRESS = 0.15


def build_categorical_agreement_projection(
    participants: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Project expert and collective category vectors when a 2D fit is solid.

    Pairwise dissimilarity is normalized Hamming mismatch: the share of saved
    alternatives assigned to different category IDs. Category order is not
    treated as a numeric scale.
    """

    if not isinstance(participants, list) or len(participants) < MIN_EXPERT_COUNT + 1:
        return None
    if sum(1 for item in participants if isinstance(item, dict) and item.get("kind") == "expert") < MIN_EXPERT_COUNT:
        return None
    if sum(1 for item in participants if isinstance(item, dict) and item.get("kind") == "collective") != 1:
        return None

    patterns = [item.get("categoryIds") if isinstance(item, dict) else None for item in participants]
    if not patterns or any(not isinstance(pattern, list) for pattern in patterns):
        return None
    alternative_count = len(patterns[0])
    if alternative_count < MIN_ALTERNATIVE_COUNT or any(
        len(pattern) != alternative_count
        or any(not isinstance(category_id, str) or not category_id for category_id in pattern)
        for pattern in patterns
    ):
        return None

    names = [item.get("name") if isinstance(item, dict) else None for item in participants]
    kinds = [item.get("kind") if isinstance(item, dict) else None for item in participants]
    if any(not isinstance(name, str) or not name.strip() for name in names):
        return None
    if len(set(names)) != len(names) or any(kind not in {"expert", "collective"} for kind in kinds):
        return None

    encoded_patterns = np.asarray(patterns, dtype=object)
    mismatches = np.zeros((len(patterns), len(patterns)), dtype=float)
    for left in range(len(patterns)):
        for right in range(left + 1, len(patterns)):
            dissimilarity = float(np.count_nonzero(encoded_patterns[left] != encoded_patterns[right])) / alternative_count
            mismatches[left, right] = dissimilarity
            mismatches[right, left] = dissimilarity
    if not np.any(mismatches > 0):
        return None

    try:
        reducer = MDS(
            n_components=2,
            dissimilarity="precomputed",
            random_state=42,
            n_init=4,
            max_iter=300,
            eps=1e-6,
            normalized_stress=True,
        )
        coordinates = reducer.fit_transform(mismatches)
        stress = float(reducer.stress_)
    except Exception:
        # The display-only projection is optional; a convergence/solver error
        # must leave the exact-category summary available.
        return None

    if not np.isfinite(coordinates).all() or not np.isfinite(stress) or stress > MAX_NORMALIZED_STRESS:
        return None

    collective_index = kinds.index("collective")
    collective_pattern = patterns[collective_index]
    points = []
    for index, participant in enumerate(participants):
        points.append({
            "kind": participant["kind"],
            "name": names[index].strip(),
            "x": float(coordinates[index, 0]),
            "y": float(coordinates[index, 1]),
            "exactCategoryMatches": sum(
                category_id == collective_category_id
                for category_id, collective_category_id in zip(patterns[index], collective_pattern)
            ),
            "totalAlternatives": alternative_count,
        })

    return {
        "type": "auxiliary_categorical_agreement_projection",
        "dissimilarity": "normalized_hamming_category_mismatch",
        "stress": stress,
        "maximumStress": MAX_NORMALIZED_STRESS,
        "points": points,
    }
