using System.Linq.Expressions;

namespace Backend.DbModel.Database;

public static class EFExtensions
{
	extension<T>(IQueryable<T> source)
	{
		public IQueryable<T> ConditionalWhere(
			Func<bool> condition,
			Expression<Func<T, bool>> predicate)
		{
			if (condition())
			{
				return source.Where(predicate);
			}

			return source;
		}

		public IQueryable<T> ConditionalWhere(
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

	extension<T>(IEnumerable<T> source)
	{
		public IEnumerable<T> ConditionalWhere(
			Func<bool> condition,
			Func<T, bool> predicate)
		{
			if (condition())
			{
				return source.Where(predicate);
			}

			return source;
		}

		public IEnumerable<T> ConditionalWhere(
			bool condition,
			Func<T, bool> predicate)
		{
			if (condition)
			{
				return source.Where(predicate);
			}

			return source;
		}
	}
}