from math import floor

from .common import finite, fmt, ordinal, phase_label


_RELATIONSHIP_EPSILON = 1e-12
_PAIRWISE_MATRIX_MAX_ALTERNATIVES = 6


def _percentage(value):
    if not finite(value):
        return "—"
    rounded = floor(max(0.0, min(1.0, value)) * 100 + 0.5)
    return f"{rounded}%"


def _percentage_points(value):
    if not finite(value):
        return "—"
    rounded = floor(abs(value) * 100 + 0.5)
    return f"{rounded} percentage point{'s' if rounded != 1 else ''}"


def _escape_table(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def _pair_names(pair):
    return pair.get("leftAlternative"), pair.get("rightAlternative")


def _pair_lookup(phase):
    result = {}
    for pair in phase.get("pairs") or []:
        left_id = pair.get("leftAlternativeId")
        right_id = pair.get("rightAlternativeId")
        if left_id is None or right_id is None:
            continue
        result[frozenset((left_id, right_id))] = pair.get("relativeSeparation")
    return result


def _final_ranking_markdown(facts):
    if facts.get("executedRounds") != 1:
        return ""

    ranking = facts.get("finalRanking") or []
    if not ranking:
        return ""

    lines = ["### Final ranking", ""]
    if len(ranking) == 1:
        lines.append(f"**{ranking[0]['name']}** is the only ranked alternative.")
        return "\n".join(lines)

    lines.append(
        f"**{ranking[0]['name']}** finished first in the recorded execution."
    )
    lines.append("")
    for item in ranking:
        name = f"**{item['name']}**" if item["rank"] == 1 else item["name"]
        lines.append(f"{ordinal(item['rank'])}. {name}")
    return "\n".join(lines)


def _ranking_evolution_markdown(facts):
    evolution = facts["rankingEvolution"]
    if len(evolution["phases"]) < 2:
        return ""

    lines = ["### Ranking evolution", ""]
    leader_changes = facts["leaderChanges"]

    if not leader_changes and facts["finalRanking"]:
        lines.append(
            f"**{facts['finalRanking'][0]['name']}** remained the leading "
            "alternative throughout the executed phases."
        )
    elif len(leader_changes) == 1:
        change = leader_changes[0]
        lines.append(
            f"The leading alternative changed once: "
            f"**{change['fromAlternative']}** led in "
            f"**{phase_label(change['fromPhase'])}**, while "
            f"**{change['toAlternative']}** led in "
            f"**{phase_label(change['toPhase'])}**."
        )
    else:
        lines.append(
            f"The leading alternative changed "
            f"**{len(leader_changes)} times** across the executed phases."
        )

    movements = []
    for item in evolution["changes"]:
        change = item["positionChange"]
        if change is None or change == 0:
            continue
        direction = "moved up" if change > 0 else "moved down"
        movements.append(
            f"- **{item['name']}** {direction} from "
            f"{ordinal(item['initialRank'])} to "
            f"{ordinal(item['finalRank'])} "
            f"(**{change:+g}** positions)."
        )

    if movements:
        lines.extend(["", *movements])
    else:
        lines.extend(
            ["", "The final ranking is unchanged from the first executed phase."]
        )

    rows = [
        "",
        "| Alternative | Initial | Final | Change |",
        "|:--|--:|--:|--:|",
    ]
    for item in evolution["changes"]:
        if item["initialRank"] is None or item["finalRank"] is None:
            continue
        change = item["positionChange"]
        change_label = f"{change:+g}" if change is not None else "—"
        rows.append(
            f"| {_escape_table(item['name'])} | {ordinal(item['initialRank'])} | "
            f"{ordinal(item['finalRank'])} | {change_label} |"
        )
    if len(rows) > 3:
        lines.extend(rows)

    return "\n".join(lines)


def _ranking_stability_markdown(facts):
    if facts.get("executedRounds", 0) < 2:
        return ""

    alternatives = (facts.get("rankingStability") or {}).get("alternatives") or []
    if len(alternatives) < 2:
        return ""

    lines = ["### Ranking stability", ""]
    maximum_movement = max(item["totalMovement"] for item in alternatives)
    most_mobile = [
        item["name"]
        for item in alternatives
        if item["totalMovement"] == maximum_movement
    ]
    stable = [item["name"] for item in alternatives if item["totalMovement"] == 0]

    if maximum_movement == 0:
        lines.append(
            "No alternative changed position across the recorded phase transitions."
        )
    elif len(most_mobile) == 1:
        lines.append(
            f"**{most_mobile[0]}** showed the largest observed positional movement "
            f"with **{maximum_movement:g}** cumulative rank positions."
        )
    else:
        lines.append(
            f"**{', '.join(most_mobile)}** shared the largest observed positional "
            f"movement with **{maximum_movement:g}** cumulative rank positions each."
        )

    if stable and maximum_movement != 0:
        lines.append(
            f"**{', '.join(stable)}** remained in the same rank position throughout "
            "all recorded transitions."
        )

    lines.extend(
        [
            "",
            "| Alternative | Best | Worst | Total movement | Position changes |",
            "|:--|--:|--:|--:|--:|",
        ]
    )
    for item in alternatives:
        lines.append(
            f"| {_escape_table(item['name'])} | {ordinal(item['bestRank'])} | "
            f"{ordinal(item['worstRank'])} | {item['totalMovement']:g} | "
            f"{item['positionChangeCount']} |"
        )

    return "\n".join(lines)


def _ranking_agreement_markdown(facts):
    agreement = facts.get("rankingAgreement") or {}
    transitions = agreement.get("transitions") or []
    if not transitions:
        return ""

    lines = ["### Phase-to-phase agreement", ""]
    strongest = max(transitions, key=lambda item: item["coefficient"])
    weakest = min(transitions, key=lambda item: item["coefficient"])

    if len(transitions) == 1:
        lines.append(
            f"The consecutive rankings have a Spearman coefficient of "
            f"**{fmt(transitions[0]['coefficient'])}**."
        )
    else:
        lines.append(
            f"The strongest consecutive ranking agreement was "
            f"**{fmt(strongest['coefficient'])}** between "
            f"**{phase_label(strongest['fromPhase'])}** and "
            f"**{phase_label(strongest['toPhase'])}**."
        )
        if weakest != strongest:
            lines.append(
                f"The weakest consecutive agreement was "
                f"**{fmt(weakest['coefficient'])}** between "
                f"**{phase_label(weakest['fromPhase'])}** and "
                f"**{phase_label(weakest['toPhase'])}**."
            )

    stabilization_phase = agreement.get("stabilizationPhase")
    if stabilization_phase is not None:
        lines.append(
            f"The complete ranking remained unchanged from "
            f"**{phase_label(stabilization_phase)}** through completion."
        )

    lines.extend(["", "| Transition | Spearman ρ |", "|:--|--:|"])
    for transition in transitions:
        lines.append(
            f"| {phase_label(transition['fromPhase'])} → "
            f"{phase_label(transition['toPhase'])} | "
            f"{fmt(transition['coefficient'])} |"
        )

    return "\n".join(lines)


def _pairwise_matrix(phase):
    alternatives = phase.get("alternatives") or []
    if len(alternatives) < 2 or len(alternatives) > _PAIRWISE_MATRIX_MAX_ALTERNATIVES:
        return []

    pair_values = _pair_lookup(phase)
    header = "| Alternative | " + " | ".join(
        _escape_table(item["name"]) for item in alternatives
    ) + " |"
    alignment = "|:--|" + "--:|" * len(alternatives)
    rows = ["", header, alignment]

    for left in alternatives:
        values = []
        for right in alternatives:
            if left["alternativeId"] == right["alternativeId"]:
                values.append("—")
                continue
            value = pair_values.get(
                frozenset((left["alternativeId"], right["alternativeId"]))
            )
            values.append(_percentage(value))
        rows.append(
            f"| {_escape_table(left['name'])} | " + " | ".join(values) + " |"
        )
    return rows


def _relationship_phase_markdown(phase, *, degenerate):
    lines = [f"**{phase_label(phase['phase'])}**", ""]
    alternatives = phase.get("alternatives") or []
    pairs = phase.get("pairs") or []

    if degenerate:
        lines.append(
            "No relative separation is observable in the available standardized "
            "results: every pair is **0%** apart on the execution-wide scale."
        )
    elif pairs:
        closest = phase.get("closestPairs") or []
        if len(closest) == 1:
            left, right = _pair_names(closest[0])
            lines.append(
                f"The closest pair is **{left}** and **{right}**, with a relative "
                f"separation of **{_percentage(closest[0]['relativeSeparation'])}**."
            )
        elif closest:
            names = "; ".join(
                f"{item['leftAlternative']} ↔ {item['rightAlternative']}"
                for item in closest[:4]
            )
            suffix = "" if len(closest) <= 4 else f"; and {len(closest) - 4} more"
            lines.append(
                f"**{len(closest)} pairs** share the minimum relative separation of "
                f"**{_percentage(closest[0]['relativeSeparation'])}**: {names}{suffix}."
            )

        winner_pair = phase.get("winnerToRunnerUp")
        if winner_pair and len(alternatives) >= 2:
            lines.append(
                f"The winner **{alternatives[0]['name']}** and runner-up "
                f"**{alternatives[1]['name']}** are separated by "
                f"**{_percentage(winner_pair['relativeSeparation'])}**."
            )

        furthest = phase.get("furthestPairs") or []
        if len(furthest) == 1 and (
            not closest
            or furthest[0]["relativeSeparation"]
            - closest[0]["relativeSeparation"]
            > _RELATIONSHIP_EPSILON
        ):
            left, right = _pair_names(furthest[0])
            lines.append(
                f"The widest separation in this phase is between **{left}** and "
                f"**{right}** at **{_percentage(furthest[0]['relativeSeparation'])}**."
            )

        mean_separation = phase.get("meanSeparation")
        if finite(mean_separation) and len(pairs) >= 3:
            lines.append(
                f"Across all alternative pairs, the mean relative separation is "
                f"**{_percentage(mean_separation)}**."
            )

    matrix = _pairwise_matrix(phase)
    if matrix:
        lines.extend(matrix)
    elif len(alternatives) > _PAIRWISE_MATRIX_MAX_ALTERNATIVES:
        lines.extend(
            [
                "",
                f"The full pairwise table is omitted because this phase contains "
                f"**{len(alternatives)} alternatives**; the interactive Heatmap and "
                "Network remain available in Visualizations.",
            ]
        )

    return "\n".join(lines)


def _alternative_relationships_markdown(facts):
    relationships = facts.get("alternativeRelationships") or {}
    phases = relationships.get("phases") or []
    if not phases:
        return ""

    normalization = relationships.get("normalization") or {}
    lines = ["### Alternative relationships", ""]
    lines.append(
        "Relative separation compares alternatives pairwise using the finite "
        "standardized result range observed across this execution. **0%** means "
        "no observed separation on that scale; the percentages are not "
        "probabilities, confidence values, or percentages by which one alternative "
        "is better than another."
    )

    for phase in phases:
        lines.extend(
            [
                "",
                _relationship_phase_markdown(
                    phase,
                    degenerate=normalization.get("degenerate") is True,
                ),
            ]
        )

    unavailable = relationships.get("unavailablePhases") or []
    if unavailable and phases:
        labels = ", ".join(phase_label(item.get("phase")) for item in unavailable)
        lines.extend(
            [
                "",
                f"Pairwise separation could not be calculated for **{labels}** "
                "because complete finite standardized scores were not available.",
            ]
        )

    return "\n".join(lines)


def _relationship_transition_events(facts, from_phase, to_phase):
    relationships = facts.get("alternativeRelationships") or {}
    transition = next(
        (
            item
            for item in relationships.get("transitions") or []
            if item.get("fromPhase") == from_phase and item.get("toPhase") == to_phase
        ),
        None,
    )
    if not transition:
        return []

    events = []
    decrease = transition.get("largestDecrease")
    increase = transition.get("largestIncrease")

    if decrease:
        events.append(
            f"the relative separation between **{decrease['leftAlternative']}** and "
            f"**{decrease['rightAlternative']}** decreased from "
            f"**{_percentage(decrease['fromSeparation'])}** to "
            f"**{_percentage(decrease['toSeparation'])}** "
            f"({_percentage_points(decrease['change'])})"
        )
    if increase:
        events.append(
            f"the relative separation between **{increase['leftAlternative']}** and "
            f"**{increase['rightAlternative']}** increased from "
            f"**{_percentage(increase['fromSeparation'])}** to "
            f"**{_percentage(increase['toSeparation'])}** "
            f"({_percentage_points(increase['change'])})"
        )

    pair_changes = transition.get("pairChanges") or []
    if pair_changes and not decrease and not increase:
        events.append("all comparable pairwise relative separations were unchanged")

    return events


def _phase_highlights_markdown(facts):
    highlights = facts.get("phaseHighlights") or []
    if not highlights:
        return ""

    lines = ["### Phase highlights", ""]
    for highlight in highlights:
        events = []
        leader_change = highlight.get("leaderChange")
        if leader_change:
            events.append(
                f"the leader changed from **{leader_change['fromAlternative']}** "
                f"to **{leader_change['toAlternative']}**"
            )

        movements = highlight.get("largestMovements") or []
        if movements:
            movement_parts = []
            for movement in movements:
                direction = "up" if movement["positionChange"] > 0 else "down"
                amount = abs(movement["positionChange"])
                movement_parts.append(
                    f"**{movement['name']}** moved {direction} **{amount:g}** "
                    f"position{'s' if amount != 1 else ''}"
                )
            events.append("; ".join(movement_parts))
        elif not highlight.get("rankingChanged"):
            events.append("the ranking order did not change")

        events.extend(
            _relationship_transition_events(
                facts,
                highlight["fromPhase"],
                highlight["toPhase"],
            )
        )

        consensus_change = highlight.get("consensusChange")
        if consensus_change is not None:
            if consensus_change > 0:
                events.append(f"consensus increased by **{fmt(consensus_change)}**")
            elif consensus_change < 0:
                events.append(
                    f"consensus decreased by **{fmt(abs(consensus_change))}**"
                )
            else:
                events.append("consensus was unchanged")

        if not events:
            continue

        transition = (
            f"{phase_label(highlight['fromPhase'])} → "
            f"{phase_label(highlight['toPhase'])}"
        )
        lines.append(f"- **{transition}:** " + "; ".join(events) + ".")

    return "\n".join(lines) if len(lines) > 2 else ""


def _consensus_markdown(consensus):
    if not consensus["enabled"] or not consensus["points"]:
        return ""

    sentences = []
    if len(consensus["points"]) == 1:
        sentences.append(
            f"The recorded consensus measure is **{fmt(consensus['finalMeasure'])}**."
        )
    else:
        change = consensus["change"]
        direction = (
            "increased"
            if change > 0
            else "decreased"
            if change < 0
            else "remained unchanged"
        )
        sentences.append(
            f"Consensus {direction} from **{fmt(consensus['initialMeasure'])}** to "
            f"**{fmt(consensus['finalMeasure'])}** "
            f"(**{'+' if change > 0 else ''}{fmt(change)}**)."
        )

        monotonic_direction = consensus.get("monotonicDirection")
        if monotonic_direction == "nondecreasing":
            sentences.append(
                "The recorded consensus series did not decrease between any "
                "consecutive measured phases."
            )
        elif monotonic_direction == "nonincreasing":
            sentences.append(
                "The recorded consensus series did not increase between any "
                "consecutive measured phases."
            )
        elif monotonic_direction == "constant":
            sentences.append("The recorded consensus measure remained constant.")
        elif monotonic_direction == "mixed":
            sentences.append(
                "Consensus changed in both directions across the recorded phases."
            )

        largest_increase = consensus.get("largestIncrease")
        if largest_increase:
            sentences.append(
                f"The largest increase was **+{fmt(largest_increase['change'])}** "
                f"from **{phase_label(largest_increase['fromPhase'])}** to "
                f"**{phase_label(largest_increase['toPhase'])}**."
            )

        largest_decrease = consensus.get("largestDecrease")
        if largest_decrease:
            sentences.append(
                f"The largest decrease was **{fmt(largest_decrease['change'])}** "
                f"from **{phase_label(largest_decrease['fromPhase'])}** to "
                f"**{phase_label(largest_decrease['toPhase'])}**."
            )

    if consensus["threshold"] is not None:
        if consensus["reached"]:
            sentences.append(
                f"The required threshold of **{fmt(consensus['threshold'])}** was "
                f"first reached in **{phase_label(consensus['firstReachedPhase'])}**."
            )
        else:
            gap = consensus.get("finalGapToThreshold")
            if gap is not None:
                sentences.append(
                    f"The final consensus measure remained **{fmt(gap)}** below the "
                    f"required threshold of **{fmt(consensus['threshold'])}**."
                )

    return "### Consensus\n\n" + " ".join(sentences)


def _participation_markdown(participants):
    current_count = participants.get("currentCount", 0)
    if not current_count:
        return ""

    completed = participants.get("evaluationCompletedCurrentCount", 0)
    accepted = participants.get("acceptedCurrentCount", 0)
    historical = participants.get("historicalCount", 0)
    phase_counts = participants.get("phaseCounts") or []
    count_changed = (
        len(phase_counts) >= 2
        and not participants.get("participantCountStableAcrossPhases")
    )

    noteworthy = (
        completed != current_count
        or accepted != current_count
        or historical > current_count
        or count_changed
    )
    if not noteworthy:
        return ""

    sentences = []
    if completed != current_count:
        sentences.append(
            f"At completion, **{completed} of {current_count}** current participants "
            "are recorded with a completed alternative evaluation."
        )

    if accepted != current_count:
        sentences.append(
            f"**{accepted} of {current_count}** current participants are recorded as "
            "having accepted the Issue invitation."
        )

    if historical > current_count:
        sentences.append(
            f"The stored history contains **{historical}** participant identities, "
            f"while **{current_count}** remain in the current participant set."
        )

    if count_changed:
        change = participants.get("participantCountChange")
        if change is not None:
            direction = "increased" if change > 0 else "decreased"
            sentences.append(
                f"Across available phase snapshots, the participant count {direction} "
                f"from **{phase_counts[0]['participantCount']}** to "
                f"**{phase_counts[-1]['participantCount']}**."
            )

    return "### Participation\n\n" + " ".join(sentences) if sentences else ""


def build_issue_interpretation(facts):
    sections = [
        _final_ranking_markdown(facts),
        _ranking_evolution_markdown(facts),
        _alternative_relationships_markdown(facts),
        _ranking_stability_markdown(facts),
        _ranking_agreement_markdown(facts),
        _phase_highlights_markdown(facts),
        _consensus_markdown(facts["consensus"]),
        _participation_markdown(facts["participants"]),
    ]
    return "\n\n".join(section for section in sections if section)
