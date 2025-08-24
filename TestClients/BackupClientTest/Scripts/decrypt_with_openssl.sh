#!/bin/bash

# ✅ Usage: ./decrypt_with_openssl.sh <encrypted_file> <output_file> <password>
# Example: ./decrypt_with_openssl.sh sample-local-pdf_encrypted.pdf decrypted.pdf mypassword

set -e

# Check arguments
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <encrypted_file> <output_file> <password>"
  exit 1
fi

# Inputs
ENCRYPTED_FILE="$1"
OUTPUT_FILE="$2"
PASSWORD="$3"

# OpenSSL path (adjust if needed)
OPENSSL_BIN="/opt/homebrew/opt/openssl@3/bin/openssl"

# Check if encrypted file exists
if [ ! -f "$ENCRYPTED_FILE" ]; then
  echo "Error: Encrypted file '$ENCRYPTED_FILE' does not exist."
  exit 1
fi

# Extract salt (8 bytes) and IV (16 bytes) for debugging
SALT_HEX=$(dd if="$ENCRYPTED_FILE" bs=1 skip=8 count=8 2>/dev/null | xxd -p -c 8)
IV_HEX=$(dd if="$ENCRYPTED_FILE" bs=1 skip=16 count=16 2>/dev/null | xxd -p -c 16)

echo "🔑 Extracted:"
echo "Salt: $SALT_HEX"
echo "IV:   $IV_HEX"
echo "Passphrase: $PASSWORD"

# Decrypt using OpenSSL enc
$OPENSSL_BIN enc -aes-256-cbc -d -v \
  -in "$ENCRYPTED_FILE" \
  -out "$OUTPUT_FILE" \
  -pbkdf2 -iter 100000 \
  -pass pass:"$PASSWORD"

echo "✅ Decryption complete. Output written to $OUTPUT_FILE"