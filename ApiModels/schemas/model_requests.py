"""Schemas de entrada para endpoints de modelos de decisión."""

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _extract_crisp_matrix_shape(
    matrices: dict[str, list[list[float]]],
    field_name: str = "matrices",
) -> tuple[int, int]:
    """Valida matrices 2D por experto y devuelve `(alternatives, criteria)`."""

    if not matrices:
        raise ValueError(f"{field_name} must include at least one expert matrix")

    expected_alternatives: int | None = None
    expected_criteria: int | None = None

    for expert_id, matrix in matrices.items():
        if not matrix:
            raise ValueError(
                f"{field_name}.{expert_id} must contain at least one alternative"
            )

        criteria_count = len(matrix[0])
        if criteria_count == 0:
            raise ValueError(
                f"{field_name}.{expert_id} must contain at least one criterion"
            )

        for row in matrix:
            if len(row) != criteria_count:
                raise ValueError(
                    f"{field_name}.{expert_id} rows must have the same number of criteria"
                )

        alternatives_count = len(matrix)
        if expected_alternatives is None:
            expected_alternatives = alternatives_count
            expected_criteria = criteria_count
            continue

        if (
            alternatives_count != expected_alternatives
            or criteria_count != expected_criteria
        ):
            raise ValueError(
                f"All expert matrices in {field_name} must share the same shape"
            )

    return expected_alternatives or 0, expected_criteria or 0


def _extract_fuzzy_matrix_shape(
    matrices: dict[str, list[list[list[float]]]],
) -> tuple[int, int]:
    """Valida matrices fuzzy 3D por experto y devuelve `(alternatives, criteria)`."""

    if not matrices:
        raise ValueError("matrices must include at least one expert matrix")

    expected_alternatives: int | None = None
    expected_criteria: int | None = None

    for expert_id, matrix in matrices.items():
        if not matrix:
            raise ValueError(
                f"matrices.{expert_id} must contain at least one alternative"
            )

        criteria_count = len(matrix[0])
        if criteria_count == 0:
            raise ValueError(
                f"matrices.{expert_id} must contain at least one criterion"
            )

        for row in matrix:
            if len(row) != criteria_count:
                raise ValueError(
                    f"matrices.{expert_id} rows must have the same number of criteria"
                )
            for triple in row:
                if len(triple) != 3:
                    raise ValueError(
                        f"matrices.{expert_id} fuzzy values must be triplets [l, m, u]"
                    )

        alternatives_count = len(matrix)
        if expected_alternatives is None:
            expected_alternatives = alternatives_count
            expected_criteria = criteria_count
            continue

        if (
            alternatives_count != expected_alternatives
            or criteria_count != expected_criteria
        ):
            raise ValueError(
                "All expert matrices in matrices must share the same shape"
            )

    return expected_alternatives or 0, expected_criteria or 0


def _extract_herrera_shape(
    matrices: dict[str, dict[str, list[list[float]]]],
) -> tuple[str, int]:
    """Valida matrices pairwise para Herrera-Viedma y devuelve `(criterion_name, alternatives)`."""

    if not matrices:
        raise ValueError("matrices must include at least one expert payload")

    first_expert_payload = next(iter(matrices.values()))
    if not first_expert_payload:
        raise ValueError(
            "Each expert payload must include at least one criterion matrix"
        )

    criterion_name = next(iter(first_expert_payload.keys()))
    expected_alternatives: int | None = None

    for expert_id, expert_payload in matrices.items():
        if criterion_name not in expert_payload:
            raise ValueError(
                f"matrices.{expert_id} must include criterion '{criterion_name}'"
            )

        matrix = expert_payload[criterion_name]
        if not matrix:
            raise ValueError(
                f"matrices.{expert_id}.{criterion_name} must contain at least one row"
            )

        row_size = len(matrix[0])
        if row_size == 0:
            raise ValueError(
                f"matrices.{expert_id}.{criterion_name} must contain at least one column"
            )

        for row in matrix:
            if len(row) != row_size:
                raise ValueError(
                    f"matrices.{expert_id}.{criterion_name} rows must have equal length"
                )

        alternatives_count = len(matrix)
        if alternatives_count != row_size:
            raise ValueError(
                f"matrices.{expert_id}.{criterion_name} must be a square matrix"
            )

        if expected_alternatives is None:
            expected_alternatives = alternatives_count
            continue

        if alternatives_count != expected_alternatives:
            raise ValueError(
                f"All matrices for criterion '{criterion_name}' must share the same shape"
            )

    return criterion_name, expected_alternatives or 0


def _normalize_criterion_types(value):
    """Valida criterionTypes usando el vocabulario canónico esperado por los modelos."""

    if value is None:
        return value

    if not isinstance(value, list):
        raise ValueError("criterionTypes must be a list")

    allowed_values = {"max", "min"}

    normalized = []
    for item in value:
        key = str(item).strip().lower()
        if key not in allowed_values:
            raise ValueError("criterionTypes values must be one of: max, min")
        normalized.append(key)

    return normalized


class RequestSchema(BaseModel):
    """Base de request para permitir compatibilidad con campos extra no usados."""

    model_config = ConfigDict(extra="ignore")

    @field_validator("criterionTypes", mode="before", check_fields=False)
    @classmethod
    def normalize_criterion_types(cls, value):
        return _normalize_criterion_types(value)


class HerreraViedmaModelParameters(RequestSchema):
    """Parámetros opcionales del modelo Herrera-Viedma CRP."""

    ag_lq: list[float] | None = Field(
        default=None,
        description="Cuantificador lingüístico para agregación.",
    )
    ex_lq: list[float] | None = Field(
        default=None,
        description="Cuantificador lingüístico para explotación.",
    )
    b: float | None = Field(
        default=None,
        description="Parámetro de rigurosidad del consenso.",
    )
    beta: float | None = Field(
        default=None,
        description="Parámetro del operador OWA OR-LIKE.",
    )


class HerreraViedmaRequest(RequestSchema):
    """Entrada del endpoint `/herrera_viedma_crp`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "matrices": {
                    "expert_1": {
                        "preference": [
                            [0.0, 0.70, 0.40],
                            [0.30, 0.0, 0.60],
                            [0.60, 0.40, 0.0],
                        ]
                    },
                    "expert_2": {
                        "preference": [
                            [0.0, 0.65, 0.45],
                            [0.35, 0.0, 0.55],
                            [0.55, 0.45, 0.0],
                        ]
                    },
                },
                "consensusThreshold": 0.85,
                "modelParameters": {
                    "ag_lq": [0.3, 0.8],
                    "ex_lq": [0.5, 1.0],
                    "b": 1.0,
                    "beta": 0.8,
                },
            }
        },
    )

    matrices: dict[str, dict[str, list[list[float]]]] = Field(
        ...,
        description="Matrices de preferencia por experto y criterio.",
    )
    consensusThreshold: float = Field(
        default=0.7,
        description="Umbral mínimo de consenso solicitado por cliente.",
    )
    modelParameters: HerreraViedmaModelParameters = Field(
        default_factory=HerreraViedmaModelParameters,
        description="Parámetros opcionales del modelo.",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        _extract_herrera_shape(self.matrices)

        if (
            self.modelParameters.ag_lq is not None
            and len(self.modelParameters.ag_lq) != 2
        ):
            raise ValueError("modelParameters.ag_lq must contain exactly 2 values")

        if (
            self.modelParameters.ex_lq is not None
            and len(self.modelParameters.ex_lq) != 2
        ):
            raise ValueError("modelParameters.ex_lq must contain exactly 2 values")

        return self


class TopsisModelParameters(RequestSchema):
    """Parámetros del modelo TOPSIS clásico."""

    weights: list[float] = Field(
        ...,
        description="Peso por criterio.",
    )


class TopsisRequest(RequestSchema):
    """Entrada del endpoint `/topsis`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "matrices": {
                    "expert_1": [[7, 5, 6], [8, 7, 5], [6, 8, 7]],
                    "expert_2": [[6, 6, 7], [7, 8, 6], [8, 7, 5]],
                },
                "criterionTypes": ["max", "max", "min"],
                "modelParameters": {"weights": [0.5, 0.3, 0.2]},
            }
        },
    )

    matrices: dict[str, list[list[float]]] = Field(
        ...,
        description="Matriz de evaluación por experto.",
    )
    criterionTypes: list[str] = Field(
        ...,
        description="Tipo por criterio (`max` o `min`).",
    )
    modelParameters: TopsisModelParameters = Field(
        ...,
        description="Parámetros del modelo TOPSIS.",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        _, criteria_count = _extract_crisp_matrix_shape(self.matrices)

        if len(self.criterionTypes) != criteria_count:
            raise ValueError(
                "criterionTypes length must match the number of criteria in matrices"
            )

        if len(self.modelParameters.weights) != criteria_count:
            raise ValueError(
                "modelParameters.weights length must match the number of criteria in matrices"
            )

        return self


class BordaRequest(RequestSchema):
    """Entrada del endpoint `/borda`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "matrices": {
                    "expert_1": [[7, 5], [8, 7], [6, 8]],
                    "expert_2": [[6, 6], [7, 8], [8, 7]],
                },
                "criterionTypes": ["max", "min"],
            }
        },
    )

    matrices: dict[str, list[list[float]]] = Field(
        ...,
        description="Matriz de evaluación por experto.",
    )
    criterionTypes: list[str] = Field(
        ...,
        description="Tipo por criterio (`max` o `min`).",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        _, criteria_count = _extract_crisp_matrix_shape(self.matrices)

        if len(self.criterionTypes) != criteria_count:
            raise ValueError(
                "criterionTypes length must match the number of criteria in matrices"
            )

        return self


class ArasModelParameters(RequestSchema):
    """Parámetros del modelo ARAS."""

    weights: list[float] = Field(
        ...,
        description="Peso por criterio.",
    )


class ArasRequest(RequestSchema):
    """Entrada del endpoint `/aras`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "matrices": {
                    "expert_1": [[7, 5, 6], [8, 7, 5], [6, 8, 7]],
                    "expert_2": [[6, 6, 7], [7, 8, 6], [8, 7, 5]],
                },
                "criterionTypes": ["max", "max", "min"],
                "modelParameters": {"weights": [0.4, 0.35, 0.25]},
            }
        },
    )

    matrices: dict[str, list[list[float]]] = Field(
        ...,
        description="Matriz de evaluación por experto.",
    )
    criterionTypes: list[str] = Field(
        ...,
        description="Tipo por criterio (`max` o `min`).",
    )
    modelParameters: ArasModelParameters = Field(
        ...,
        description="Parámetros del modelo ARAS.",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        _, criteria_count = _extract_crisp_matrix_shape(self.matrices)

        if len(self.criterionTypes) != criteria_count:
            raise ValueError(
                "criterionTypes length must match the number of criteria in matrices"
            )

        if len(self.modelParameters.weights) != criteria_count:
            raise ValueError(
                "modelParameters.weights length must match the number of criteria in matrices"
            )

        return self


class FuzzyTopsisModelParameters(RequestSchema):
    """Parámetros del modelo Fuzzy TOPSIS."""

    weights: list[list[float]] = Field(
        ...,
        description="Pesos difusos por criterio (tripletas).",
    )


class FuzzyTopsisRequest(RequestSchema):
    """Entrada del endpoint `/fuzzy_topsis`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "matrices": {
                    "expert_1": [
                        [[1, 2, 3], [3, 4, 5]],
                        [[2, 3, 4], [4, 5, 6]],
                    ],
                    "expert_2": [
                        [[1, 2, 3], [2, 3, 4]],
                        [[3, 4, 5], [4, 5, 6]],
                    ],
                },
                "criterionTypes": ["max", "min"],
                "modelParameters": {"weights": [[0.2, 0.3, 0.4], [0.4, 0.5, 0.6]]},
            }
        },
    )

    matrices: dict[str, list[list[list[float]]]] = Field(
        ...,
        description="Matrices difusas por experto (alternativa x criterio x [l,m,u]).",
    )
    criterionTypes: list[str] = Field(
        ...,
        description="Tipo por criterio (`max` o `min`).",
    )
    modelParameters: FuzzyTopsisModelParameters = Field(
        ...,
        description="Parámetros del modelo Fuzzy TOPSIS.",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        _, criteria_count = _extract_fuzzy_matrix_shape(self.matrices)

        if len(self.criterionTypes) != criteria_count:
            raise ValueError(
                "criterionTypes length must match the number of criteria in matrices"
            )

        if len(self.modelParameters.weights) != criteria_count:
            raise ValueError(
                "modelParameters.weights length must match the number of criteria in matrices"
            )

        for index, fuzzy_weight in enumerate(self.modelParameters.weights):
            if len(fuzzy_weight) != 3:
                raise ValueError(
                    f"modelParameters.weights[{index}] must be a triplet [l, m, u]"
                )

        return self


class MarcosModelParameters(RequestSchema):
    """Parámetros del modelo MARCOS."""

    weights: list[float] = Field(
        ...,
        description="Peso por criterio.",
    )


class MarcosRequest(RequestSchema):
    """Entrada del endpoint `/marcos`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "matrices": {
                    "expert_1": [
                        [250, 16, 12, 5],
                        [200, 16, 8, 3],
                        [300, 32, 16, 4],
                        [275, 32, 8, 4],
                        [225, 16, 16, 2],
                    ],
                    "expert_2": [
                        [260, 16, 12, 5],
                        [210, 16, 8, 3],
                        [290, 32, 16, 4],
                        [270, 32, 8, 4],
                        [230, 16, 16, 2],
                    ],
                },
                "criterionTypes": ["min", "max", "max", "max"],
                "modelParameters": {"weights": [0.1, 0.4, 0.2, 0.3]},
            }
        },
    )

    matrices: dict[str, list[list[float]]] = Field(
        ...,
        description="Matriz de evaluación por experto.",
    )
    criterionTypes: list[str] = Field(
        ...,
        description="Tipo por criterio (`max` o `min`).",
    )
    modelParameters: MarcosModelParameters = Field(
        ...,
        description="Parámetros del modelo MARCOS.",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        _, criteria_count = _extract_crisp_matrix_shape(self.matrices)

        if len(self.criterionTypes) != criteria_count:
            raise ValueError(
                "criterionTypes length must match the number of criteria in matrices"
            )

        if len(self.modelParameters.weights) != criteria_count:
            raise ValueError(
                "modelParameters.weights length must match the number of criteria in matrices"
            )

        return self


class BwmExpertData(RequestSchema):
    """Preferencias de un experto para BWM."""

    mic: list[float] = Field(
        default_factory=list,
        description="Comparaciones Best-to-Others del experto.",
    )
    lic: list[float] = Field(
        default_factory=list,
        description="Comparaciones Others-to-Worst del experto.",
    )


class BwmRequest(RequestSchema):
    """Entrada del endpoint `/bwm`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "experts_data": {
                    "expert_1": {"mic": [1, 3, 5], "lic": [5, 3, 1]},
                    "expert_2": {"mic": [1, 4, 7], "lic": [7, 4, 1]},
                },
                "eps_penalty": 1.0,
            }
        },
    )

    experts_data: dict[str, BwmExpertData] = Field(
        default_factory=dict,
        description="Información de todos los expertos participantes.",
    )
    eps_penalty: float = Field(
        default=1,
        description="Penalización epsilon usada por BWM.",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        expected_size: int | None = None

        for expert_id, expert_data in self.experts_data.items():
            mic_size = len(expert_data.mic)
            lic_size = len(expert_data.lic)

            if mic_size == 0 and lic_size == 0:
                continue

            if mic_size == 0 or lic_size == 0:
                raise ValueError(
                    f"experts_data.{expert_id} must include both mic and lic vectors"
                )

            if mic_size != lic_size:
                raise ValueError(
                    f"experts_data.{expert_id}.mic and lic must have the same length"
                )

            if expected_size is None:
                expected_size = mic_size
            elif mic_size != expected_size:
                raise ValueError(
                    "All non-empty experts_data vectors must have the same length"
                )

        return self


class CmccRequest(RequestSchema):
    """Entrada del endpoint `/cmcc`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "o": [0.9, 0.8, 0.4, 0.6, 0.7],
                "c": [1.0, 1.2, 2.0, 1.5, 1.0],
                "omega": [0.2, 0.2, 0.2, 0.2, 0.2],
                "w": [0.1, 0.25, 0.25, 0.25, 0.15],
                "eps": 0.1,
                "mu0": 0.85,
                "lower_bound": 0.0,
                "upper_bound": 1.0,
            }
        },
    )

    o: list[float] = Field(
        ...,
        description="Opiniones originales de los expertos.",
    )
    c: list[float] = Field(
        ...,
        description="Coste asociado al ajuste de cada experto.",
    )
    omega: list[float] = Field(
        ...,
        description="Pesos de agregación para la opinión colectiva.",
    )
    w: list[float] = Field(
        ...,
        description="Pesos para calcular el nivel de consenso.",
    )
    eps: float = Field(
        ...,
        description="Desviación máxima permitida respecto a la opinión colectiva.",
    )
    mu0: float = Field(
        ...,
        description="Umbral mínimo requerido para el consenso.",
    )
    lower_bound: float = Field(
        default=0.0,
        description="Límite inferior de las opiniones ajustadas.",
    )
    upper_bound: float = Field(
        default=1.0,
        description="Límite superior de las opiniones ajustadas.",
    )

    @model_validator(mode="after")
    def validate_semantics(self):
        size = len(self.o)
        if size == 0:
            raise ValueError("o must contain at least one value")

        if len(self.c) != size or len(self.omega) != size or len(self.w) != size:
            raise ValueError("o, c, omega and w must have the same length")

        return self
