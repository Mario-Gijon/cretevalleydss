from .common import fmt, ordinal, phase_label


def _process_overview_markdown(facts):
    overview = facts["processOverview"]
    phase_count = overview["phaseCount"]
    sentences = []

    if phase_count == 1:
        sentences.append("The completed decision process contains **1 executed phase**.")
    else:
        sentences.append(
            f"The completed decision process contains **{phase_count} executed phases**."
        )

    leader_changes = overview["leaderChangeCount"]
    if phase_count >= 2:
        if leader_changes == 0:
            sentences.append(
                "The leading alternative did not change between recorded phases."
            )
        elif leader_changes == 1:
            sentences.append("The leading alternative changed **once**.")
        else:
            sentences.append(
                f"The leading alternative changed **{leader_changes} times**."
            )

        stabilization_phase = overview.get("stabilizationPhase")
        if stabilization_phase is not None:
            sentences.append(
                f"The ranking remained unchanged from **{phase_label(stabilization_phase)}** "
                "through completion."
            )

    consensus = overview["consensus"]
    if consensus.get("enabled"):
        if consensus.get("reached") is True:
            sentences.append("The configured consensus threshold was reached.")
        elif consensus.get("reached") is False:
            gap = consensus.get("finalGapToThreshold")
            if gap is not None:
                sentences.append(
                    f"The final consensus measure remained **{fmt(gap)}** below the "
                    "configured threshold."
                )

    participation = overview["participation"]
    if participation.get("totalCount"):
        sentences.append(
            f"At completion, **{participation['completedCount']} of "
            f"{participation['totalCount']}** current participants had a completed "
            "evaluation recorded."
        )

    return "### Process overview\n\n" + " ".join(sentences)


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
            f"| {item['name']} | {ordinal(item['initialRank'])} | "
            f"{ordinal(item['finalRank'])} | {change_label} |"
        )
    if len(rows) > 3:
        lines.extend(rows)

    return "\n".join(lines)


def _ranking_stability_markdown(facts):
    if facts["processOverview"]["phaseCount"] < 2:
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
        names = ", ".join(stable)
        verb = "remained" if len(stable) == 1 else "remained"
        lines.append(
            f"**{names}** {verb} in the same rank position throughout all recorded "
            "transitions."
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
            f"| {item['name']} | {ordinal(item['bestRank'])} | "
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
    if not participants["currentCount"]:
        return ""

    sentences = [
        f"At completion, **{participants['evaluationCompletedCurrentCount']} of "
        f"{participants['currentCount']}** current participants are recorded with a "
        "completed evaluation."
    ]

    phase_counts = participants.get("phaseCounts") or []
    if len(phase_counts) >= 2:
        if participants.get("participantCountStableAcrossPhases"):
            sentences.append(
                f"The recorded participant count remained stable at "
                f"**{phase_counts[0]['participantCount']}** across the available "
                "phase snapshots."
            )
        else:
            change = participants.get("participantCountChange")
            if change is not None:
                direction = "increased" if change > 0 else "decreased"
                sentences.append(
                    f"The recorded participant count {direction} from "
                    f"**{phase_counts[0]['participantCount']}** to "
                    f"**{phase_counts[-1]['participantCount']}** across the available "
                    "phase snapshots."
                )

    return "### Participation\n\n" + " ".join(sentences)


def build_issue_interpretation(facts):
    sections = [
        _process_overview_markdown(facts),
        _ranking_evolution_markdown(facts),
        _ranking_stability_markdown(facts),
        _ranking_agreement_markdown(facts),
        _phase_highlights_markdown(facts),
        _consensus_markdown(facts["consensus"]),
        _participation_markdown(facts["participants"]),
    ]
    return "\n\n".join(section for section in sections if section)
