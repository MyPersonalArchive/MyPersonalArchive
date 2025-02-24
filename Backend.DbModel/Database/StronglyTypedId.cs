// using System.Collections.Concurrent;
// using System.Diagnostics.CodeAnalysis;
// using System.Linq.Expressions;

namespace Backend.DbModel.Database;


public abstract record StronglyTypedId<TValue>(TValue Value)
	where TValue : notnull
{
	public override sealed string ToString() => $"{Value}";
}