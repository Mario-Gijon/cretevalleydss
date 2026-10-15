from math import nan

import pytest

from services.results_analysis.generic_analysis.analysis import analyze_issue


def issue_context(
    phase_rankings,
    *,
    consensus_enabled=False,
    consensus_threshold=0.8,
    consensus_measures=None,
    current_participants=None,
    historical_identities=None,
    phase_participant_counts=None,
):
    alternative_ids = {
        item["alternativeId"]
        for ranking in phase_rankings
        for item in (ranking or [])
    }
    names = {alternative_id: alternative_id.title() for alternative_id in alternative_ids}
    rounds = []
    for index, ranking in enumerate(phase_rankings):
        round_entry = {
            "phase": index,
            "execution": {"ranking": ranking or []},
        }
        if consensus_measures and index < len(consensus_measures):
            round_entry["execution"]["consensusMeasure"] = consensus_measures[index]
        if phase_participant_counts is not None:
            round_entry["participants"] = [
                {"id": f"phase-{index}-participant-{participant}"}
                for participant in range(phase_participant_counts[index])
            ]
        rounds.append(round_entry)

    return {
        "issue": {
            "id": "fixture-issue",
            "name": "Fixture issue",
            "consensus": {
                "enabled": consensus_enabled,
                "threshold": consensus_threshold,
            },
        },
        "participants": {
            "historicalIdentities": historical_identities or [],
            "current": current_participants or [],
        },
        "semanticDirectory": {
            "alternativesById": {
                alternative_id: {"name": name}
                for alternative_id, name in names.items()
            }
        },
        "rounds": rounds,
    }


def ranked(*entries):
    """Build common-contract ranking records as (id, rank, optional score)."""
    return [
        {
            "alternativeId": entry[0],
            "rank": entry[1],
            **({"score": entry[2]} if len(entry) > 2 else {}),
        }
        for entry in entries
    ]


def test_single_phase_explains_unique_leader_and_supported_score_relationships():
    result = analyze_issue(
        issue_context(
            [ranked(("alpha", 1, 0.91), ("beta", 2, 0.89), ("gamma", 3, 0.52), ("delta", 4, 0.20))]
        )
    )
    interpretation = result["interpretation"]

    assert "**Alpha** finished first in the recorded ranking." in interpretation
    assert "**Alpha** and **Beta** were the closest pair" in interpretation
    assert "**Alpha** and **Delta**" in interpretation
    assert "### Decision process" not in interpretation
    assert "### Final ranking" not in interpretation
    assert "|" not in interpretation
    assert "1. **Alpha**" not in interpretation
    assert "%" not in interpretation
    assert "ideal solution" not in interpretation.lower()
    assert result["facts"]["finalRanking"] == [
        {"alternativeId": "alpha", "name": "Alpha", "rank": 1},
        {"alternativeId": "beta", "name": "Beta", "rank": 2},
        {"alternativeId": "gamma", "name": "Gamma", "rank": 3},
        {"alternativeId": "delta", "name": "Delta", "rank": 4},
    ]


def test_one_alternative_is_not_described_as_a_comparative_result():
    result = analyze_issue(issue_context([ranked(("alpha", 1, 0.7))]))
    interpretation = result["interpretation"]

    assert "Only **Alpha** appears" in interpretation
    assert "does not provide a comparative ranking" in interpretation
    assert "### Alternative relationships" not in interpretation
    assert "### Decision process" not in interpretation
    assert result["visualizations"] == []


def test_tied_top_rank_is_reported_as_a_shared_position():
    result = analyze_issue(
        issue_context([ranked(("alpha", 1, 0.9), ("beta", 1, 0.9), ("gamma", 3, 0.2))])
    )

    assert "**Alpha** and **Beta** share the highest recorded rank." in result["interpretation"]
    assert "finished first" not in result["interpretation"]
    assert "The recorded scores for **Alpha** and **Beta** are equal." in result["interpretation"]


def test_equal_scores_and_degenerate_score_ranges_are_reported_without_invented_separation():
    result = analyze_issue(
        issue_context([ranked(("alpha", 1, 0.5), ("beta", 2, 0.5), ("gamma", 3, 0.5))])
    )

    assert "The comparable recorded scores in Initial are equal" in result["interpretation"]
    assert result["facts"]["alternativeRelationships"]["normalization"]["degenerate"] is True


@pytest.mark.parametrize("missing_score", [None, nan])
def test_missing_or_non_finite_scores_omit_alternative_relationship_claims(missing_score):
    result = analyze_issue(
        issue_context(
            [ranked(("alpha", 1, 0.9), ("beta", 2, missing_score), ("gamma", 3, 0.2))]
        )
    )

    assert "### Overall outcome" in result["interpretation"]
    assert "### Alternative relationships" not in result["interpretation"]
    assert result["facts"]["alternativeRelationships"]["phases"] == []
    assert result["facts"]["alternativeRelationships"]["unavailablePhases"] == [
        {"phase": 0, "reason": "missing_or_non_finite_score"}
    ]


def test_two_alternatives_do_not_get_a_trivial_closest_or_widest_pair_claim():
    result = analyze_issue(issue_context([ranked(("alpha", 1, 0.9), ("beta", 2, 0.2))]))

    assert "### Alternative relationships" not in result["interpretation"]
    assert "**Alpha** finished first" in result["interpretation"]


def test_multi_phase_interpretation_selects_lead_change_stabilization_and_consensus():
    result = analyze_issue(
        issue_context(
            [
                ranked(("alpha", 1, 0.9), ("beta", 2, 0.8), ("gamma", 3, 0.5), ("delta", 4, 0.2)),
                ranked(("beta", 1, 0.9), ("alpha", 2, 0.8), ("delta", 3, 0.5), ("gamma", 4, 0.2)),
                ranked(("beta", 1, 0.9), ("alpha", 2, 0.8), ("delta", 3, 0.5), ("gamma", 4, 0.2)),
            ],
            consensus_enabled=True,
            consensus_measures=[0.55, 0.72, 0.84],
            historical_identities=[{"id": f"former-{index}"} for index in range(5)],
            current_participants=[
                {"evaluationCompleted": True},
                {"evaluationCompleted": False},
            ],
            phase_participant_counts=[2, 2, 3],
        )
    )
    interpretation = result["interpretation"]

    assert "The leading alternative changed between the first and final recorded rankings" in interpretation
    assert "**Alpha** led in Initial" in interpretation
    assert "**Beta** finished first in Round 2" in interpretation
    assert "The full ranking settled from Round 1 onward." in interpretation
    assert "shared the largest net position change" in interpretation
    assert "**Gamma**" in interpretation and "**Delta**" in interpretation
    assert "The recorded issue-level consensus measure rose" in interpretation
    assert "It first met the configured threshold in Round 2." in interpretation
    assert "unanimous" not in interpretation.lower()
    assert "Stored history contains" not in interpretation
    assert "**1 of 2** people" in interpretation
    assert "ranged from **2** to **3** participants" in interpretation
    assert "### Ranking evolution" not in interpretation
    assert "|" not in interpretation


def test_unchanged_leadership_does_not_hide_lower_rank_changes():
    result = analyze_issue(
        issue_context(
            [
                ranked(("alpha", 1), ("beta", 2), ("gamma", 3)),
                ranked(("alpha", 1), ("gamma", 2), ("beta", 3)),
            ]
        )
    )

    assert "**Alpha** stayed at the top throughout the recorded phases." in result["interpretation"]
    assert "shared the largest net position change" in result["interpretation"]
    assert "**Beta**" in result["interpretation"] and "**Gamma**" in result["interpretation"]


def test_consensus_threshold_not_reached_and_disabled_are_handled():
    below = analyze_issue(
        issue_context(
            [ranked(("alpha", 1), ("beta", 2))],
            consensus_enabled=True,
            consensus_measures=[0.6],
        )
    )["interpretation"]
    disabled = analyze_issue(
        issue_context(
            [ranked(("alpha", 1), ("beta", 2))],
            consensus_enabled=False,
            consensus_measures=[0.9],
        )
    )["interpretation"]

    assert "No recorded measure met the configured threshold." in below
    assert "### Consensus" not in disabled


def test_missing_participation_evidence_is_not_filled_with_assumptions():
    result = analyze_issue(
        issue_context(
            [ranked(("alpha", 1), ("beta", 2))],
            historical_identities=[],
            current_participants=[],
        )
    )

    assert "### Participation records" not in result["interpretation"]


def test_historical_and_current_identity_counts_alone_do_not_trigger_participation():
    result = analyze_issue(
        issue_context(
            [ranked(("alpha", 1), ("beta", 2))],
            historical_identities=[{"id": f"former-{index}"} for index in range(5)],
            current_participants=[{"evaluationCompleted": True}],
        )
    )

    assert "### Participation records" not in result["interpretation"]
    assert result["facts"]["participants"]["historicalCount"] == 5
    assert result["facts"]["participants"]["currentCount"] == 1


def test_incomplete_current_alternative_evaluations_are_described_without_contributor_claims():
    result = analyze_issue(
        issue_context(
            [ranked(("alpha", 1), ("beta", 2))],
            historical_identities=[{"id": "former"}],
            current_participants=[
                {"evaluationCompleted": True},
                {"evaluationCompleted": False},
            ],
        )
    )
    interpretation = result["interpretation"]

    assert "### Participation records" in interpretation
    assert "**1 of 2** people as having completed an alternative evaluation" in interpretation
    assert "contributed inputs" not in interpretation
    assert "criterion weighting" not in interpretation.lower()


def test_generic_relationship_visualization_still_matches_preserved_facts():
    result = analyze_issue(
        issue_context([ranked(("alpha", 1, 0.9), ("beta", 2, 0.5), ("gamma", 3, 0.2))])
    )
    visualization = next(
        entry for entry in result["visualizations"] if entry["type"] == "alternativeRelationships"
    )
    fact_pair = result["facts"]["alternativeRelationships"]["phases"][0]["pairs"][0]
    visual_pair = visualization["phases"][0]["pairs"][0]

    assert visual_pair["leftAlternativeId"] == fact_pair["leftAlternativeId"]
    assert visual_pair["rightAlternativeId"] == fact_pair["rightAlternativeId"]
    assert visual_pair["relativeSeparation"] == fact_pair["relativeSeparation"]
    assert "relativeSeparation" not in result["interpretation"]


def test_narrative_is_deterministic_and_missing_phase_data_is_disclosed():
    context = issue_context(
        [ranked(("alpha", 1), ("beta", 2)), [], ranked(("alpha", 1), ("beta", 2))]
    )
    first = analyze_issue(context)
    second = analyze_issue(context)

    assert first["interpretation"] == second["interpretation"]
    assert "some recorded phases do not include ranking data" in first["interpretation"]
