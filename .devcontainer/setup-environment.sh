#!/usr/bin/bash

# set up a symlink to the data folder in the container to make it accessible from the file explorer in VS Code.
rm -f /workspaces/MyPersonalArchive/data
ln -s /data /workspaces/MyPersonalArchive/data

# Trust lab root CA inside the container. This is used for making external https requests to my lab services.
cp /data/dev-secrets/rootCA.pem /usr/local/share/ca-certificates/lab-ca.crt
ls /usr/local/share/ca-certificates/
update-ca-certificates
