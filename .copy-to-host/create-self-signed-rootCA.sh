#!/bin/bash

# Simple Self-Signed Certificate Creator for macOS
set -e

mkdir -p dev-secrets

# Step 1: Create Root CA and add to Keychain
echo "Creating Root CA..."
openssl genrsa -out ./dev-secrets/mpa-rootCA.key 2048
openssl req -x509 -new -nodes -key ./dev-secrets/mpa-rootCA.key -sha256 -days 825 -out ./dev-secrets/mpa-rootCA.pem

# echo "Adding to Keychain (requires sudo)..."
# sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./mpa-rootCA.pem

chmod 600 ./dev-secrets/mpa-rootCA.key
chmod 644 ./dev-secrets/mpa-rootCA.pem

echo "Done! Files in dev-secrets/: mpa-rootCA.pem, mpa-rootCA.key"
