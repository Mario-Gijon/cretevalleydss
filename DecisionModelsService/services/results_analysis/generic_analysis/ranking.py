from math import sqrt

from .common import alternative_name, finite, ranking


def rankings_by_phase(context, rounds):
    return [
        {
            "phase": round_entry["phase"],
            "ranking": ranking(
                context,
                (round_entry.get("execution") or {}).get("ranking"),
            ),
        }
        for round_entry in rounds
    ]


def ranking_evolution(context, rankings_by_phase):
    phases = [entry["phase"] for entry in rankings_by_phase]
    alternative_ids = []

    for phase_entry in rankings_by_phase:
        for item in phase_entry["ranking"]:
            if item["alternativeId"] not in alternative_ids:
                alternative_ids.append(item["alternativeId"])

    rank_maps = [
        {item["alternativeId"]: item["rank"] for item in entry["ranking"]}
        for entry in rankings_by_phase
    ]
    final_map = rank_maps[-1] if rank_maps else {}

    alternative_ids.sort(
        key=lambda alternative_id: (
            final_map.get(alternative_id, float("inf")),
            alternative_name(context, alternative_id),
        )
    )

    series = [
        {
            "alternativeId": alternative_id,
            "name": alternative_name(context, alternative_id),
            "values": [rank_map.get(alternative_id) for rank_map in rank_maps],
        }
        for alternative_id in alternative_ids
    ]

    changes = []
    if rank_maps:
        initial_map = rank_maps[0]
        for alternative_id in alternative_ids:
            initial_rank = initial_map.get(alternative_id)
            final_rank = final_map.get(alternative_id)
            change = (
                initial_rank - final_rank
                if finite(initial_rank) and finite(final_rank)
                else None
            )
            changes.append(
                {
                    "alternativeId": alternative_id,
                    "name": alternative_name(context, alternative_id),
                    "initialRank": initial_rank,
                    "finalRank": final_rank,
                    "positionChange": change,
                }
            )

    return {"phases": phases, "series": series, "changes": changes}


def leader_changes(rankings_by_phase):
    changes = []
    previous = None

    for phase_entry in rankings_by_phase:
        if not phase_entry["ranking"]:
            continue

        leader = phase_entry["ranking"][0]
        current = {
            "phase": phase_entry["phase"],
            "alternativeId": leader["alternativeId"],
            "name": leader["name"],
        }

        if previous and previous["alternativeId"] != current["alternativeId"]:
            changes.append(
                {
                    "fromPhase": previous["phase"],
                    "toPhase": current["phase"],
                    "fromAlternativeId": previous["alternativeId"],
                    "fromAlternative": previous["name"],
                    "toAlternativeId": current["alternativeId"],
                    "toAlternative": current["name"],
                }
            )
        previous = current

    return changes


def ranking_stability(context, rankings_by_phase):
    alternative_ids = []
    rank_maps = []

    for phase_entry in rankings_by_phase:
        rank_map = {
            item["alternativeId"]: item["rank"]
            for item in phase_entry["ranking"]
            if finite(item.get("rank"))
        }
        rank_maps.append(rank_map)
        for alternative_id in rank_map:
            if alternative_id not in alternative_ids:
                alternative_ids.append(alternative_id)

    final_map = rank_maps[-1] if rank_maps else {}
    alternative_ids.sort(
        key=lambda alternative_id: (
            final_map.get(alternative_id, float("inf")),
            alternative_name(context, alternative_id),
        )
    )

    alternatives = []
    for alternative_id in alternative_ids:
        values = [rank_map.get(alternative_id) for rank_map in rank_maps]
        finite_values = [value for value in values if finite(value)]
        if not finite_values:
            continue

        total_movement = 0
        position_change_count = 0
        for left, right in zip(values, values[1:]):
            if not finite(left) or not finite(right):
                continue
            movement = abs(right - left)
            total_movement += movement
            if movement != 0:
                position_change_count += 1

        alternatives.append(
            {
                "alternativeId": alternative_id,
                "name": alternative_name(context, alternative_id),
                "initialRank": values[0] if values else None,
                "finalRank": values[-1] if values else None,
                "bestRank": min(finite_values),
                "worstRank": max(finite_values),
                "totalMovement": total_movement,
                "positionChangeCount": position_change_count,
            }
        )

    return {"alternatives": alternatives}


def _ranking_signature(phase_entry):
    if not phase_entry.get("ranking"):
        return None
    return tuple(
        sorted(
            (item["alternativeId"], item["rank"])
            for item in phase_entry["ranking"]
            if item.get("alternativeId") is not None and finite(item.get("rank"))
        )
    )


def stabilization_phase(rankings_by_phase):
    if len(rankings_by_phase) < 2:
        return None

    signatures = [_ranking_signature(entry) for entry in rankings_by_phase]
    for index in range(len(signatures) - 1):
        signature = signatures[index]
        if signature is None:
            continue
        if all(candidate == signature for candidate in signatures[index + 1 :]):
            return rankings_by_phase[index]["phase"]
    return None


def _spearman_coefficient(left_ranking, right_ranking):
    left = {
        item["alternativeId"]: item["rank"]
        for item in left_ranking
        if item.get("alternativeId") is not None and finite(item.get("rank"))
    }
    right = {
        item["alternativeId"]: item["rank"]
        for item in right_ranking
        if item.get("alternativeId") is not None and finite(item.get("rank"))
    }

    if len(left) < 2 or set(left) != set(right):
        return None

    alternative_ids = sorted(left)
    left_values = [left[alternative_id] for alternative_id in alternative_ids]
    right_values = [right[alternative_id] for alternative_id in alternative_ids]
    left_mean = sum(left_values) / len(left_values)
    right_mean = sum(right_values) / len(right_values)

    numerator = sum(
        (left_value - left_mean) * (right_value - right_mean)
        for left_value, right_value in zip(left_values, right_values)
    )
    left_variance = sum((value - left_mean) ** 2 for value in left_values)
    right_variance = sum((value - right_mean) ** 2 for value in right_values)
    denominator = sqrt(left_variance * right_variance)
    if denominator == 0:
        return None

    coefficient = numerator / denominator
    return max(-1.0, min(1.0, coefficient))


def ranking_agreement(rankings_by_phase):
    transitions = []

    for previous, current in zip(rankings_by_phase, rankings_by_phase[1:]):
        coefficient = _spearman_coefficient(previous["ranking"], current["ranking"])
        if coefficient is None:
            continue
        transitions.append(
            {
                "fromPhase": previous["phase"],
                "toPhase": current["phase"],
                "coefficient": coefficient,
            }
        )

    return {
        "transitions": transitions,
        "stabilizationPhase": stabilization_phase(rankings_by_phase),
    }


def phase_highlights(rankings_by_phase, consensus_points):
    consensus_by_phase = {
        point["phase"]: point["value"]
        for point in consensus_points or []
        if finite(point.get("value"))
    }
    highlights = []

    for previous, current in zip(rankings_by_phase, rankings_by_phase[1:]):
        previous_map = {
            item["alternativeId"]: item for item in previous.get("ranking") or []
        }
        current_map = {
            item["alternativeId"]: item for item in current.get("ranking") or []
        }

        previous_leader = previous["ranking"][0] if previous.get("ranking") else None
        current_leader = current["ranking"][0] if current.get("ranking") else None
        leader_change = None
        if (
            previous_leader
            and current_leader
            and previous_leader["alternativeId"] != current_leader["alternativeId"]
        ):
            leader_change = {
                "fromAlternativeId": previous_leader["alternativeId"],
                "fromAlternative": previous_leader["name"],
                "toAlternativeId": current_leader["alternativeId"],
                "toAlternative": current_leader["name"],
            }

        movements = []
        for alternative_id in sorted(set(previous_map) & set(current_map)):
            previous_rank = previous_map[alternative_id]["rank"]
            current_rank = current_map[alternative_id]["rank"]
            if not finite(previous_rank) or not finite(current_rank):
                continue
            change = previous_rank - current_rank
            if change == 0:
                continue
            movements.append(
                {
                    "alternativeId": alternative_id,
                    "name": current_map[alternative_id]["name"],
                    "fromRank": previous_rank,
                    "toRank": current_rank,
                    "positionChange": change,
                }
            )

        movements.sort(key=lambda item: (-abs(item["positionChange"]), item["name"]))
        largest_movements = []
        if movements:
            largest_size = abs(movements[0]["positionChange"])
            largest_movements = [
                item
                for item in movements
                if abs(item["positionChange"]) == largest_size
            ]

        previous_consensus = consensus_by_phase.get(previous["phase"])
        current_consensus = consensus_by_phase.get(current["phase"])
        consensus_change = (
            current_consensus - previous_consensus
            if finite(previous_consensus) and finite(current_consensus)
            else None
        )

        highlights.append(
            {
                "fromPhase": previous["phase"],
                "toPhase": current["phase"],
                "leaderChange": leader_change,
                "rankingChanged": bool(movements),
                "largestMovements": largest_movements,
                "consensusChange": consensus_change,
            }
        )

    return highlights
