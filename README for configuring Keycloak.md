Here's the complete walkthrough with exact current-UI paths, verified against the latest Keycloak admin console layout.

---

# End-to-end: `allowedTenantIds` as a JSON array in your tokens

You'll do three things:
1. **Declare the attribute** in the user profile (so the field shows up on users).
2. **Set values** on a user (the list of tenant IDs).
3. **Add a protocol mapper** that copies the attribute into the token as an array claim.

---

## Step 1 — Declare `allowedTenantIds` in the User Profile

1. Left menu → **Realm settings**.
2. Click the **User profile** tab.
3. Under the **Attributes** sub-tab, click **Create attribute**.
4. Fill in:
   - **Name:** `allowedTenantIds` ← this is the key everything else references
   - **Display name:** `Allowed Tenant IDs` (what admins see)
   - Set the attribute to **multivalued** / multi-value input type (so the user form accepts repeated values) — in the UI this is a "Multivalued" toggle or multi-value input type selector on the attribute definition.
   - Permissions: grant **Admin** read + write; leave User edit off (tenants should be admin-controlled).
5. Click **Save** / **Create**.

The attribute now appears as an editable field on every user's **Details** page.

---

## Step 2 — Set the tenant ID values on a user

1. Left menu → **Users**.
2. Click the user (or **Add user** to create one).
3. On the user's **Details** page, find the **Allowed Tenant IDs** field you just declared.
4. Enter multiple values — e.g. `tenant-a`, then add another row `tenant-b`, then `tenant-c`. Each row is one value of the same attribute.
5. Click **Save**.

> If you instead enabled **Unmanaged Attributes** (Realm settings → General → Unmanaged Attributes = Enabled), there's a separate **Attributes** tab on each user where you add repeated `allowedTenantIds` rows manually — same effect, less polish.

---

## Step 3 — Add the protocol mapper

You can attach the mapper directly to a client, or to a shared **client scope**. The shared-scope approach is cleaner if multiple clients need the claim. I'll show both.

### Option A — Per-client (dedicated scope)

1. Left menu → **Clients**.
2. Click your client (e.g. `my-app`).
3. Click the **Client scopes** tab.
4. At the top of the list you'll see a dedicated scope named **`my-app-dedicated`** — click it.
5. Inside that scope, click the **Mappers** sub-tab (or just scroll to the mappers list).
6. Click **Add mapper** → **By configuration**.
7. In the "Configure a new mapper" panel, click **User Attribute**.
8. Fill in the form (details below) and click **Save**.

### Option B — Shared client scope (recommended for reuse)

1. Left menu → **Client scopes**.
2. Click **Create client scope**. Name it e.g. `tenant-ids`. Save.
3. Inside the new scope, go to the **Mappers** tab → **Add mapper** → **By configuration** → **User Attribute**.
4. Fill in the form (details below) and click **Save**.
5. Go back to **Clients → *your client* → Client scopes** tab → **Add client scope** → select `tenant-ids` → **Default** (so it's always applied) or **Optional** (only when requested via `scope=tenant-ids`).

### The mapper form

| Field | Value | Notes |
|---|---|---|
| **Name** | `allowedTenantIds` | Internal label for the mapper |
| **User Attribute** | `allowedTenantIds` | Must exactly match the attribute key from Steps 1–2 |
| **Token Claim Name** | `allowedTenantIds` | The JSON key in the JWT |
| **Claim JSON Type** | `String` | Tenant IDs are strings |
| **Multivalued** | ✅ **ON** | **Critical** — emits all values as a JSON array instead of just the first one |
| **Aggregate attribute values** | OFF (unless you also store values on groups) | Merges values inherited from the user's groups; dedupes; order not guaranteed |
| **Add to ID token** | ✅ ON | If you want it in the ID token |
| **Add to access token** | ✅ ON | If you want it in the JWT access token |
| **Add to lightweight access token** | ✅ ON | If you use lightweight access tokens (incognito / token exchange) |
| **Add to userinfo** | ✅ ON | So the claim appears at the `/userinfo` endpoint |

Click **Save**.

> The `Multivalued` toggle is the one that makes the difference between `"allowedTenantIds": "tenant-a"` (first value only) and `"allowedTenantIds": ["tenant-a","tenant-b","tenant-c"]` (the array you want). If you see only a single string in the token, this is the switch that's wrong.

---

## Step 4 — Verify the claim appears in the token

1. In the admin console, open your client → **Client scopes** tab → click the dedicated scope (or your `tenant-ids` scope).
2. There's an **Evaluate** tool (or on the client detail page, **Evaluate** tab in older versions). Select the scope, pick your test user, generate a sample access token / ID token.
3. Inspect the decoded JWT — you should see:

```json
{
  "sub": "...",
  "allowedTenantIds": ["tenant-a", "tenant-b", "tenant-c"],
  ...
}
```

4. Alternatively, do a real token request (`authorization_code` + PKCE flow) and decode the JWT at jwt.io or with `jq`.

---

## Common pitfalls (checklist)

- **Attribute key mismatch** — the `User Attribute` field in the mapper must be byte-for-byte identical to the attribute `Name` from the User Profile (e.g. `allowedTenantIds`, not `AllowedTenantIds`).
- **Multivalued not enabled** on the mapper → you get only the first value as a plain string.
- **`Add to access token` / `Add to ID token` toggles off** → claim silently absent from that token type.
- **Attribute not actually set on the user** → the claim is omitted entirely (no empty array). If you need an empty array for users with no tenants, you'll need a custom mapper SPI.
- **Scope not attached as Default** → if it's Optional, you must request it: `scope=openid tenant-ids`.
- **Need a cache refresh** — some users report the claim only appearing after a Keycloak restart; if it doesn't show up, try re-logging-in or restarting.

