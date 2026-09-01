# For local development

## with secrets in 1Password (Recommended!)

__Recommended:__ Secrets will never be stored in a plain text file on your development machine

1. Install 1Password CLI on host computer
  - Create a vault for `MpaDevelopment`
  - Create a new item of type "Credentials" called `mpa-local-auth` containing fields and values for `Audience`, `JWT Issuer` and `JWT Secret`.
  - Create a new item of type "Credentials" called `org-admin-api` containing fields and values for `base-url`, `authority`, `realm`, `client-id` and `client-secret`
  - Create a new item of type "Credentials" called `my-personal-archive` containing fields and values for `base-url`, `backchannel-authority`, `browser-authority`, `realm`, `client-id`, `client-secret`, `callback-path`, `signed-out-callback-path` and `default-redirect-path`
2. Copy this folder to host computer
3. Set appropriate permissions on `start-dev.sh``
	```
	chown arjan:staff start-dev-op.sh		# replace your name for "arjan"
	chmod u=rwx,g=rx,o=rx start-dev-op.sh
	```
4. Start Visual Studio Code by running `./start-dev-op.sh` to get the secrets as environment vars into the dev-container
5. Rebuild the container
6. Thats it!


## with secrets in in a .env file

__Not recommended__, since secrets are stored in a plain text file on your development machine


1. Create an environment file with variables and values for:
	```
	MPA_CertificatePassword=
	KEYCLOAK_ORG_ADMIN_API_BASE_URL=
	KEYCLOAK_ORG_ADMIN_API_AUTHORITY=
	KEYCLOAK_ORG_ADMIN_API_REALM=
	KEYCLOAK_ORG_ADMIN_API_CLIENT_ID=
	KEYCLOAK_ORG_ADMIN_API_CLIENT_SECRET=

	KEYCLOAK_MY_PERSONAL_ARCHIVE_BASE_URL=
	KEYCLOAK_MY_PERSONAL_ARCHIVE_AUTHORITY=
	KEYCLOAK_MY_PERSONAL_ARCHIVE_REALM=
	KEYCLOAK_MY_PERSONAL_ARCHIVE_CLIENT_ID=
	KEYCLOAK_MY_PERSONAL_ARCHIVE_CLIENT_SECRET=

	KEYCLOAK_MY_PERSONAL_ARCHIVE_CALLBACK_PATH=
	KEYCLOAK_MY_PERSONAL_ARCHIVE_SIGNED_OUT_CALLBACK_PATH=
	KEYCLOAK_MY_PERSONAL_ARCHIVE_DEFAULT_REDIRECT_PATH=

	LOCAL_AUTH_JWTSECRET=
	LOCAL_AUTH_JWTISSUER=
	LOCAL_AUTH_AUDIENCE=
	```
2. Copy this folder to host computer
3. Set appropriate permissions on `start-dev.sh``
	```
	chown arjan:staff start-dev-env.sh		# replace your name for "arjan"
	chmod u=rwx,g=rx,o=rx start-dev-env.sh
	```
4. Start Visual Studio Code by running `./start-dev-env.sh` to get the secrets as environment vars into the dev-container
5. Rebuild the container
6. Thats it!
