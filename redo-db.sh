#!/usr/bin/bash

rm -rf Backend.DbModel/Migrations/ && rm -rf data/Database/ && rm -rf data/Blobs && dotnet ef migrations add Initial --project=Backend.DbModel