using Backend.Core.Authentication;
using MailKit.Net.Imap;

namespace Backend.EmailIngestion.Providers;

public abstract class AuthProviderBase
{
	public abstract AuthMode AuthenticationMode { get; }

	public abstract string Name { get; }

	public abstract Task<IImapClient> ConnectAsync(IAuthContext auth, string email);

	public abstract Task<IAuthContext> RefreshAccessTokenIfNeeded(IAuthContext auth);
}
