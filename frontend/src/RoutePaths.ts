export const RoutePaths = {
	Index: "/",
	// InitialSetup: "/initial-setup",
	SignIn: "/sign-in",
	SignOut: "/sign-out",
	Profile: "/profile",
	Archive: {
		List: "/archive/list",
		Edit: "/archive/edit/:archiveItemId",
		New: "/archive/new"
	},
	Blob: {
		List: "/blob/list",
		View: "/blob/view/:blobId"
	},
	Email: {
		List: "/email/:externalAccountId/list",
		View: "/email/:externalAccountId/view/:uniqueId",
	},
	ExternalAuthentication: {
		Basic: "/external-authentication/basic/:provider"
	},
	TenantAdmin: {
		Dashboard: "/tenant-admin/dashboard",
		Billing: "/tenant-admin/billing",
		Users: "/tenant-admin/users",
		Backup: "/tenant-admin/backup",
		Logs: "/tenant-admin/logs"
	}
}
