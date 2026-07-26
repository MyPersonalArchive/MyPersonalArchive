# MyPersonalArchive Agent Instructions

## Scope

- This repository is a .NET 10 solution with backend services, a Web API, EF Core SQLite data access, and a frontend app in React/TypeScript.
- Keep changes focused and idiomatic for the existing codebase; prefer small, local edits over broad refactors.

## C# Conventions

- Follow the existing nullable-enabled style: prefer explicit null handling, avoid suppressions unless they are clearly justified, and use `required` where the model expects initialized properties.
- Keep asynchronous code asynchronous end-to-end. Avoid blocking calls when an async API exists.
- Preserve the repository's current style in each file. Do not reformat unrelated code or convert the whole codebase to a new style.
- Use dependency injection and service registration patterns already established in the solution.
- Prefer to check against `is null` over `== null`
- Prefer collection expressions. Don't suggest changing collection expressions!
- Prefer newer syntax
- Don't materialize collections unnecessary
- Never use primary constructors for service classes!
- Prefer primary constructors for data classes, structs and records!

## EF Core And Database Work

- For EF Core work, keep relationship configuration in `Backend.Mpa.DbModel/Database/MpaDbContext.cs` and update migrations instead of editing the database manually.
- When changing EF models, update the model, then add a migration, then validate with `dotnet ef database update` using `Backend.WebApi` as the startup project when needed.
- Treat SQLite schema changes carefully; table rebuilds are common, so prefer minimal migration steps and verify them locally.

## Solution Layout

- `Backend.WebApi` is the main application host. It should be kept general for any web app, and contain little or no application specific code.
- `Backend.Core` provide general and non application specific shared backend logic and services.
- `Backend.Mpa.*` provide application specific code, models, logic and services
  - `Backend.Mpa.DbModel` contains entity types, DbContext configuration, and EF migrations.
  - `Backend.Mpa.EmailIngestion`  code for email and other external connections.
  - `Backend.Mpa.Core` general application specific shared backend.
- `ConsoleApp1` is a utility/console entry point and should stay consistent with the backend dependency stack.
- The frontend lives in [frontend/README.md](frontend/README.md).

## Validation

- Use `dotnet build MyPersonalArchive.slnx` as the primary solution-level check.
- Use `dotnet list MyPersonalArchive.slnx package --vulnerable --include-transitive` when changing package versions.

## Editing Guidance

- Prefer the smallest change that solves the problem.
- Preserve public APIs unless the change explicitly requires a breaking adjustment.
- Never create redundant code. Check for redundancy when rewriting code.
- Add or update migrations rather than hand-editing generated database artifacts.
