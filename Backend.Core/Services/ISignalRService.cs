namespace Backend.Core.Services;

public interface ISignalRService
{
	Task PublishToSharedChannel(Message message);
	Task PublishToTenantChannel(Message message);
	Task PublishToUserChannel(Message message);

	public class Message
	{
		public string MessageType { get; private set; }
		public object? Data { get; private set; }

		// public Message(object data)
		// 	: this(data.GetType().Name, data)
		// { }

		public Message(string messageType, object? data)
		{
			MessageType = messageType;
			Data = data;
		}
	}
}