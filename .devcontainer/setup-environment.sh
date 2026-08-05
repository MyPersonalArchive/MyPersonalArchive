#!/usr/bin/bash

# set up a symlink to the data folder in the container to make it accessible from the file explorer in VS Code.
rm -f /workspaces/MyPersonalArchive/data
ln -s /data /workspaces/MyPersonalArchive/data

# Trust lab root CA and Charles proxy CA inside the container. This is used for making external https requests to my lab services.
for cert in /data/dev-secrets/*.pem; do
	cp "$cert" "/usr/local/share/ca-certificates/$(basename "$cert" .pem).crt"
done
update-ca-certificates
