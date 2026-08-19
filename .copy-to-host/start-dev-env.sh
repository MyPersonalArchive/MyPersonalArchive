#!/usr/bin/env bash

# This script is used to start vscode with the secrets from .env file
# NOTE: This script will store any secrets and passwords in the .env file. Recommended to use the start-dev-op.sh script instead, which will not store any secrets in files.
(set -a; source .env; set +a; code)