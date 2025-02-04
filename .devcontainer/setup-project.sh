#!/usr/bin/bash

sudo dotnet workload update
dotnet restore

# dotnet ef database update --project Backend.Api

cd frontend
npm install
