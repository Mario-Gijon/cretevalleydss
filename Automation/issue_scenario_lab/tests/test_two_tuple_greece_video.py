from issue_scenario_lab.scenarios.two_tuple_greece_video import _issue_name, _payload, load_fixture


def test_repeated_video_generations_use_distinct_auto_names_with_fixture_name() -> None:
    fixture_name = load_fixture()["issue"]["name"]
    first = _issue_name("generation-one", fixture_name)
    second = _issue_name("generation-two", fixture_name)

    assert first != second
    assert first == f"[AUTO:generation-one] {fixture_name}"
    assert second == f"[AUTO:generation-two] {fixture_name}"
    assert first.startswith("[AUTO:")
    assert second.startswith("[AUTO:")


def test_video_issue_payload_receives_generated_name() -> None:
    data = load_fixture()
    issue_name = _issue_name("payload-generation", data["issue"]["name"])

    payload = _payload(data, name=issue_name, model_id="model-id", domain_id="domain-id", emails=["expert@example.test"])

    assert payload["issueName"] == issue_name
    assert payload["issueName"] != data["issue"]["name"]


def test_video_payload_declares_leaf_types_for_current_two_tuple_contract() -> None:
    data = load_fixture()
    payload = _payload(
        data,
        name="[AUTO:typed-video] Greece renewable-energy sites video",
        model_id="model-id",
        domain_id="domain-id",
        emails=[f"expert_{letter}@example.test" for letter in "abcde"],
    )
    leaves = [
        child
        for parent in payload["criteria"]
        for child in parent["children"]
    ]

    assert len(leaves) == 18
    assert {criterion["type"] for criterion in leaves} == {"benefit"}
