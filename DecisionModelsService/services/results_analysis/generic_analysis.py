from math import isfinite

from services.results_analysis.contracts import normalize_analysis_result


def _finite(value):
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and isfinite(value)
    )


def _fmt(value):
    return f"{value:.4f}".rstrip("0").rstrip(".") if _finite(value) else "—"


def _ordinal(value):
    value = int(value)
    if 10 <= value % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def _alternative_name(context, alternative_id):
    alternatives = (
        (context.get("semanticDirectory") or {}).get("alternativesById") or {}
    )
    return (alternatives.get(alternative_id) or {}).get("name") or alternative_id


def _ranking(context, entries):
    result = []
    for entry in entries or []:
        alternative_id = entry.get("alternativeId")
        rank = entry.get("rank")
        if alternative_id is None or not _finite(rank):
            continue
        result.append(
            {
                "alternativeId": alternative_id,
                "name": _alternative_name(context, alternative_id),
                "rank": rank,
            }
        )
    return sorted(result, key=lambda item: (item["rank"], item["name"]))


def _attempt_summary(entries):
    entries = entries or []
    return {
        "total": len(entries),
        "succeeded": sum(item.get("status") == "succeeded" for item in entries),
        "failed": sum(item.get("status") == "failed" for item in entries),
        "applied": sum(
            item.get("applicationStatus") == "applied" for item in entries
        ),
        "hadRetries": len(entries) > 1,
    }


def _consensus_configuration(context):
    return (
        context.get("consensus")
        or (context.get("issue") or {}).get("consensus")
        or {}
    )


def _round_consensus(context):
    measure = (context.get("execution") or {}).get("consensusMeasure")
    configuration = _consensus_configuration(context)
    threshold = configuration.get("threshold")

    measure = measure if _finite(measure) else None
    threshold = threshold if _finite(threshold) else None

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


def _ranking_markdown(ranking, heading, intro):
    if not ranking:
        return ""

    lines = [
        heading,
        "",
        intro.format(name=ranking[0]["name"]),
        "",
    ]
    for index, entry in enumerate(ranking, start=1):
        name = f"**{entry['name']}**" if index == 1 else entry["name"]
        lines.append(f"{index}. {name}")
    return "\n".join(lines)


def analyze_round(context):
    """Analyze one executed round without interpreting model-specific semantics."""
    execution = context.get("execution") or {}
    ranking = _ranking(context, execution.get("ranking"))
    consensus = _round_consensus(context)
    attempts = _attempt_summary(context.get("attempts"))

    facts = {
        "phase": context.get("phase"),
        "ranking": ranking,
        "leader": ranking[0] if ranking else None,
        "consensus": consensus,
        "executionAttempts": attempts,
    }

    sections = []
    ranking_section = _ranking_markdown(
        ranking,
        "### Ranking",
        "**{name}** is ranked first in this round.",
    )
    if ranking_section:
        sections.append(ranking_section)

    if consensus["measure"] is not None:
        if consensus["threshold"] is None:
            text = (
                f"The consensus measure for this round is "
                f"**{_fmt(consensus['measure'])}**."
            )
        elif consensus["reached"]:
            text = (
                f"The consensus measure is **{_fmt(consensus['measure'])}**, "
                f"meeting the required threshold of "
                f"**{_fmt(consensus['threshold'])}**."
            )
        else:
            difference = consensus["threshold"] - consensus["measure"]
            text = (
                f"The consensus measure is **{_fmt(consensus['measure'])}**, "
                f"which is **{_fmt(difference)}** below the required threshold "
                f"of **{_fmt(consensus['threshold'])}**."
            )
        sections.append(f"### Consensus\n\n{text}")

    if attempts["failed"] or attempts["hadRetries"]:
        sections.append(
            "### Execution\n\n"
            f"This round recorded **{attempts['total']}** execution attempts: "
            f"**{attempts['succeeded']}** succeeded and "
            f"**{attempts['failed']}** failed."
        )

    return normalize_analysis_result(
        {
            "facts": facts,
            "interpretation": "\n\n".join(sections),
            "visualizations": [],
        }
    )


def _executed_rounds(context):
    return sorted(context.get("rounds") or [], key=lambda item: item["phase"])


def _rankings_by_phase(context, rounds):
    return [
        {
            "phase": round_entry["phase"],
            "ranking": _ranking(
                context,
                (round_entry.get("execution") or {}).get("ranking"),
            ),
        }
        for round_entry in rounds
    ]


def _ranking_evolution(context, rankings_by_phase):
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
            _alternative_name(context, alternative_id),
        )
    )

    series = [
        {
            "alternativeId": alternative_id,
            "name": _alternative_name(context, alternative_id),
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
                if _finite(initial_rank) and _finite(final_rank)
                else None
            )
            changes.append(
                {
                    "alternativeId": alternative_id,
                    "name": _alternative_name(context, alternative_id),
                    "initialRank": initial_rank,
                    "finalRank": final_rank,
                    "positionChange": change,
                }
            )

    return {
        "phases": phases,
        "series": series,
        "changes": changes,
    }


def _leader_changes(rankings_by_phase):
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


def _issue_consensus(context, rounds):
    configuration = (context.get("issue") or {}).get("consensus") or {}
    threshold = configuration.get("threshold")
    threshold = threshold if _finite(threshold) else None

    points = []
    for round_entry in rounds:
        measure = (round_entry.get("execution") or {}).get("consensusMeasure")
        if _finite(measure):
            points.append({"phase": round_entry["phase"], "value": measure})

    initial = points[0]["value"] if points else None
    final = points[-1]["value"] if points else None

    first_reached = None
    if threshold is not None:
        for point in points:
            if point["value"] >= threshold:
                first_reached = point["phase"]
                break

    return {
        "enabled": configuration.get("enabled") is True,
        "simulated": configuration.get("simulated"),
        "threshold": threshold,
        "maxPhases": configuration.get("maxPhases"),
        "points": points,
        "initialMeasure": initial,
        "finalMeasure": final,
        "change": (
            final - initial
            if initial is not None and final is not None
            else None
        ),
        "reached": (
            first_reached is not None
            if threshold is not None
            else None
        ),
        "firstReachedPhase": first_reached,
    }


def _participant_summary(context):
    participants = context.get("participants") or {}
    historical = participants.get("historicalIdentities") or []
    current = participants.get("current") or []
    completed = sum(
        item.get("evaluationCompleted") is True
        for item in current
    )

    return {
        "historicalCount": len(historical),
        "currentCount": len(current),
        "acceptedCurrentCount": sum(
            item.get("invitationStatus") == "accepted"
            for item in current
        ),
        "evaluationCompletedCurrentCount": completed,
        "evaluationCompletionRate": (
            completed / len(current) if current else None
        ),
    }


def _issue_attempt_summary(rounds):
    attempts = [
        attempt
        for round_entry in rounds
        for attempt in (round_entry.get("attempts") or [])
    ]
    summary = _attempt_summary(attempts)
    summary["hadRetries"] = any(
        len(round_entry.get("attempts") or []) > 1
        for round_entry in rounds
    )

    return {
        "executedRounds": len(rounds),
        **summary,
    }


def _ranking_evolution_markdown(facts):
    evolution = facts["rankingEvolution"]
    if len(evolution["phases"]) < 2:
        return ""

    lines = ["### Ranking evolution", ""]
    leader_changes = facts["leaderChanges"]

    if not leader_changes and facts["finalRanking"]:
        lines.append(
            f"**{facts['finalRanking'][0]['name']}** remained the leading "
            "alternative throughout the executed rounds."
        )
    elif len(leader_changes) == 1:
        change = leader_changes[0]
        lines.append(
            f"The leading alternative changed once: "
            f"**{change['fromAlternative']}** led in phase "
            f"{change['fromPhase']}, while **{change['toAlternative']}** "
            f"led in phase {change['toPhase']}."
        )
    else:
        lines.append(
            f"The leading alternative changed "
            f"**{len(leader_changes)} times** across the executed rounds."
        )

    movements = []
    for item in evolution["changes"]:
        change = item["positionChange"]
        if change is None or change == 0:
            continue

        direction = "moved up" if change > 0 else "moved down"
        movements.append(
            f"- **{item['name']}** {direction} from "
            f"{_ordinal(item['initialRank'])} to "
            f"{_ordinal(item['finalRank'])} "
            f"(**{change:+g}** positions)."
        )

    if movements:
        lines.extend(["", *movements])
    else:
        lines.extend(
            ["", "The final ranking is unchanged from the first executed round."]
        )

    return "\n".join(lines)


def _consensus_markdown(consensus):
    if not consensus["enabled"] or not consensus["points"]:
        return ""

    lines = ["### Consensus", ""]

    if len(consensus["points"]) == 1:
        lines.append(
            f"The recorded consensus measure is "
            f"**{_fmt(consensus['finalMeasure'])}**."
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
        lines.append(
            f"Consensus {direction} from "
            f"**{_fmt(consensus['initialMeasure'])}** to "
            f"**{_fmt(consensus['finalMeasure'])}** "
            f"(**{'+' if change > 0 else ''}{_fmt(change)}**)."
        )

    if consensus["threshold"] is not None:
        lines.append("")
        if consensus["reached"]:
            lines.append(
                f"The required threshold of "
                f"**{_fmt(consensus['threshold'])}** was first reached "
                f"in phase **{consensus['firstReachedPhase']}**."
            )
        else:
            lines.append(
                f"The final recorded consensus measure did not reach the "
                f"required threshold of "
                f"**{_fmt(consensus['threshold'])}**."
            )

    return "\n".join(lines)


def _issue_interpretation(facts):
    sections = []

    evolution = _ranking_evolution_markdown(facts)
    if evolution:
        sections.append(evolution)

    consensus = _consensus_markdown(facts["consensus"])
    if consensus:
        sections.append(consensus)

    participants = facts["participants"]
    if participants["currentCount"]:
        sections.append(
            "### Participation\n\n"
            f"At completion, "
            f"**{participants['evaluationCompletedCurrentCount']} of "
            f"{participants['currentCount']}** current participants are "
            "recorded with a completed evaluation."
        )

    return "\n\n".join(sections)


def _visualizations(facts):
    result = []
    evolution = facts["rankingEvolution"]

    if len(evolution["phases"]) >= 2 and evolution["series"]:
        result.append(
            {
                "type": "rankingEvolution",
                "title": "Ranking evolution",
                "data": {
                    "phases": evolution["phases"],
                    "series": [
                        {
                            "alternativeId": item["alternativeId"],
                            "label": item["name"],
                            "values": item["values"],
                        }
                        for item in evolution["series"]
                    ],
                    "lowerIsBetter": True,
                },
            }
        )

    return result


def analyze_issue(context):
    """Analyze a completed issue without interpreting model-specific semantics."""
    issue = context.get("issue") or {}
    rounds = _executed_rounds(context)
    rankings = _rankings_by_phase(context, rounds)
    final_ranking = rankings[-1]["ranking"] if rankings else []

    facts = {
        "issueId": issue.get("id"),
        "issueName": issue.get("name"),
        "executedRounds": len(rounds),
        "firstPhase": rounds[0]["phase"] if rounds else None,
        "finalPhase": rounds[-1]["phase"] if rounds else None,
        "finalRanking": final_ranking,
        "rankingEvolution": _ranking_evolution(context, rankings),
        "leaderChanges": _leader_changes(rankings),
        "consensus": _issue_consensus(context, rounds),
        "participants": _participant_summary(context),
        "execution": _issue_attempt_summary(rounds),
    }

    return normalize_analysis_result(
        {
            "facts": facts,
            "interpretation": _issue_interpretation(facts),
            "visualizations": _visualizations(facts),
        }
    )
