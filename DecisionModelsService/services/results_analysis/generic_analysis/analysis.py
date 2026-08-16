from services.results_analysis.contracts import normalize_analysis_result

from .alternative_relationships import alternative_relationships
from .common import attempt_summary, fmt, ranking
from .consensus import issue_consensus, round_consensus
from .interpretation import build_issue_interpretation
from .participation import participant_summary
from .ranking import (
    leader_changes,
    phase_highlights,
    ranking_agreement,
    ranking_evolution,
    ranking_stability,
    rankings_by_phase,
)


def _ranking_markdown(ranking_entries, heading, intro):
    if not ranking_entries:
        return ""

    lines = [heading, "", intro.format(name=ranking_entries[0]["name"]), ""]
    for index, entry in enumerate(ranking_entries, start=1):
        name = f"**{entry['name']}**" if index == 1 else entry["name"]
        lines.append(f"{index}. {name}")
    return "\n".join(lines)


def analyze_round(context):
    """Analyze one executed round without interpreting model-specific semantics."""
    execution = context.get("execution") or {}
    round_ranking = ranking(context, execution.get("ranking"))
    consensus = round_consensus(context)
    attempts = attempt_summary(context.get("attempts"))

    facts = {
        "phase": context.get("phase"),
        "ranking": round_ranking,
        "leader": round_ranking[0] if round_ranking else None,
        "consensus": consensus,
        "executionAttempts": attempts,
    }

    sections = []
    ranking_section = _ranking_markdown(
        round_ranking,
        "### Ranking",
        "**{name}** is ranked first in this round.",
    )
    if ranking_section:
        sections.append(ranking_section)

    if consensus["measure"] is not None:
        if consensus["threshold"] is None:
            text = (
                f"The consensus measure for this round is "
                f"**{fmt(consensus['measure'])}**."
            )
        elif consensus["reached"]:
            text = (
                f"The consensus measure is **{fmt(consensus['measure'])}**, "
                f"meeting the required threshold of "
                f"**{fmt(consensus['threshold'])}**."
            )
        else:
            difference = consensus["threshold"] - consensus["measure"]
            text = (
                f"The consensus measure is **{fmt(consensus['measure'])}**, "
                f"which is **{fmt(difference)}** below the required threshold "
                f"of **{fmt(consensus['threshold'])}**."
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


def _issue_attempt_summary(rounds):
    attempts = [
        attempt
        for round_entry in rounds
        for attempt in (round_entry.get("attempts") or [])
    ]
    summary = attempt_summary(attempts)
    summary["hadRetries"] = any(
        len(round_entry.get("attempts") or []) > 1 for round_entry in rounds
    )
    return {"executedRounds": len(rounds), **summary}


def _process_overview(rounds, leaders, agreement, consensus, participants):
    """Keep compact derived facts for consumers without rendering an Overview section."""
    return {
        "phaseCount": len(rounds),
        "leaderChangeCount": len(leaders),
        "stabilizationPhase": agreement.get("stabilizationPhase"),
        "consensus": {
            "enabled": consensus.get("enabled") is True,
            "change": consensus.get("change"),
            "reached": consensus.get("reached"),
            "finalGapToThreshold": consensus.get("finalGapToThreshold"),
        },
        "participation": {
            "completedCount": participants.get("evaluationCompletedCurrentCount", 0),
            "totalCount": participants.get("currentCount", 0),
            "completionRate": participants.get("evaluationCompletionRate"),
        },
    }


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

    relationships = facts.get("alternativeRelationships") or {}
    relationship_phases = relationships.get("phases") or []
    if relationship_phases:
        result.append(
            {
                "type": "alternativeRelationships",
                "phases": [
                    {
                        "phase": phase["phase"],
                        "alternatives": phase["alternatives"],
                        "pairs": [
                            {
                                "leftAlternativeId": pair["leftAlternativeId"],
                                "rightAlternativeId": pair["rightAlternativeId"],
                                "relativeSeparation": pair["relativeSeparation"],
                            }
                            for pair in phase["pairs"]
                        ],
                    }
                    for phase in relationship_phases
                ],
            }
        )

    stability = facts["rankingStability"]["alternatives"]
    if len(evolution["phases"]) >= 2 and len(stability) >= 2:
        result.append({"type": "rankingStability", "alternatives": stability})

    agreement = facts["rankingAgreement"]
    if agreement["transitions"]:
        result.append(
            {
                "type": "rankingAgreement",
                "transitions": agreement["transitions"],
                "stabilizationPhase": agreement["stabilizationPhase"],
            }
        )

    return result


def analyze_issue(context):
    """Analyze a completed issue without interpreting model-specific semantics."""
    issue = context.get("issue") or {}
    rounds = _executed_rounds(context)
    rankings = rankings_by_phase(context, rounds)
    final_ranking = rankings[-1]["ranking"] if rankings else []

    evolution = ranking_evolution(context, rankings)
    leaders = leader_changes(rankings)
    stability = ranking_stability(context, rankings)
    agreement = ranking_agreement(rankings)
    consensus = issue_consensus(context, rounds)
    participants = participant_summary(context, rounds)
    highlights = phase_highlights(rankings, consensus["points"])
    relationships = alternative_relationships(context, rounds)

    facts = {
        "issueId": issue.get("id"),
        "issueName": issue.get("name"),
        "executedRounds": len(rounds),
        "firstPhase": rounds[0]["phase"] if rounds else None,
        "finalPhase": rounds[-1]["phase"] if rounds else None,
        "finalRanking": final_ranking,
        "rankingEvolution": evolution,
        "rankingStability": stability,
        "rankingAgreement": agreement,
        "leaderChanges": leaders,
        "phaseHighlights": highlights,
        "alternativeRelationships": relationships,
        "consensus": consensus,
        "participants": participants,
        "execution": _issue_attempt_summary(rounds),
    }
    facts["processOverview"] = _process_overview(
        rounds,
        leaders,
        agreement,
        consensus,
        participants,
    )

    return normalize_analysis_result(
        {
            "facts": facts,
            "interpretation": build_issue_interpretation(facts),
            "visualizations": _visualizations(facts),
        }
    )
