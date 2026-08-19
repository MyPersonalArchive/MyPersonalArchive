#!/usr/bin/env bash

# This script is used to start vscode with the secrets from 1password.
# This should assure that secrets and passwords are not stored in any files nor the git repository.

op run --env-file=.env.template -- code
