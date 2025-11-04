# MyPersonalArchive
## Safe archival storage for important stuff

Our mission is to enable people to reliably archive digital artefacts.


## Development

When running in Development environment, you can sign in with
- admin@localhost and p@$$w0rd
- arjan@localhost and pass
- stian@localhost and word


## Preparations on MacOS on host

### Create self-signed root CA

If you haven't got a local root CA yet, this script will create one and trust it MacOS.

(The certificate files will be stored in `~/.ssl/` and trusted in Keychain access)

```shell
#!/bin/bash
set -e
mkdir -p ~/.ssl

# Step 1: Create self-signed Root CA
echo "Creating Root CA..."
openssl genrsa -out ~/.ssl/rootCA.key 2048
openssl req -x509 -new -nodes -key ~/.ssl/rootCA.key -sha256 -days 1825 -out ~/.ssl/rootCA.pem

# Step 2: Trusting the Root CA by adding it to the Keychain
echo "Adding to Keychain (requires sudo)..."
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/.ssl/rootCA.pem

chmod 600 ~/.ssl/rootCA.key
chmod 644 ~/.ssl/rootCA.pem
```

### Create self-signed certificate

To create the self-signed certificate for the application, you use the trusted rootCA, so that you don't need to trust each generated certificate seperatly on your computer.

(The certificate files will be stored in `~/data/Mpa/https/` and trusted in Keychain access)

```shell
#!/bin/bash

# Simple Self-Signed Certificate Creator for macOS
set -e

mkdir -p ~/data/Mpa/https
cd ~/data/Mpa/https
rm -f server.key server.crt server.pfx server.pem

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

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
IP.1 = 127.0.0.1
EOF

openssl req -new -sha256 -nodes -out server.csr -newkey rsa:2048 -keyout server.key -subj "/CN=$DOMAIN"
openssl x509 -req -in server.csr -CA ~/.ssl/rootCA.pem -CAkey ~/.ssl/rootCA.key -CAcreateserial -out server.crt -days $DAYS -sha256 -extfile v3.ext
openssl pkcs12 -export -out server.pfx -inkey server.key -in server.crt
cat server.crt server.key > server.pem

# Cleanup
rm server.csr v3.ext

echo "Done! Files: server.key, server.crt, server.pfx, server.pem"
```

