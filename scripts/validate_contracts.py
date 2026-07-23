"""Validate repository-owned OpenAPI and JSON Schema documents."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema.validators import validator_for
from openapi_spec_validator import validate_spec

ROOT = Path(__file__).resolve().parents[1]
OPENAPI_PATH = ROOT / "packages" / "contracts" / "gateway-openapi.yaml"
LEDGER_EVENT_PATH = (
    ROOT / "packages" / "contracts" / "events" / "ledger-entry-posted-v1.schema.json"
)


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a JSON object")
    return value


def main() -> None:
    openapi = load_json(OPENAPI_PATH)
    validate_spec(openapi)

    event_schema = load_json(LEDGER_EVENT_PATH)
    validator_for(event_schema).check_schema(event_schema)

    print("contracts: OpenAPI and ledger event schema are valid")


if __name__ == "__main__":
    main()
