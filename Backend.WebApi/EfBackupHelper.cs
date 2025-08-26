using Newtonsoft.Json;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using Backend.DbModel.Database;

public static class EfBackupHelper
{
    private static JsonSerializerSettings JsonSettings => new()
    {
        Formatting = Formatting.Indented,
        PreserveReferencesHandling = PreserveReferencesHandling.Objects,
        ReferenceLoopHandling = ReferenceLoopHandling.Serialize,
        NullValueHandling = NullValueHandling.Ignore
    };

    public static string Backup<TEntity>(MpaDbContext context, int tenantId) where TEntity : class
    {
        IQueryable<TEntity> query = context.Set<TEntity>()
            .Where(e => EF.Property<int>(e, "TenantId") == tenantId);;
            
        query = IncludeAllNavigations(query, context);

        var data = query.ToList();
        return JsonConvert.SerializeObject(data, JsonSettings);
    }

    public static void Restore<TEntity>(DbContext context, string json) where TEntity : class
    {
        var entity = JsonConvert.DeserializeObject<TEntity>(json, JsonSettings);
        if (entity == null) return;

        var entityType = context.Model.FindEntityType(typeof(TEntity));
        var keyProp = entityType.FindPrimaryKey().Properties.First();
        var keyName = keyProp.Name;

        var keyValue = entity.GetType().GetProperty(keyName)?.GetValue(entity);
        var existingEntity = context.Set<TEntity>().Find(keyValue);

        if (existingEntity != null)
        {
            context.Entry(existingEntity).CurrentValues.SetValues(entity);

            // TODO: Update navigation properties
            //UpdateNavigationProperties(existingEntity, entity, context);
        }
        else
        {
            context.Set<TEntity>().Add(entity);
        }

        context.SaveChanges();
    }

    private static IQueryable<TEntity> IncludeAllNavigations<TEntity>(IQueryable<TEntity> query, DbContext context) where TEntity : class
    {
        var entityType = context.Model.FindEntityType(typeof(TEntity));
        foreach (var navigation in entityType.GetNavigations())
        {
            query = query.Include(navigation.Name);
        }
        return query;
    }

    private static void UpdateNavigationProperties(object existing, object updated, DbContext context)
    {
        var entityType = context.Model.FindEntityType(existing.GetType());

        foreach (var nav in entityType.GetNavigations())
        {
            var navProp = existing.GetType().GetProperty(nav.Name);
            var updatedValue = updated.GetType().GetProperty(nav.Name)?.GetValue(updated);

            if (updatedValue is IEnumerable<object> updatedCollection)
            {
                var existingCollection = (IEnumerable<object>)navProp?.GetValue(existing) ?? Enumerable.Empty<object>();
                var list = existingCollection.ToList();

                foreach (var item in updatedCollection)
                {
                    var childKey = context.Model.FindEntityType(item.GetType()).FindPrimaryKey().Properties.First();
                    var childKeyValue = item.GetType().GetProperty(childKey.Name)?.GetValue(item);

                    var existingChild = list.FirstOrDefault(x =>
                        x.GetType().GetProperty(childKey.Name)?.GetValue(x)?.Equals(childKeyValue) == true);

                    if (existingChild != null)
                    {
                        context.Entry(existingChild).CurrentValues.SetValues(item);
                        UpdateNavigationProperties(existingChild, item, context);
                    }
                    else
                    {
                        list.Add(item);
                    }
                }

                navProp?.SetValue(existing, list);
            }
            else if (updatedValue != null)
            {
                var existingChild = navProp?.GetValue(existing);
                if (existingChild != null)
                {
                    context.Entry(existingChild).CurrentValues.SetValues(updatedValue);
                    UpdateNavigationProperties(existingChild, updatedValue, context);
                }
                else
                {
                    navProp?.SetValue(existing, updatedValue);
                }
            }
        }
    }
}
