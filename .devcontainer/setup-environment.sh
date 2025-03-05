#!/usr/bin/bash

rm -f /workspaces/MyPersonalArchive/data
ln -s /data /workspaces/MyPersonalArchive/data

git config --global pull.ff only
