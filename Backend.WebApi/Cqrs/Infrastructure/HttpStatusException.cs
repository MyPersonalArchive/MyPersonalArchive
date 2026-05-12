using System.Net;

namespace Backend.WebApi.Cqrs.Infrastructure;


[Serializable]
public abstract class HttpStatusException : Exception
{
	private readonly HttpStatusCode _statusCode;
	private readonly string _message;
	private readonly Exception? _innerException;

	public HttpStatusException(HttpStatusCode statusCode, string message, Exception? innerException)
		: base(message, innerException)
	{
		_statusCode = statusCode;
		_message = message;
		_innerException = innerException;
	}


	public HttpStatusCode StatusCode => _statusCode;
	public string Message => _message;
	public Exception? InnerException => _innerException;
}


public class HttpNotFoundException : HttpStatusException
{
	public HttpNotFoundException(string message = "Not Found", Exception? innerException = null)
		: base(HttpStatusCode.NotFound, message, innerException)
	{
	}
}

public class HttpBadRequestException : HttpStatusException
{
	public HttpBadRequestException(string message = "Bad Request", Exception? innerException = null)
		: base(HttpStatusCode.BadRequest, message, innerException)
	{
	}
}

public class HttpNotImplementedException : HttpStatusException
{
	public HttpNotImplementedException(string message = "Not Implemented", Exception? innerException = null)
		: base(HttpStatusCode.NotImplemented, message, innerException)
	{
	}
}