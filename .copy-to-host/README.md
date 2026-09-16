# For local development

## Create and trust self-signed certificates

1. Make the cert creation scripts executable
	```shell
	chmod u=rwx,g=rx,o=rx create-self-signed-rootCA.sh
	chmod u=rwx,g=rx,o=rx create-self-signed-cert.sh
	```
2. Create and trust the root CA on the development host computer
	```shell
	./create-self-signed-rootCA.sh

	sudo security add-trusted-cert -d \
	-r trustRoot \
	-k /Library/Keychains/System.keychain \
	dev-secrets/mpa-rootCA.pem
	```
3. Create the certs for mpa server on localhost.  
  When prompted for a password, use `pass`. (This should be the same as the password specified in env vars)
	```shell
	./create-self-signed-cert.sh
	```
4. Move the resulting `dev-secrets` and `https` folders to `~/data/mpa/` (This should be the container's data directory)

## Start VSCode

### with secrets in 1Password (Recommended!)

__Recommended:__ Secrets will never be stored in a plain text file on your development machine

1. Install 1Password CLI on host computer
  - Create a vault for `MpaDevelopment`
  - Create a new item of type "Credentials" called `mpa-local-auth` containing fields and values for `Audience`, `JWT Issuer` and `JWT Secret`.
  - Create a new item of type "Credentials" called `org-admin-api` containing fields and values for `base-url`, `authority`, `realm`, `client-id` and `client-secret`
  - Create a new item of type "Credentials" called `my-personal-archive` containing fields and values for `base-url`, `backchannel-authority`, `browser-authority`, `realm`, `client-id`, `client-secret`, `callback-path`, `signed-out-callback-path` and `default-redirect-path`
2. Copy this folder to host computer
3. Set appropriate permissions on `start-dev.sh``
	```shell
	chown arjan:staff start-dev-op.sh		# replace your name for "arjan"
	chmod u=rwx,g=rx,o=rx start-dev-op.sh
	```
4. Start Visual Studio Code by running `./start-dev-op.sh` to get the secrets as environment vars into the dev-container
5. Rebuild the container
6. Thats it!


### with secrets in in a .env file (Not recommended!)

__Not recommended__, since secrets are stored in a plain text file on your development machine


1. Create an environment file with variables and values for:
	```
	MPA_CertificatePassword=pass


	KEYCLOAK_ORG_ADMIN_API_BASE_URL=
	KEYCLOAK_ORG_ADMIN_API_AUTHORITY=
	KEYCLOAK_ORG_ADMIN_API_REALM=
	KEYCLOAK_ORG_ADMIN_API_CLIENT_ID=
	KEYCLOAK_ORG_ADMIN_API_CLIENT_SECRET=

	KEYCLOAK_MY_PERSONAL_ARCHIVE_BACKCHANNEL_AUTHORITY=
	KEYCLOAK_MY_PERSONAL_ARCHIVE_BROWSER_AUTHORITY=
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
	(If an env var contains specific special characters, you might need to wrap the value in double quotes ("))  
2. Copy this folder to host computer
3. Set appropriate permissions on `start-dev.sh``
	```
	chown arjan:staff start-dev-env.sh		# replace your name for "arjan"
	chmod u=rwx,g=rx,o=rx start-dev-env.sh
	```
4. Start Visual Studio Code by running `./start-dev-env.sh` to get the secrets as environment vars into the dev-container
5. Rebuild the container
6. Thats it!


## Setup Keycloak

1. Navigate to https://localhost:8443/
   - Username and possword can be found in `docker-compose.yml`
2. Manage realms -> Create realm -> import the `realm-eport.json` file
3. Create users
   - Use email as both username and email address
   - Temporary user: Off
   - Email verified: On
4. Create organizations
   - Greate `Owner` and `Administrator` groups in organizations 
   - Assign users to the groups in the organization
