import os


def is_production_environment() -> bool:
    candidates = (
        os.getenv("DECISION_MODELS_SERVICE_ENV"),
        os.getenv("ENVIRONMENT"),
        os.getenv("ENV"),
        os.getenv("NODE_ENV"),
    )

    return any(
        str(value or "").strip().lower() == "production" for value in candidates
    )
