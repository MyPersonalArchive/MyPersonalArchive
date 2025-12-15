namespace Backend.WebApi.Controllers;

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


public class Demo2Query : IQuery<Demo2Query, string>
{
	public string? MyDescription { get; set; }
}
public class Demo3Query : IQuery<Demo3Query, string>
{
	public int MyProperty { get; set; }
}
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
		return $"Hello from Demo2QueryHandler! MyDescription value is: {query.MyDescription}";
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


public class Demo3Command : ICommand<Demo3Command>
{
	public int MyProperty { get; set; }
}

public class Demo3CommandHandler : IAsyncCommandHandler<Demo3Command>
{
	public async Task Handle(Demo3Command command)
	{
		// Simulate some asynchronous operation
		await Task.Delay(100);
		Console.WriteLine($"Hello from Demo3CommandHandler! MyProperty value is: {command.MyProperty}");
	}
}
