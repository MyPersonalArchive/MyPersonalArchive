using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Backend.Mpa.Core;

public class KeycloakOrgGroupClient
{
	private readonly HttpClient _http;

	public KeycloakOrgGroupClient(HttpClient http)
	{
		_http = http;
	}

	/// <summary>
	/// Gets all members of the "Owner" group within a specific organization.
	/// Handles pagination automatically (default page size is 100).
	/// </summary>
	public async Task<List<OrgMember>> GetOwnerGroupMembersAsync(
		string realm,
		string orgId,
		string groupName = "Owner",
		CancellationToken ct = default)
	{
		// Step 1: Find the group by name within the organization
		var groupId = await FindGroupIdByNameAsync(realm, orgId, groupName, ct);
		if (groupId is null)
			throw new InvalidOperationException(
				$"Group '{groupName}' not found in organization '{orgId}'.");

		// Step 2: Paginate through all members of that group
		var allMembers = new List<OrgMember>();
		int first = 0;
		const int pageSize = 100;

		while (true)
		{
			var page = await _http.GetFromJsonAsync<List<OrgMember>>(
				$"admin/realms/{realm}/organizations/{orgId}/groups/{groupId}/members" +
				$"?first={first}&max={pageSize}",
				ct)
				?? [];

			if (page.Count == 0)
				break;

			allMembers.AddRange(page);
			first += pageSize;
		}

		return allMembers;
	}

	/// <summary>
	/// Finds a group ID by exact name match within an organization.
	/// </summary>
	private async Task<string?> FindGroupIdByNameAsync(
		string realm,
		string orgId,
		string groupName,
		CancellationToken ct)
	{
//TODO: Get the org quid from the org id. The org id is not the same as the org guid. The org guid is used in the url to get the groups. The org id is used in the url to get the members of a group.
		var organizations = 

		var groups = await _http.GetFromJsonAsync<List<OrgGroup>>(
			$"admin/realms/{realm}/organizations/{orgId}/groups" +
			$"?search={Uri.EscapeDataString(groupName)}&exact=true",
			ct)
			?? [];

		return groups.FirstOrDefault(g =>
			string.Equals(g.Name, groupName, StringComparison.OrdinalIgnoreCase))?.Id;
	}
}

// ─── DTOs ───────────────────────────────────────────────────────────

public record OrgGroup
{
	[JsonPropertyName("id")] public string Id { get; init; } = "";
	[JsonPropertyName("name")] public string Name { get; init; } = "";
}

public record OrgMember
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
