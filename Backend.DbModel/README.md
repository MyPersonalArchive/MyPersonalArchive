# Command line instructions for working with EF migrations

## Create a new migration
```
dotnet ef migrations add NameOfMigration --project=Backend.DbModel
dotnet ef migrations add NameOfMigration --project=Backend.DbModel --startup-project Backend.WebApi
```

## Create database or apply migrations to database
```
dotnet ef database update --project=Backend.DbModel
dotnet ef database update --project=Backend.DbModel --startup-project Backend.WebApi
```
