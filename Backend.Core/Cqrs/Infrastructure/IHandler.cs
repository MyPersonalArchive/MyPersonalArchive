namespace Backend.Core.Cqrs.Infrastructure;


public interface IHandler
{
    // marker interface
}


// Query interfaces
// Queries should have no side-effects, and the results can be cached.
public interface IQuery<TQuery, TResult>
    where TQuery : IQuery<TQuery, TResult>
{
}

public interface IAsyncQueryHandler<TQuery, TResult> : IHandler
    where TQuery : IQuery<TQuery, TResult>
{
    Task<TResult> Handle(TQuery query);
}

public interface IQueryHandler<TQuery, TResult> : IHandler
    where TQuery : IQuery<TQuery, TResult>
{
    TResult Handle(TQuery query);
}


// Command interfaces
// Commands will have side-effects and should never be cached.
// Try to keep handlers idempotent, so that if the same command is executed multiple times, it will have the same effect as executing it once.
public interface ICommand<TCommand> where TCommand : ICommand<TCommand>
{
}

public interface IAsyncCommandHandler<TCommand> : IHandler where TCommand : ICommand<TCommand>
{
    Task Handle(TCommand command);
}

public interface ICommandHandler<TCommand> : IHandler where TCommand : ICommand<TCommand>
{
    void Handle(TCommand command);
}


// // Command with result interfaces
// public interface ICommand<TCommand, TResult> where TCommand : ICommand<TCommand, TResult>
// {
// }

// public interface IAsyncCommandHandler<TCommand, TResult> : IHandler where TCommand : ICommand<TCommand, TResult>
// {
// 	Task<TResult> Handle(TCommand command);
// }

// public interface ICommandHandler<TCommand, TResult> : IHandler where TCommand : ICommand<TCommand, TResult>
// {
// 	TResult Handle(TCommand command);
// }
