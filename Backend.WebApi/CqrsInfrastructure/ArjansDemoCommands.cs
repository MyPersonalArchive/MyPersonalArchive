namespace Backend.WebApi.CqrsInfrastructure;

[RequireAllowedTenantId]
// [RequirementFeatureFlag("ArjansDemoCommands")]
// [RequirementPermission("ArjansDemoCommandsPermission")]
public class Demo1Query : IQuery<Demo1Query, string>
{
	public int MyProperty { get; set; }
}

public class Demo1QueryHandler : IAsyncQueryHandler<Demo1Query, string>
{
	public async Task<string> Handle(Demo1Query query)
	{
		// Simulate some asynchronous operation
		await Task.Delay(100);
		return $"Hello from Demo1QueryHandler! MyProperty value is: {query.MyProperty}";
	}
}

//-------------------------------------------------------------

[RequireAuthentication(UserMustBeAuthorized = true)]
public class Demo2Query : IQuery<Demo2Query, string>
{
	public string? MyDescription { get; set; }
}

public class Demo3Query : IQuery<Demo3Query, string>
{
	public int MyProperty { get; set; }
}

[RequireAllowedTenantId(UserMustBeAuthorized = false)]
public class Demo4Query : IQuery<Demo4Query, string>
{
	public int MyProperty { get; set; }
	public string? OtherProperty { get; set; }
	public NestedComplexType? ComplexProperty { get; set; }

	public class NestedComplexType
	{
		public string? NestedProperty { get; set; }
	}
}

public class Demo2QueryHandler :
	IAsyncQueryHandler<Demo2Query, string>,
	IQueryHandler<Demo3Query, string>,
	IQueryHandler<Demo4Query, string>
{
	public async Task<string> Handle(Demo2Query query)
	{
		// Simulate some asynchronous operation
		await Task.Delay(100);
		return $"MyDescription backwards is: {new string(query.MyDescription?.Reverse().ToArray() ?? Array.Empty<char>())}";
	}

	public string Handle(Demo3Query query)
	{
		return $"Hello from Demo3QueryHandler! Double of MyProperty value is: {query.MyProperty * 2}";
	}

	public string Handle(Demo4Query query)
	{
		return $"Hello from Demo4QueryHandler! MyProperty: {query.MyProperty}, OtherProperty: {query.OtherProperty}, ComplexProperty.NestedProperty: {query.ComplexProperty?.NestedProperty}";
	}
}

//-------------------------------------------------------------

[RequireAuthentication]
public class Demo5Command : ICommand<Demo5Command>
{
	public int MyProperty { get; set; }
}

public class Demo5CommandHandler : IAsyncCommandHandler<Demo5Command>
{
	public async Task Handle(Demo5Command command)
	{
		// Simulate some asynchronous operation
		await Task.Delay(100);
		Console.WriteLine($"Hello from Demo5CommandHandler! MyProperty value is: {command.MyProperty}");
	}
}
