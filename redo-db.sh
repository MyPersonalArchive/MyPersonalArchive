#!/usr/bin/bash

rm -rf Backend.DbModel/Migrations/ && rm -rf data/Database/ && dotnet ef migrations add Initial --project=Backend.DbModel