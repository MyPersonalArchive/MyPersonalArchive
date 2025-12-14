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

public class Demo2QueryHandler :
	IAsyncQueryHandler<Demo2Query, string>,
	IQueryHandler<Demo3Query, string>
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
}


public class Demo3Command : ICommand<Demo3Command>
{
	public int MyProperty { get; set; }
}

public class Demo3CommandHandler : ICommandHandler<Demo3Command>
{
	public async Task Handle(Demo3Command command)
	{
		// Simulate some asynchronous operation
		await Task.Delay(100);
		Console.WriteLine($"Hello from Demo3CommandHandler! MyProperty value is: {command.MyProperty}");
	}
}
