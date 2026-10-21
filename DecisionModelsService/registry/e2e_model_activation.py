"""Explicit model exposure reserved for the isolated TOPSIS-Sort E2E stack."""

import os

E2E_DATABASE_NAME = "cretevalley_e2e"
E2E_MONGO_HOST = "mongo-e2e"


def topsis_sort_2016_e2e_enabled() -> bool:
    """Return true only for the dedicated, explicitly opted-in E2E service."""

    return (
        os.getenv("NODE_ENV") == "e2e"
        and os.getenv("E2E_ISOLATED_STACK") == "true"
        and os.getenv("E2E_ENABLE_TOPSIS_SORT_2016") == "true"
        and os.getenv("E2E_MONGODB_DB_NAME") == E2E_DATABASE_NAME
        and os.getenv("E2E_MONGO_HOST") == E2E_MONGO_HOST
    )


__all__ = ["E2E_DATABASE_NAME", "E2E_MONGO_HOST", "topsis_sort_2016_e2e_enabled"]
