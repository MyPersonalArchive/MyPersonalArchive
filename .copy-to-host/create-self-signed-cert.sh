#!/bin/bash

# Simple Self-Signed Certificate Creator for macOS
set -e

mkdir -p https
rm -f https/mpa-server.key https/mpa-server.crt https/mpa-server.pfx https/mpa-server.pem

# Configuration
DOMAIN=${1:-localhost}
DAYS=${2:-825}

echo "Creating certificate for: $DOMAIN"

# Step 2: Create server certificate with SAN
echo "Creating server certificate..."
cat > v3.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
p
[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
IP.1 = 127.0.0.1
EOF

openssl req -new -sha256 -nodes -out https/mpa-server.csr -newkey rsa:2048 -keyout https/mpa-server.key -subj "/CN=$DOMAIN"
openssl x509 -req -in https/mpa-server.csr -CA ./dev-secrets/mpa-rootCA.pem -CAkey ./dev-secrets/mpa-rootCA.key -CAcreateserial -out https/mpa-server.crt -days $DAYS -sha256 -extfile v3.ext
openssl pkcs12 -export -out https/mpa-server.pfx -inkey https/mpa-server.key -in https/mpa-server.crt
cat https/mpa-server.crt https/mpa-server.key > https/mpa-server.pem

# cp ~/.ssl/mpa-rootCA.pem .

# Cleanup
rm https/mpa-server.csr v3.ext

echo "Done! Files in https/: mpa-server.key, mpa-server.crt, mpa-server.pfx, mpa-server.pem"