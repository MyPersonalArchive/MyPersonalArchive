# Command line instructions for working with EF migrations

## Create a new migration
```
dotnet ef migrations add NameOfMigration --project=Backend.Mpa.DbModel
dotnet ef migrations add NameOfMigration --project=Backend.Mpa.DbModel --startup-project Backend.WebApi
```

## Create database or apply migrations to database
```
dotnet ef database update --project=Backend.Mpa.DbModel
dotnet ef database update --project=Backend.Mpa.DbModel --startup-project Backend.WebApi
```

## Revert to a previous migration
```
dotnet ef database update PreviousMigrationName --project=Backend.Mpa.DbModel
dotnet ef database update PreviousMigrationName --project=Backend.Mpa.DbModel --startup-project Backend.WebApi
```

