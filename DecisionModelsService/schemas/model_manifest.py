"""Schemas públicos para el endpoint de manifest de modelos.

El contenido interno de `data` es metadata controlada por DecisionModelsService y se genera en
`services.model_manifest_service`. Mantenerlo como diccionario evita duplicar en
Pydantic toda la estructura del manifest y reduce el coste de añadir modelos.
"""

from typing import Any

from pydantic import BaseModel


class ModelManifestResponse(BaseModel):
    """Respuesta de éxito del endpoint GET /models/manifest."""

    success: bool
    message: str
    data: dict[str, Any]
