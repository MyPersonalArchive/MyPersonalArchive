namespace Backend.Backup.Services;

public interface IReconnectionRequestService
{
    Task<bool> RequestReconnectionAsync(string localPeerId, string remotePeerId, int destinationId);
}

public class ReconnectionRequestService(PeerConnectionService peerConnectionService) : IReconnectionRequestService
{
	public async Task<bool> RequestReconnectionAsync(string localPeerId, string remotePeerId, int destinationId)
    {
        return await peerConnectionService.RequestReconnectionAsync(localPeerId, remotePeerId, destinationId);
    }
}
