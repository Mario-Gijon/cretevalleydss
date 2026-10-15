from .common import finite, ordinal, phase_label


def _names(items, *, key="name", bold=True):
    values = [item.get(key) for item in items]
    values = [value.strip() for value in values if isinstance(value, str) and value.strip()]
    if bold:
        values = [f"**{value}**" for value in values]
    if len(values) < 2:
        return values[0] if values else ""
    if len(values) == 2:
        return f"{values[0]} and {values[1]}"
    return ", ".join(values[:-1]) + f", and {values[-1]}"


def _top_rank_group(ranking):
    valid = [item for item in ranking or [] if finite(item.get("rank"))]
    if not valid:
        return []
    top_rank = min(item["rank"] for item in valid)
    return [item for item in valid if item["rank"] == top_rank]


def _next_rank_group(ranking, top_rank):
    next_ranks = [
        item["rank"]
        for item in ranking or []
        if finite(item.get("rank")) and item["rank"] > top_rank
    ]
    if not next_ranks:
        return []
    next_rank = min(next_ranks)
    return [item for item in ranking if item.get("rank") == next_rank]


def _overall_outcome(facts):
    ranking = facts.get("finalRanking") or []
    if len(ranking) == 1:
        return (
            "### Overall outcome\n\n"
            f"Only **{ranking[0]['name']}** appears in the final recorded result, "
            "so this issue does not provide a comparative ranking."
        )

    if not ranking:
        return (
            "### Overall outcome\n\n"
            "The available generic results do not include a final ranking, so an "
            "overall order cannot be described."
        )

    top_group = _top_rank_group(ranking)
    if not top_group:
        return (
            "### Overall outcome\n\n"
            "The available generic results do not include valid final ranking "
            "positions, so an overall order cannot be described."
        )

    top_rank = min(item["rank"] for item in top_group)
    if top_rank == 1 and len(top_group) > 1:
        sentence = f"{_names(top_group)} share the highest recorded rank."
    elif top_rank == 1:
        sentence = f"**{top_group[0]['name']}** finished first in the recorded ranking."
    else:
        sentence = (
            f"**{_names(top_group, bold=False)}** holds the highest available "
            f"recorded position ({ordinal(top_rank)}), but no first-place rank is "
            "recorded."
        )

    next_group = _next_rank_group(ranking, top_rank)
    if next_group:
        next_names = _names(next_group)
        if len(top_group) == 1 and top_rank == 1:
            sentence += f" It was followed by {next_names}."
        else:
            sentence += f" The next recorded position belongs to {next_names}."

    return "### Overall outcome\n\n" + sentence


def _phase_relationship(facts):
    relationships = facts.get("alternativeRelationships") or {}
    phases = relationships.get("phases") or []
    final_phase = facts.get("finalPhase")
    if final_phase is None and len(phases) == 1:
        return phases[0]
    return next((item for item in phases if item.get("phase") == final_phase), None)


def _pair_name(pair):
    return f"**{pair['leftAlternative']}** and **{pair['rightAlternative']}**"


def _alternative_relationships(facts):
    phase = _phase_relationship(facts)
    if not phase:
        return None

    alternatives = phase.get("alternatives") or []
    pairs = phase.get("pairs") or []
    if len(alternatives) < 2 or not pairs:
        return None

    if all(finite(item.get("relativeSeparation")) for item in pairs) and all(
        item["relativeSeparation"] == 0 for item in pairs
    ):
        return (
            "### Alternative relationships\n\n"
            f"The comparable recorded scores in {phase_label(phase.get('phase'))} "
            "are equal, so they do not distinguish the alternatives."
        )

    if len(alternatives) < 3:
        return None

    closest = phase.get("closestPairs") or []
    furthest = phase.get("furthestPairs") or []
    sentences = []

    if len(closest) == 1:
        pair = closest[0]
        if pair.get("relativeSeparation") == 0:
            sentences.append(
                f"The recorded scores for {_pair_name(pair)} are equal."
            )
        else:
            sentences.append(
                f"Among the recorded scores, {_pair_name(pair)} were the closest "
                "pair."
            )
    elif closest:
        if closest[0].get("relativeSeparation") == 0:
            sentences.append("Several pairs had equal recorded scores.")
        else:
            sentences.append(
                "Several pairs tied for the closest recorded scores."
            )

    if len(furthest) == 1:
        widest = furthest[0]
        same_as_closest = any(
            {
                closest_pair.get("leftAlternativeId"),
                closest_pair.get("rightAlternativeId"),
            }
            == {widest.get("leftAlternativeId"), widest.get("rightAlternativeId")}
            for closest_pair in closest
        )
        if not same_as_closest and widest.get("relativeSeparation") != 0:
            sentences.append(
                f"The widest difference in recorded scores was between "
                f"{_pair_name(widest)}."
            )
    elif furthest:
        sentences.append("Several pairs tied for the widest score difference.")

    if not sentences:
        return None
    return "### Alternative relationships\n\n" + " ".join(sentences)


def _rankings_by_phase(facts):
    evolution = facts.get("rankingEvolution") or {}
    phases = evolution.get("phases") or []
    series = evolution.get("series") or []
    rankings = []
    for index, phase in enumerate(phases):
        ranking = []
        for item in series:
            values = item.get("values") or []
            rank = values[index] if index < len(values) else None
            if finite(rank):
                ranking.append(
                    {
                        "alternativeId": item.get("alternativeId"),
                        "name": item.get("name"),
                        "rank": rank,
                    }
                )
        rankings.append({"phase": phase, "ranking": ranking})
    return rankings


def _leader_group(ranking):
    return _top_rank_group(ranking)


def _leader_ids(group):
    return {item.get("alternativeId") for item in group}


def _decision_process(facts):
    rankings = _rankings_by_phase(facts)
    if len(rankings) < 2:
        return None

    valid = [item for item in rankings if item["ranking"]]
    if not valid:
        return None

    first = valid[0]
    last = valid[-1]
    first_leaders = _leader_group(first["ranking"])
    last_leaders = _leader_group(last["ranking"])
    same_leaders = _leader_ids(first_leaders) == _leader_ids(last_leaders)
    all_phases_ranked = len(valid) == len(rankings)
    all_same_lead = all(
        _leader_ids(_leader_group(item["ranking"])) == _leader_ids(first_leaders)
        for item in valid
    )
    paragraphs = []

    agreement = facts.get("rankingAgreement") or {}
    stabilization_phase = agreement.get("stabilizationPhase")
    if all_phases_ranked and all_same_lead and stabilization_phase == rankings[0]["phase"]:
        paragraphs.append("The full ranking remained unchanged throughout the recorded phases.")
    elif all_phases_ranked and all_same_lead:
        paragraphs.append(
            f"{_names(first_leaders)} stayed at the top throughout the recorded phases."
        )
    elif first_leaders and last_leaders and not same_leaders:
        if len(first_leaders) == 1 and len(last_leaders) == 1:
            paragraphs.append(
                f"The leading alternative changed between the first and final "
                f"recorded rankings: **{first_leaders[0]['name']}** led in "
                f"{phase_label(first['phase'])}, while **{last_leaders[0]['name']}** "
                f"finished first in {phase_label(last['phase'])}."
            )
        else:
            paragraphs.append(
                f"The top-ranked group changed between the first and final recorded "
                f"rankings: {_names(first_leaders)} led in {phase_label(first['phase'])}, "
                f"while {_names(last_leaders)} held the top rank in "
                f"{phase_label(last['phase'])}."
            )
    elif first_leaders and last_leaders and same_leaders and not all_same_lead:
        paragraphs.append(
            f"The top-ranked group changed during the process and returned to "
            f"{_names(last_leaders)} by the final recorded ranking."
        )
    elif first_leaders and last_leaders:
        paragraphs.append(
            f"{_names(first_leaders)} led in {phase_label(first['phase'])}, and "
            f"{_names(last_leaders)} held the top rank in {phase_label(last['phase'])}; "
            "some recorded phases do not include ranking data."
        )
    elif last_leaders:
        paragraphs.append(
            f"{_names(last_leaders)} held the top rank in {phase_label(last['phase'])}; "
            "earlier recorded phases do not provide enough ranking data to describe "
            "how the lead developed."
        )

    if stabilization_phase is not None:
        if stabilization_phase == rankings[0]["phase"]:
            if not paragraphs:
                paragraphs.append("The full ranking remained unchanged throughout the recorded phases.")
        else:
            paragraphs.append(
                f"The full ranking settled from {phase_label(stabilization_phase)} onward."
            )

    first_last_leaders = _leader_ids(first_leaders) | _leader_ids(last_leaders)
    changes = [
        item
        for item in (facts.get("rankingEvolution") or {}).get("changes") or []
        if finite(item.get("positionChange"))
        and item["positionChange"] != 0
        and item.get("alternativeId") not in first_last_leaders
        and finite(item.get("initialRank"))
        and finite(item.get("finalRank"))
    ]
    if changes:
        largest_shift = max(abs(item["positionChange"]) for item in changes)
        movers = [item for item in changes if abs(item["positionChange"]) == largest_shift]
        if len(movers) == 1:
            mover = movers[0]
            direction = "up" if mover["positionChange"] > 0 else "down"
            paragraphs.append(
                f"Among the other alternatives, **{mover['name']}** moved {direction} "
                f"from {ordinal(mover['initialRank'])} to "
                f"{ordinal(mover['finalRank'])} between the first and final rankings."
            )
        else:
            paragraphs.append(
                f"Among the other alternatives, {_names(movers)} shared the largest "
                "net position change between the first and final rankings."
            )

    if not paragraphs:
        return None
    return "### Decision process\n\n" + " ".join(paragraphs)


def _consensus(facts):
    consensus = facts.get("consensus") or {}
    if consensus.get("enabled") is not True:
        return None

    points = consensus.get("points") or []
    if not points:
        return (
            "### Consensus\n\n"
            "Issue-level consensus tracking was enabled, but no measure was recorded "
            "for the completed phases."
        )

    threshold = consensus.get("threshold")
    if not finite(threshold):
        return (
            "### Consensus\n\n"
            "An issue-level consensus measure was recorded, but no configured "
            "threshold is available for comparison."
        )

    sentences = []
    if len(points) > 1:
        change = consensus.get("change")
        if finite(change):
            if change > 0:
                sentences.append(
                    "The recorded issue-level consensus measure rose between the first "
                    "and final measurements."
                )
            elif change < 0:
                sentences.append(
                    "The recorded issue-level consensus measure fell between the first "
                    "and final measurements."
                )
            else:
                sentences.append(
                    "The recorded issue-level consensus measure was unchanged between "
                    "the first and final measurements."
                )

    reached_phase = consensus.get("firstReachedPhase")
    if reached_phase is not None:
        sentences.append(
            f"It first met the configured threshold in {phase_label(reached_phase)}."
        )
        if finite(consensus.get("finalMeasure")) and consensus["finalMeasure"] < threshold:
            sentences.append("The final recorded measure was below that threshold.")
    else:
        sentences.append("No recorded measure met the configured threshold.")

    return "### Consensus\n\n" + " ".join(sentences)


def _participation(facts):
    participants = facts.get("participants") or {}
    historical = participants.get("historicalCount", 0)
    current = participants.get("currentCount", 0)
    completed = participants.get("evaluationCompletedCurrentCount", 0)
    phase_counts = participants.get("phaseCounts") or []
    sentences = []

    if historical > 0 and historical != current:
        sentences.append(
            f"Stored history contains **{historical}** participant identities, while "
            f"the current participant set contains **{current}**. These are different "
            "records and do not establish how many people contributed inputs to the "
            "completed result."
        )

    if current and completed != current:
        sentences.append(
            f"The current participant set records **{completed} of {current}** people "
            "as having completed an alternative evaluation."
        )

    if len(phase_counts) >= 2:
        counts = [
            entry.get("participantCount")
            for entry in phase_counts
            if finite(entry.get("participantCount"))
        ]
        if len(counts) >= 2 and min(counts) != max(counts):
            sentences.append(
                f"Phase-start snapshots ranged from **{min(counts)}** to "
                f"**{max(counts)}** participants. These counts do not identify "
                "individual contributions."
            )

    if not sentences:
        return None
    return "### Participation records\n\n" + " ".join(sentences)


def build_issue_interpretation(facts):
    """Summarize common issue results without assigning model-specific meaning."""
    sections = [
        _overall_outcome(facts),
        _alternative_relationships(facts),
        _decision_process(facts),
        _consensus(facts),
        _participation(facts),
    ]
    return "\n\n".join(section for section in sections if section)
