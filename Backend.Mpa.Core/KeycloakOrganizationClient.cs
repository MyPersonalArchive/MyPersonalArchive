using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Backend.Core.Infrastructure;
using Microsoft.Extensions.Options;

namespace Backend.Mpa.Core;

public class KeycloakOrganizationClient
{
	private readonly HttpClient _http;
	private readonly KeycloakConfig _keycloakOptions;
	private readonly IAmbientDataResolver _ambientDataResolver;

	public KeycloakOrganizationClient(HttpClient http, IOptions<KeycloakConfig> keycloakOptions, IAmbientDataResolver ambientDataResolver)
	{
		_http = http;
		_keycloakOptions = keycloakOptions.Value;
		_ambientDataResolver = ambientDataResolver;
	}


	public async Task<string> GetOrganizationNameAsync(CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);

		var organization = await _http.GetFromJsonAsync<Organization>(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}",
			ct)
			?? throw new InvalidOperationException($"Organization '{organizationId}' not found in realm '{_keycloakOptions.Realm}'.");

		return organization.Name;
	}


	public async Task RenameOrganizationAsync(string newName, CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);
		var requestUri = $"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}";

		// Keycloak replaces the whole representation on update, so round-trip it to keep domains, attributes etc.
		var organization = await _http.GetFromJsonAsync<JsonObject>(requestUri, ct)
			?? throw new InvalidOperationException($"Organization '{organizationId}' not found in realm '{_keycloakOptions.Realm}'.");
		organization["name"] = newName;

		using var response = await _http.PutAsJsonAsync(requestUri, organization, ct);

		response.EnsureSuccessStatusCode();
	}


	public async Task<List<OrganizationMember>> ListOrganizationGroupMembersAsync(
		string? groupName = null,
		CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);

		var groupId = groupName is not null
			? await FindGroupIdByNameAsync(organizationId, groupName, ct) ?? throw new InvalidOperationException($"Group '{groupName}' not found in organization '{_ambientDataResolver.GetCurrentTenantId()}'.")
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


	public async Task InviteUserAsync(
		string email,
		string firstName,
		string lastName,
		CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);

		using var content = new FormUrlEncodedContent(new Dictionary<string, string>
		{
			["email"] = email,
			["firstName"] = firstName,
			["lastName"] = lastName,
		});

		using var response = await _http.PostAsync(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/members/invite-user",
			content,
			ct);

		response.EnsureSuccessStatusCode();
	}


	public async Task<List<OrganizationInvitation>> ListPendingInvitationsAsync(CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);

		return await _http.GetFromJsonAsync<List<OrganizationInvitation>>(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/invitations?status=PENDING",
			ct)
			?? [];
	}


	public async Task ResendInvitationAsync(string invitationId, CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);

		using var response = await _http.PostAsync(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/invitations/{Uri.EscapeDataString(invitationId)}/resend",
			null,
			ct);

		response.EnsureSuccessStatusCode();
	}


	public async Task DeleteInvitationAsync(string invitationId, CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);

		using var response = await _http.DeleteAsync(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/invitations/{Uri.EscapeDataString(invitationId)}",
			ct);

		response.EnsureSuccessStatusCode();
	}


	public async Task RemoveMemberAsync(string memberId, CancellationToken ct = default)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);

		using var response = await _http.DeleteAsync(
			$"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/members/{Uri.EscapeDataString(memberId)}",
			ct);

		response.EnsureSuccessStatusCode();
	}


	public async Task AddMemberToGroupAsync(string groupName, string memberId, CancellationToken ct = default)
	{
		using var response = await _http.PutAsync(await GetGroupMemberUriAsync(groupName, memberId, ct), null, ct);

		response.EnsureSuccessStatusCode();
	}


	public async Task RemoveMemberFromGroupAsync(string groupName, string memberId, CancellationToken ct = default)
	{
		using var response = await _http.DeleteAsync(await GetGroupMemberUriAsync(groupName, memberId, ct), ct);

		response.EnsureSuccessStatusCode();
	}


	private async Task<string> GetGroupMemberUriAsync(string groupName, string memberId, CancellationToken ct)
	{
		var organizationId = await GetCurrentOrganizationIdAsync(ct);
		var groupId = await FindGroupIdByNameAsync(organizationId, groupName, ct)
			?? throw new InvalidOperationException($"Group '{groupName}' not found in organization '{_ambientDataResolver.GetCurrentTenantId()}'.");

		return $"{_keycloakOptions.BaseUrl}/admin/realms/{_keycloakOptions.Realm}/organizations/{organizationId}/groups/{groupId}/members/{Uri.EscapeDataString(memberId)}";
	}


	private async Task<string> GetCurrentOrganizationIdAsync(CancellationToken ct)
	{
		var organizationAlias = _ambientDataResolver.GetCurrentTenantId()!;

		return await FindOrganizationIdByAliasAsync(organizationAlias, ct)
			?? throw new InvalidOperationException($"Organization '{organizationAlias}' not found in realm '{_keycloakOptions.Realm}'.");
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

	public record OrganizationInvitation
	{
		[JsonPropertyName("id")] public string Id { get; init; } = "";
		[JsonPropertyName("email")] public string Email { get; init; } = "";
		[JsonPropertyName("firstName")] public string? FirstName { get; init; }
		[JsonPropertyName("lastName")] public string? LastName { get; init; }
		[JsonPropertyName("sentDate")] public long SentDate { get; init; }
		[JsonPropertyName("expiresAt")] public long ExpiresAt { get; init; }
		[JsonPropertyName("status")] public string Status { get; init; } = "";
	}
	#endregion
}
