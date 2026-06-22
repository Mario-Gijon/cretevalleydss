import ast
import shlex
import subprocess
import sys
from pathlib import Path

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_model_package import (
    ScaffoldValidationCheck,
    ScaffoldValidationResult,
)


def validate_rendered_scaffold_files(
    files: list[ScaffoldedFile],
) -> ScaffoldValidationResult:
    checks: list[ScaffoldValidationCheck] = []

    for file in files:
        file_path = Path(file.path)

        if file_path.suffix == ".py":
            checks.append(_validate_python_content(file.path, file.content))
            continue

        if file_path.suffix in {".js", ".jsx"}:
            checks.append(
                ScaffoldValidationCheck(
                    name=f"In-memory syntax validation skipped for {file.path}",
                    status="skipped",
                    details=(
                        "JS/JSX preview validation is skipped because no parser "
                        "dependency is configured in ModelForge."
                    ),
                )
            )

    return _build_validation_result(checks)


def validate_written_scaffold_files(
    *,
    project_root: Path,
    request_run_full_frontend_build: bool,
    model_api_key: str | None,
    written_files: list[ScaffoldedFile],
) -> ScaffoldValidationResult:
    checks: list[ScaffoldValidationCheck] = []

    if model_api_key and any(_is_model_python_file(file.path) for file in written_files):
        checks.append(
            _run_command_check(
                name="DecisionModelsService compile",
                command=[sys.executable, "-m", "compileall", f"models/{model_api_key}"],
                cwd=project_root / "DecisionModelsService",
            )
        )

    for file in written_files:
        if _is_generated_backend_js_file(file.path):
            checks.append(
                _run_command_check(
                    name=f"Backend JS syntax check for {file.path}",
                    command=["node", "--check", file.path],
                    cwd=project_root,
                )
            )

    has_frontend_files = any(_is_frontend_generated_file(file.path) for file in written_files)
    if has_frontend_files:
        if request_run_full_frontend_build:
            checks.append(
                _run_command_check(
                    name="Frontend full build",
                    command=["npm", "run", "build"],
                    cwd=project_root / "Frontend",
                )
            )
        else:
            checks.append(
                ScaffoldValidationCheck(
                    name="Frontend full build",
                    status="skipped",
                    command="npm run build",
                    cwd=str((project_root / "Frontend").resolve()),
                    details="Frontend generated JSX requires a full project build for complete validation.",
                )
            )

    return _build_validation_result(checks)


def has_failed_validation(validation: ScaffoldValidationResult) -> bool:
    return any(check.status == "failed" for check in validation.checks)


def _validate_python_content(relative_path: str, content: str) -> ScaffoldValidationCheck:
    try:
        ast.parse(content, filename=relative_path)
    except SyntaxError as error:
        return ScaffoldValidationCheck(
            name=f"Python syntax validation for {relative_path}",
            status="failed",
            details=_format_syntax_error(error),
        )

    return ScaffoldValidationCheck(
        name=f"Python syntax validation for {relative_path}",
        status="passed",
    )


def _run_command_check(
    *,
    name: str,
    command: list[str],
    cwd: Path,
) -> ScaffoldValidationCheck:
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as error:
        return ScaffoldValidationCheck(
            name=name,
            status="failed",
            command=shlex.join(command),
            cwd=str(cwd.resolve()),
            exitCode=None,
            stdout=None,
            stderr=str(error),
            details="Command validation could not be started.",
        )

    return ScaffoldValidationCheck(
        name=name,
        status="passed" if completed.returncode == 0 else "failed",
        command=shlex.join(command),
        cwd=str(cwd.resolve()),
        exitCode=completed.returncode,
        stdout=completed.stdout or None,
        stderr=completed.stderr or None,
        details=None if completed.returncode == 0 else "Command validation failed.",
    )


def _build_validation_result(
    checks: list[ScaffoldValidationCheck],
) -> ScaffoldValidationResult:
    if not checks:
        return ScaffoldValidationResult(status="skipped", checks=[])

    if any(check.status == "failed" for check in checks):
        return ScaffoldValidationResult(status="failed", checks=checks)

    if any(check.status == "passed" for check in checks):
        return ScaffoldValidationResult(status="passed", checks=checks)

    return ScaffoldValidationResult(status="skipped", checks=checks)


def _format_syntax_error(error: SyntaxError) -> str:
    parts = [error.msg]
    if error.lineno is not None:
        parts.append(f"line {error.lineno}")
    if error.offset is not None:
        parts.append(f"column {error.offset}")
    return ", ".join(parts)


def _is_model_python_file(path: str) -> bool:
    return path.startswith("DecisionModelsService/models/") and path.endswith(".py")


def _is_generated_backend_js_file(path: str) -> bool:
    return path.startswith("Backend/") and path.endswith(".js")


def _is_frontend_generated_file(path: str) -> bool:
    return path.startswith("Frontend/")
