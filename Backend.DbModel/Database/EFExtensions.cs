using System.Linq.Expressions;

namespace Backend.DbModel.Database;

public static class EFExtensions
{ 
    public static IQueryable<T> ConditionalWhere<T>(
        this IQueryable<T> source, 
        Func<bool> condition,
        Expression<Func<T, bool>> predicate)
    {
        if (condition())
        {
            return source.Where(predicate);
        }

        return source;
    }

    public static IQueryable<T> ConditionalWhere<T>(
        this IQueryable<T> source, 
        bool condition,
        Expression<Func<T, bool>> predicate)
    {
        if (condition)
        {
            return source.Where(predicate);
        }

        return source;
    }
}