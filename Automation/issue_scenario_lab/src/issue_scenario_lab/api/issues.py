from __future__ import annotations

from typing import Any

from issue_scenario_lab.api.client import ApiClient


class IssuesApi:
    """Small wrapper around only the issue routes used by scenario generation."""

    def __init__(self, client: ApiClient) -> None:
        self.client = client

    def models(self) -> Any:
        return self.client.request("GET", "/issues/models")

    def users(self) -> Any:
        return self.client.request("GET", "/issues/users")

    def expression_domains(self) -> Any:
        return self.client.request("GET", "/issues/expression-domains")

    def create_issue(self, issue_info: dict[str, Any]) -> Any:
        return self.client.request("POST", "/issues", json={"issueInfo": issue_info})

    def active_issues(self) -> Any:
        return self.client.request("GET", "/issues/active")

    def respond_to_invitation(self, issue_id: str, action: str) -> Any:
        return self.client.request("POST", f"/issues/{issue_id}/invitation-response", json={"action": action})

    def evaluation(self, issue_id: str, stage: str) -> Any:
        return self.client.request("GET", f"/issues/{issue_id}/evaluations/{stage}")

    def submit_evaluation(self, issue_id: str, stage: str, payload: dict[str, Any]) -> Any:
        return self.client.request("POST", f"/issues/{issue_id}/evaluations/{stage}/submit", json={"payload": payload})

    def compute_evaluation(self, issue_id: str, stage: str) -> Any:
        return self.client.request("POST", f"/issues/{issue_id}/evaluations/{stage}/compute")

    def finished_issues(self) -> Any:
        return self.client.request("GET", "/issues/finished")

    def finished_issue(self, issue_id: str) -> Any:
        return self.client.request("GET", f"/issues/finished/{issue_id}")

    def delete_finished_issue(self, issue_id: str) -> Any:
        return self.client.request("DELETE", f"/issues/finished/{issue_id}")

    def delete_active_issue(self, issue_id: str) -> Any:
        return self.client.request("DELETE", f"/issues/{issue_id}")
