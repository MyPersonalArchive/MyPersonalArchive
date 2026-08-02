using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Backend.Core.Infrastructure;

namespace Backend.Mpa.Core;

public class KeycloakOrganizationClient
{
	private readonly HttpClient _http;
	private readonly KeycloakConfig _keycloakOptions;
	private readonly IAmbientDataResolver _ambientDataResolver;

	public KeycloakOrganizationClient(HttpClient http, KeycloakConfig keycloakOptions, IAmbientDataResolver ambientDataResolver)
	{
		_http = http;
		_keycloakOptions = keycloakOptions;
		_ambientDataResolver = ambientDataResolver;
	}


	public async Task<List<OrganizationMember>> ListOrganizationGroupMembersAsync(
		string? groupName = null,
		CancellationToken ct = default)
	{
		var organizationAlias = _ambientDataResolver.GetCurrentTenantId()!;

		var organizationId = await FindOrganizationIdByAliasAsync(organizationAlias, ct);
		if (organizationId is null)
		{
			throw new InvalidOperationException($"Organization '{organizationAlias}' not found in realm '{_keycloakOptions.Realm}'.");
		}

		var groupId = groupName is not null
			? await FindGroupIdByNameAsync(organizationId, groupName, ct) ?? throw new InvalidOperationException($"Group '{groupName}' not found in organization '{organizationAlias}'.")
			: null;

		string requestUri = groupId is not null
				? $"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/groups/{groupId}/members"
				: $"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/members";

		// Paginate through all members of that group
		var allMembers = new List<OrganizationMember>();
		int first = 0;
		const int pageSize = 100;

		while (true)
		{
			var page = await _http.GetFromJsonAsync<List<OrganizationMember>>(
				$"{requestUri}?first={first}&max={pageSize}",
				ct)
				?? [];

			if (page.Count == 0)
				break;

			allMembers.AddRange(page);
			first += pageSize;
		}

		return allMembers;
	}


	private async Task<string?> FindOrganizationIdByAliasAsync(
			string organizationAlias,
			CancellationToken ct)
	{
		var organizations = await _http.GetFromJsonAsync<List<Organization>>(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations",
			ct)
			?? [];

		return organizations.Find(g => g.Alias == organizationAlias)?.Id;
	}


	private async Task<string?> FindGroupIdByNameAsync(
		string organizationId,
		string groupName,
		CancellationToken ct)
	{
		var groups = await _http.GetFromJsonAsync<List<OrganizationGroup>>(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/groups?search={Uri.EscapeDataString(groupName)}&exact=true",
			ct)
			?? [];

		return groups.Find(g => g.Name == groupName)?.Id;
	}


	#region DTOs
	public record Organization
	{
		[JsonPropertyName("id")] public string Id { get; init; } = "";
		[JsonPropertyName("alias")] public string Alias { get; init; } = "";
		[JsonPropertyName("name")] public string Name { get; init; } = "";
	}


	public record OrganizationGroup
	{
		[JsonPropertyName("id")] public string Id { get; init; } = "";
		[JsonPropertyName("name")] public string Name { get; init; } = "";
	}

	public record OrganizationMember
	{
		[JsonPropertyName("id")] public string Id { get; init; } = "";
		[JsonPropertyName("username")] public string Username { get; init; } = "";
		[JsonPropertyName("email")] public string? Email { get; init; }
		[JsonPropertyName("firstName")] public string? FirstName { get; init; }
		[JsonPropertyName("lastName")] public string? LastName { get; init; }
		[JsonPropertyName("enabled")] public bool Enabled { get; init; }
		[JsonPropertyName("emailVerified")] public bool EmailVerified { get; init; }
		[JsonPropertyName("createdTimestamp")] public long CreatedTimestamp { get; init; }
	}
	#endregion
}
