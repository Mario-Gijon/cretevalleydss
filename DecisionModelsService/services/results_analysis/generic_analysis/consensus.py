from .common import finite


def consensus_configuration(context):
    return (
        context.get("consensus")
        or (context.get("issue") or {}).get("consensus")
        or {}
    )


def round_consensus(context):
    measure = (context.get("execution") or {}).get("consensusMeasure")
    configuration = consensus_configuration(context)
    threshold = configuration.get("threshold")

    measure = measure if finite(measure) else None
    threshold = threshold if finite(threshold) else None

    return {
        "enabled": configuration.get("enabled"),
        "measure": measure,
        "threshold": threshold,
        "reached": (
            measure >= threshold
            if measure is not None and threshold is not None
            else None
        ),
    }


def issue_consensus(context, rounds):
    configuration = (context.get("issue") or {}).get("consensus") or {}
    threshold = configuration.get("threshold")
    threshold = threshold if finite(threshold) else None

    points = []
    for round_entry in rounds:
        measure = (round_entry.get("execution") or {}).get("consensusMeasure")
        if finite(measure):
            points.append({"phase": round_entry["phase"], "value": measure})

    initial = points[0]["value"] if points else None
    final = points[-1]["value"] if points else None

    first_reached = None
    if threshold is not None:
        for point in points:
            if point["value"] >= threshold:
                first_reached = point["phase"]
                break

    transitions = [
        {
            "fromPhase": previous["phase"],
            "toPhase": current["phase"],
            "fromValue": previous["value"],
            "toValue": current["value"],
            "change": current["value"] - previous["value"],
        }
        for previous, current in zip(points, points[1:])
    ]

    positive_changes = [item for item in transitions if item["change"] > 0]
    negative_changes = [item for item in transitions if item["change"] < 0]
    largest_increase = (
        max(positive_changes, key=lambda item: item["change"])
        if positive_changes
        else None
    )
    largest_decrease = (
        min(negative_changes, key=lambda item: item["change"])
        if negative_changes
        else None
    )

    changes = [item["change"] for item in transitions]
    if not changes:
        monotonic_direction = None
    elif all(change == 0 for change in changes):
        monotonic_direction = "constant"
    elif all(change >= 0 for change in changes):
        monotonic_direction = "nondecreasing"
    elif all(change <= 0 for change in changes):
        monotonic_direction = "nonincreasing"
    else:
        monotonic_direction = "mixed"

    final_gap = (
        max(threshold - final, 0)
        if threshold is not None and final is not None
        else None
    )

    return {
        "enabled": configuration.get("enabled") is True,
        "simulated": configuration.get("simulated"),
        "threshold": threshold,
        "maxPhases": configuration.get("maxPhases"),
        "points": points,
        "transitions": transitions,
        "initialMeasure": initial,
        "finalMeasure": final,
        "change": final - initial if initial is not None and final is not None else None,
        "reached": first_reached is not None if threshold is not None else None,
        "firstReachedPhase": first_reached,
        "finalGapToThreshold": final_gap,
        "largestIncrease": largest_increase,
        "largestDecrease": largest_decrease,
        "monotonicDirection": monotonic_direction,
    }
