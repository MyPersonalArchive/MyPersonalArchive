#!/usr/bin/bash

# Extreme caution is advised when running this script, as it will delete existing migrations.
rm -rf Backend.DbModel/Migrations/ && rm -rf data/Database/ && rm -rf data/Blobs && dotnet ef migrations add Initial --project=Backend.DbModel