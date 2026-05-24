from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

import config_api


def test_get_default_providers_contains_openai_and_openrouter():
    defaults = config_api.get_default_config()
    providers = defaults.get("providers", {})

    assert "openai" in providers
    assert "openrouter" in providers


def test_config_router_get_and_update_provider(tmp_path: Path):
    cfg_file = tmp_path / "providers.json"
    config_api.CONFIG_FILE = str(cfg_file)

    app = FastAPI()
    app.include_router(config_api.router)
    client = TestClient(app)

    get_resp = client.get("/api/config/providers/openai")
    assert get_resp.status_code == 200
    body = get_resp.json()
    assert body["name"] == "openai"

    body["api_key"] = "test-key"
    body["enabled"] = True
    update_resp = client.put("/api/config/providers/openai", json=body)
    assert update_resp.status_code == 200

    verify_resp = client.get("/api/config/providers/openai")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["api_key"] == "test-key"
