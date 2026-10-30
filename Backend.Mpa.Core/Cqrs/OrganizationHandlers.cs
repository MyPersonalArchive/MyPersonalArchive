using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Services;

namespace Backend.Mpa.Core.Cqrs;


[RequireOrganizationId]
public class GetOrganizationName : IQuery<GetOrganizationName, string>
{
}


[RequireOrganizationId]
[RequireRole("Administrator")]
public class RenameOrganization : ICommand<RenameOrganization>
{
	public required string NewName { get; set; }
}


public class OrganizationHandlers :
	IAsyncQueryHandler<GetOrganizationName, string>,
	IAsyncCommandHandler<RenameOrganization>
{
	private readonly KeycloakOrganizationClient _keycloakClient;
	private readonly ISignalRService _signalRService;

	public OrganizationHandlers(KeycloakOrganizationClient keycloakClient, ISignalRService signalRService)
	{
		_keycloakClient = keycloakClient;
		_signalRService = signalRService;
	}

	public async Task<string> Handle(GetOrganizationName query)
	{
		return await _keycloakClient.GetOrganizationNameAsync();
	}

	public async Task Handle(RenameOrganization command)
	{
		await _keycloakClient.RenameOrganizationAsync(command.NewName);

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("OrganizationNameUpdated", command.NewName));
	}
}
