import re
from pathlib import Path

from schemas.scaffold_catalog import (
    CatalogEvaluationStructureItem,
    CatalogParameterStructureItem,
    ScaffoldCatalogResponse,
)
from services.scaffold_existence import (
    get_evaluation_structure_existence,
    get_parameter_structure_existence,
)


PARAMETER_BACKEND_ROOT = Path(
    "Backend/modules/decisionPlugins/modelParameters/structures"
)
PARAMETER_FRONTEND_ROOT = Path(
    "Frontend/src/features/decisionPlugins/modelParameters/fields"
)
EVALUATION_BACKEND_ROOT = Path(
    "Backend/modules/decisionPlugins/evaluations/structures"
)
EVALUATION_FRONTEND_ROOT = Path(
    "Frontend/src/features/decisionPlugins/evaluations/structures"
)

STAGE_PATTERN = re.compile(r"stage:\s*EVALUATION_STAGES\.([A-Z_]+)")
IMPLEMENTATION_STATUS_PATTERN = re.compile(
    r"implementationStatus:\s*['\"](ready|scaffold)['\"]"
)

STAGE_MAP = {
    "ALTERNATIVE_EVALUATION": "alternativeEvaluation",
    "CRITERIA_WEIGHTING": "criteriaWeighting",
}


def build_scaffold_catalog(project_root: Path) -> ScaffoldCatalogResponse:
    return ScaffoldCatalogResponse(
        parameterStructures=_build_parameter_structure_items(project_root),
        evaluationStructures=_build_evaluation_structure_items(project_root),
    )


def _build_parameter_structure_items(
    project_root: Path,
) -> list[CatalogParameterStructureItem]:
    keys = _collect_union_folder_keys(
        project_root / PARAMETER_BACKEND_ROOT,
        project_root / PARAMETER_FRONTEND_ROOT,
    )

    items = []
    for key in keys:
        existence = get_parameter_structure_existence(project_root, key)
        status = "ready" if existence.status == "exists" else "partial"
        items.append(
            CatalogParameterStructureItem(
                key=key,
                status=status,
                backendExists=existence.backend_exists,
                frontendExists=existence.frontend_exists,
                available=status == "ready",
            )
        )

    return items


def _build_evaluation_structure_items(
    project_root: Path,
) -> list[CatalogEvaluationStructureItem]:
    keys = _collect_union_folder_keys(
        project_root / EVALUATION_BACKEND_ROOT,
        project_root / EVALUATION_FRONTEND_ROOT,
    )

    items = []
    for key in keys:
        existence = get_evaluation_structure_existence(project_root, key)
        status = "ready" if existence.status == "exists" else "partial"
        metadata = _read_evaluation_structure_metadata(
            project_root / EVALUATION_BACKEND_ROOT / key / "index.js"
        )
        stage = metadata["stage"]

        items.append(
            CatalogEvaluationStructureItem(
                key=key,
                stage=stage,
                stageConstant=metadata["stageConstant"],
                status=status,
                backendExists=existence.backend_exists,
                frontendExists=existence.frontend_exists,
                implementationStatus=metadata["implementationStatus"] or "ready",
                availableForAlternativeEvaluation=
                status == "ready" and stage == "alternativeEvaluation",
                availableForCriteriaWeighting=
                status == "ready" and stage == "criteriaWeighting",
            )
        )

    return items


def _collect_union_folder_keys(*roots: Path) -> list[str]:
    keys: set[str] = set()

    for root in roots:
        if not root.exists() or not root.is_dir():
            continue

        for entry in root.iterdir():
            if entry.is_dir():
                keys.add(entry.name)

    return sorted(keys)


def _read_evaluation_structure_metadata(index_path: Path) -> dict[str, str | None]:
    if not index_path.exists():
        return {
            "stage": None,
            "stageConstant": None,
            "implementationStatus": None,
        }

    source = index_path.read_text(encoding="utf-8")
    stage_match = STAGE_PATTERN.search(source)
    implementation_status_match = IMPLEMENTATION_STATUS_PATTERN.search(source)
    stage_constant = stage_match.group(1) if stage_match else None

    return {
        "stage": STAGE_MAP.get(stage_constant),
        "stageConstant": stage_constant,
        "implementationStatus": (
            implementation_status_match.group(1).strip()
            if implementation_status_match
            else None
        ),
    }
