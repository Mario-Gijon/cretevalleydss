import asyncio
import math
from copy import deepcopy
from dataclasses import replace

import httpx
import pytest

from api.routers import models as models_router
from core.application import create_application
from models.ahp_criteria_weights.diagnostics import SAATY_SCALE_VALUES
from models.ahp_criteria_weights.run import run_ahp_criteria_weights
from registry.model_definition import ModelDefinition
from registry.model_registry import get_model_definition_by_api_model_key
from schemas.model_requests import GenericModelExecutionRequest


DIAGNOSTIC_PATH = "/diagnostics/ahp_criteria_weights"


def _post(path: str, json: dict):
    async def send_request():
        transport = httpx.ASGITransport(app=create_application())
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(path, json=json)

    return asyncio.run(send_request())


def _criteria(*names: str) -> list[dict[str, str]]:
    return [{"id": name.lower(), "name": name} for name in names]


def _request(
    comparisons: list[dict],
    *,
    criteria: list[dict[str, str]] | None = None,
    experts: list[dict] | None = None,
) -> dict:
    return {
        "modelParameters": {},
        "evaluations": experts
        or [
            {
                "expert": {"id": "expert-1", "name": "Expert 1"},
                "payload": {"comparisons": comparisons},
            }
        ],
        "context": {
            "criteria": criteria or _criteria("Quality", "Cost", "Sustainability"),
            "structure": {
                "key": "criteriaPairwiseAHP",
                "stage": "criteriaWeighting",
            },
        },
    }


def _consistent_request() -> dict:
    return _request(
        [
            {"criterionId": "quality", "comparedCriterionId": "cost", "value": 2},
            {
                "criterionId": "quality",
                "comparedCriterionId": "sustainability",
                "value": 6,
            },
            {
                "criterionId": "cost",
                "comparedCriterionId": "sustainability",
                "value": 3,
            },
        ]
    )


def _inconsistent_request() -> dict:
    return _request(
        [
            {"criterionId": "quality", "comparedCriterionId": "cost", "value": 9},
            {
                "criterionId": "quality",
                "comparedCriterionId": "sustainability",
                "value": 1,
            },
            {
                "criterionId": "cost",
                "comparedCriterionId": "sustainability",
                "value": 9,
            },
        ]
    )


def test_ahp_diagnostic_is_registered_and_success_has_standard_json_envelope():
    definition = get_model_definition_by_api_model_key("ahp_criteria_weights")
    assert definition is not None
    assert callable(definition.diagnostic_handler)

    response = _post(DIAGNOSTIC_PATH, _consistent_request())

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"success", "message", "data", "error"}
    assert body["success"] is True
    assert body["error"] is None
    assert body["data"]["consistencyRatio"] == pytest.approx(0.0, abs=1e-12)
    assert body["data"]["consistencyIndex"] == pytest.approx(0.0, abs=1e-12)
    assert body["data"]["lambdaMax"] == pytest.approx(3.0)
    assert body["data"]["consistencyStatus"] == "consistent"
    assert body["data"]["consistencyThreshold"] == 0.10
    assert body["data"]["triads"] == []
    assert body["data"]["candidateComparisons"] == []
    assert body["data"]["recommendations"] == []
    assert body["data"]["expertKey"] == "expert-1"
    assert body["data"]["expertName"] == "Expert 1"
    assert body["data"]["criteria"] == [
        {"id": "quality", "name": "Quality"},
        {"id": "cost", "name": "Cost"},
        {"id": "sustainability", "name": "Sustainability"},
    ]


def test_inconsistent_diagnostic_preserves_criterion_ids_and_real_recommendations():
    response = _post(DIAGNOSTIC_PATH, _inconsistent_request())

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["consistencyStatus"] == "review"
    assert data["consistencyRatio"] > data["consistencyThreshold"]
    assert data["triads"][0]["criteria"] == [
        {"id": "quality", "name": "Quality"},
        {"id": "cost", "name": "Cost"},
        {"id": "sustainability", "name": "Sustainability"},
    ]
    assert data["triads"][0]["multiplicativeDiscrepancy"] == pytest.approx(math.log(81))
    assert data["recommendations"]
    assert all(
        recommendation["counterfactualCR"] < recommendation["originalCR"]
        for recommendation in data["recommendations"]
    )


def _invalid_request_bodies() -> list[dict]:
    invalid_structure = _consistent_request()
    invalid_structure["context"]["structure"]["key"] = "otherStructure"
    invalid_stage = _consistent_request()
    invalid_stage["context"]["structure"]["stage"] = "issueExecution"
    return [
        _request(
            [
                {"criterionId": "quality", "comparedCriterionId": "cost", "value": 9},
            ]
        ),
        _request(
            [
                {"criterionId": "quality", "comparedCriterionId": "cost", "value": 1.5},
                {
                    "criterionId": "quality",
                    "comparedCriterionId": "sustainability",
                    "value": 1,
                },
                {
                    "criterionId": "cost",
                    "comparedCriterionId": "sustainability",
                    "value": 1,
                },
            ]
        ),
        _request(
            [
                {"criterionId": "quality", "comparedCriterionId": "cost", "value": 2},
                {
                    "criterionId": "quality",
                    "comparedCriterionId": "sustainability",
                    "value": 3,
                },
                {
                    "criterionId": "cost",
                    "comparedCriterionId": "unknown",
                    "value": 1,
                },
            ]
        ),
        _request(
            [
                {"criterionId": "quality", "comparedCriterionId": "cost", "value": 2},
                {
                    "criterionId": "quality",
                    "comparedCriterionId": "sustainability",
                    "value": 3,
                },
                {
                    "criterionId": "cost",
                    "comparedCriterionId": "sustainability",
                    "value": 1,
                },
            ],
            criteria=[
                {"id": "quality", "name": "Quality"},
                {"id": "quality", "name": "Duplicate Quality"},
                {"id": "sustainability", "name": "Sustainability"},
            ],
        ),
        invalid_structure,
        invalid_stage,
    ]


@pytest.mark.parametrize("request_body", _invalid_request_bodies())
def test_invalid_or_incomplete_ahp_diagnostic_inputs_return_stable_422(request_body):
    response = _post(DIAGNOSTIC_PATH, request_body)

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "DIAGNOSTIC_INPUT_INVALID"


@pytest.mark.parametrize("expert_count", [0, 2])
def test_anything_other_than_one_expert_is_rejected_for_a_single_matrix_diagnostic(
    expert_count,
):
    request_body = _consistent_request()
    single_evaluation = deepcopy(request_body["evaluations"][0])
    request_body["evaluations"] = [
        deepcopy(single_evaluation) for _ in range(expert_count)
    ]

    response = _post(DIAGNOSTIC_PATH, request_body)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "DIAGNOSTIC_INPUT_INVALID"
    if expert_count == 2:
        assert "exactly one" in response.json()["error"]["details"]["reason"]


@pytest.mark.parametrize(
    ("criteria", "comparisons"),
    [
        (_criteria("Quality"), []),
        (
            _criteria("Quality", "Cost"),
            [{"criterionId": "quality", "comparedCriterionId": "cost", "value": 3}],
        ),
    ],
)
def test_diagnostic_with_fewer_than_three_criteria_has_not_applicable_cr(
    criteria, comparisons
):
    response = _post(DIAGNOSTIC_PATH, _request(comparisons, criteria=criteria))

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["consistencyRatio"] is None
    assert data["consistencyIndex"] is None
    assert data["consistencyStatus"] == "not_applicable"


def test_diagnostic_route_precedes_catch_all_and_reports_unknown_model_contract():
    response = _post("/diagnostics/not_registered", {})

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "MODEL_NOT_FOUND"
    assert body["error"]["field"] == "api_model_key"


def test_internal_diagnostic_route_is_not_advertised_in_public_openapi():
    openapi = create_application().openapi()

    assert "/diagnostics/{api_model_key}" not in openapi["paths"]


def test_existing_dynamic_execution_catch_all_still_returns_its_own_error_contract():
    response = _post("/unknown/model/path", {"anything": True})

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "MODEL_NOT_FOUND"
    assert body["error"]["field"] == "model_path"


@pytest.mark.parametrize(
    "request_body",
    [
        {"evaluations": "not-a-list"},
        {"modelParameters": []},
    ],
)
def test_generic_request_schema_errors_keep_standard_validation_contract(request_body):
    response = _post(DIAGNOSTIC_PATH, request_body)

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_ready_model_without_diagnostic_is_rejected_without_running_normal_handler():
    definition = get_model_definition_by_api_model_key("bwm")
    assert definition is not None
    assert definition.diagnostic_handler is None

    response = _post("/diagnostics/bwm", {})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DIAGNOSTIC_NOT_SUPPORTED"


def test_scaffold_diagnostic_capability_is_not_available(monkeypatch):
    definition = get_model_definition_by_api_model_key("ahp_criteria_weights")
    assert definition is not None
    scaffold = replace(definition, implementation_status="scaffold")
    monkeypatch.setattr(
        models_router,
        "get_model_definition_by_api_model_key",
        lambda api_model_key: (
            scaffold if api_model_key == "ahp_criteria_weights" else None
        ),
    )

    response = _post(DIAGNOSTIC_PATH, {})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MODEL_NOT_FOUND"


def test_diagnostic_does_not_call_normal_execution_or_mcc(monkeypatch):
    from models.ahp_criteria_weights import executor

    def fail_if_called(*_args, **_kwargs):
        pytest.fail("diagnostic endpoint called a normal execution or MCC function")

    monkeypatch.setattr(executor, "execute_ahp_criteria_weights", fail_if_called)
    monkeypatch.setattr(executor, "solve_mcc_weights", fail_if_called)

    response = _post(DIAGNOSTIC_PATH, _inconsistent_request())

    assert response.status_code == 200
    assert response.json()["success"] is True


def test_diagnostic_input_is_not_mutated_and_result_is_json_serializable():
    from models.ahp_criteria_weights.executor import diagnose_ahp_criteria_weights

    request_body = _inconsistent_request()
    payload = GenericModelExecutionRequest.model_validate(request_body)
    original = deepcopy(payload.model_dump())

    result = diagnose_ahp_criteria_weights(payload)

    assert payload.model_dump() == original
    assert result["triads"][0]["criteria"][0]["id"] == "quality"
    assert result["recommendations"][0]["suggestedValue"] in SAATY_SCALE_VALUES


def test_diagnostic_cr_is_identical_to_the_final_ahp_solver():
    request_body = _inconsistent_request()
    response = _post(DIAGNOSTIC_PATH, request_body)
    final = run_ahp_criteria_weights(
        context=request_body["context"],
        evaluations=request_body["evaluations"],
    )["expertDiagnosticsByExpert"]["expert-1"]

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["lambdaMax"] == final["lambdaMax"]
    assert data["consistencyIndex"] == final["consistencyIndex"]
    assert data["consistencyRatio"] == final["consistencyRatio"]
    assert data["consistencyStatus"] == final["consistencyStatus"]


def test_dynamic_model_with_diagnostic_capability_is_invoked_by_exact_registered_key(
    monkeypatch,
):
    called = []

    def normal_handler(_payload):
        pytest.fail("diagnostics must not call the normal handler")

    def diagnostic_handler(payload):
        called.append(payload.modelParameters.get("value"))
        return {"dynamic": True, "preserved": payload.modelParameters.get("value")}

    definition = ModelDefinition(
        api_model_key="dynamic_diagnostic",
        api_endpoint_path="/dynamic_diagnostic",
        request_model=GenericModelExecutionRequest,
        handler=normal_handler,
        diagnostic_handler=diagnostic_handler,
        display_name="Dynamic diagnostic",
        small_description="Small",
        extended_description="Extended",
        evaluation_structure_key="customStructure",
    )
    monkeypatch.setattr(
        models_router,
        "get_model_definition_by_api_model_key",
        lambda api_model_key: (
            definition if api_model_key == "dynamic_diagnostic" else None
        ),
    )

    response = _post(
        "/diagnostics/dynamic_diagnostic",
        {"modelParameters": {"value": "kept"}},
    )

    assert response.status_code == 200
    assert response.json()["data"] == {"dynamic": True, "preserved": "kept"}
    assert called == ["kept"]
