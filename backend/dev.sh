#!/usr/bin/env bash
# Loads .env into the shell first so UVICORN_PORT is honored (uvicorn's own
# --env-file loads too late for its own --port option to see it).
set -a
source .env
set +a
exec uvicorn app.main:app --reload --env-file .env
