from itertools import combinations

from .common import alternative_name, finite


_EPSILON = 1e-12


def _pair_key(left_id, right_id):
    return tuple(sorted((str(left_id), str(right_id))))


def _phase_input(context, round_entry):
    phase = round_entry.get("phase")
    execution = round_entry.get("execution") or {}
    raw_entries = execution.get("ranking") or []

    alternatives = []
    seen = set()
    for entry in raw_entries:
        alternative_id = entry.get("alternativeId")
        rank = entry.get("rank")
        if alternative_id is None or not finite(rank):
            continue
        if alternative_id in seen:
            return {
                "phase": phase,
                "available": False,
                "reason": "duplicate_alternative",
                "alternatives": [],
            }
        seen.add(alternative_id)
        alternatives.append(
            {
                "alternativeId": alternative_id,
                "name": alternative_name(context, alternative_id),
                "rank": rank,
                "score": entry.get("score"),
            }
        )

    alternatives.sort(
        key=lambda item: (
            item["rank"],
            item["name"],
            str(item["alternativeId"]),
        )
    )

    if len(alternatives) < 2:
        return {
            "phase": phase,
            "available": False,
            "reason": "insufficient_alternatives",
            "alternatives": alternatives,
        }

    if any(not finite(item.get("score")) for item in alternatives):
        return {
            "phase": phase,
            "available": False,
            "reason": "missing_or_non_finite_score",
            "alternatives": alternatives,
        }

    return {
        "phase": phase,
        "available": True,
        "reason": None,
        "alternatives": alternatives,
    }


def _pair_entry(left, right, score_range):
    raw_distance = abs(left["score"] - right["score"])
    relative_separation = (
        0.0 if score_range <= _EPSILON else raw_distance / score_range
    )
    relative_separation = max(0.0, min(1.0, relative_separation))
    return {
        "leftAlternativeId": left["alternativeId"],
        "leftAlternative": left["name"],
        "rightAlternativeId": right["alternativeId"],
        "rightAlternative": right["name"],
        "relativeSeparation": relative_separation,
    }


def _extreme_pairs(pairs, *, minimum):
    if not pairs:
        return []
    target = (
        min(item["relativeSeparation"] for item in pairs)
        if minimum
        else max(item["relativeSeparation"] for item in pairs)
    )
    return [
        item
        for item in pairs
        if abs(item["relativeSeparation"] - target) <= _EPSILON
    ]


def _median(values):
    ordered = sorted(values)
    if not ordered:
        return None
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def _phase_relationships(phase_input, score_range):
    alternatives_with_scores = phase_input["alternatives"]
    pairs = [
        _pair_entry(left, right, score_range)
        for left, right in combinations(alternatives_with_scores, 2)
    ]
    separations = [item["relativeSeparation"] for item in pairs]

    winner_to_runner_up = None
    if len(alternatives_with_scores) >= 2:
        winner = alternatives_with_scores[0]
        runner_up = alternatives_with_scores[1]
        winner_to_runner_up = _pair_entry(winner, runner_up, score_range)

    return {
        "phase": phase_input["phase"],
        "alternatives": [
            {
                "alternativeId": item["alternativeId"],
                "name": item["name"],
                "rank": item["rank"],
            }
            for item in alternatives_with_scores
        ],
        "pairs": pairs,
        "closestPairs": _extreme_pairs(pairs, minimum=True),
        "furthestPairs": _extreme_pairs(pairs, minimum=False),
        "winnerToRunnerUp": winner_to_runner_up,
        "meanSeparation": (
            sum(separations) / len(separations) if separations else None
        ),
        "medianSeparation": _median(separations),
    }


def _pair_map(phase):
    return {
        _pair_key(item["leftAlternativeId"], item["rightAlternativeId"]): item
        for item in phase.get("pairs") or []
    }


def _pair_change(previous_pair, current_pair):
    return {
        "leftAlternativeId": current_pair["leftAlternativeId"],
        "leftAlternative": current_pair["leftAlternative"],
        "rightAlternativeId": current_pair["rightAlternativeId"],
        "rightAlternative": current_pair["rightAlternative"],
        "fromSeparation": previous_pair["relativeSeparation"],
        "toSeparation": current_pair["relativeSeparation"],
        "change": (
            current_pair["relativeSeparation"]
            - previous_pair["relativeSeparation"]
        ),
    }


def _relationship_transitions(phase_order, phases):
    by_phase = {item["phase"]: item for item in phases}
    transitions = []

    for from_phase, to_phase in zip(phase_order, phase_order[1:]):
        previous = by_phase.get(from_phase)
        current = by_phase.get(to_phase)
        if previous is None or current is None:
            continue

        previous_pairs = _pair_map(previous)
        current_pairs = _pair_map(current)
        shared_keys = sorted(set(previous_pairs) & set(current_pairs))
        changes = [
            _pair_change(previous_pairs[key], current_pairs[key])
            for key in shared_keys
        ]

        decreases = [item for item in changes if item["change"] < -_EPSILON]
        increases = [item for item in changes if item["change"] > _EPSILON]
        largest_decrease = (
            min(
                decreases,
                key=lambda item: (
                    item["change"],
                    item["leftAlternative"],
                    item["rightAlternative"],
                ),
            )
            if decreases
            else None
        )
        largest_increase = (
            max(
                increases,
                key=lambda item: (
                    item["change"],
                    item["leftAlternative"],
                    item["rightAlternative"],
                ),
            )
            if increases
            else None
        )

        previous_mean = previous.get("meanSeparation")
        current_mean = current.get("meanSeparation")
        transitions.append(
            {
                "fromPhase": from_phase,
                "toPhase": to_phase,
                "pairChanges": changes,
                "largestDecrease": largest_decrease,
                "largestIncrease": largest_increase,
                "meanSeparationChange": (
                    current_mean - previous_mean
                    if finite(previous_mean) and finite(current_mean)
                    else None
                ),
            }
        )

    return transitions


def alternative_relationships(context, rounds):
    """Describe score separation without assigning normalized scores to alternatives.

    Pairwise separations are normalized by the full finite score span observed in
    this execution. This gives every phase in the same execution one stable
    denominator, so phase-to-phase changes remain comparable. The value describes
    separation only; it is not a probability, confidence, utility percentage, or
    statement that one alternative is better by that percentage.
    """

    phase_order = [entry.get("phase") for entry in rounds]
    phase_inputs = [_phase_input(context, entry) for entry in rounds]
    available_inputs = [entry for entry in phase_inputs if entry["available"]]

    scores = [
        item["score"]
        for phase_input in available_inputs
        for item in phase_input["alternatives"]
    ]
    if not scores:
        return {
            "available": False,
            "normalization": None,
            "phases": [],
            "transitions": [],
            "unavailablePhases": [
                {"phase": entry["phase"], "reason": entry["reason"]}
                for entry in phase_inputs
            ],
        }

    minimum_score = min(scores)
    maximum_score = max(scores)
    score_range = maximum_score - minimum_score
    phases = [
        _phase_relationships(phase_input, score_range)
        for phase_input in available_inputs
    ]

    return {
        "available": bool(phases),
        "normalization": {
            "scope": "executionObservedScoreRange",
            "degenerate": score_range <= _EPSILON,
        },
        "phases": phases,
        "transitions": _relationship_transitions(phase_order, phases),
        "unavailablePhases": [
            {"phase": entry["phase"], "reason": entry["reason"]}
            for entry in phase_inputs
            if not entry["available"]
        ],
    }
