# Running MyPersonalArchive in Docker

## Build

Run from the repository root (the Dockerfile needs the whole solution as build context):

```sh
docker build -t aeinbu/mypersonalarchive:latest .
```
A few things worth knowing about this build:

- It must run from the repo root, not from Backend.WebApi/ — the Dockerfile needs the full solution plus frontend/ as build context.
- It's a 4-stage build: compiles libvips from source (~1-2 min), builds the frontend with npm, builds/publishes the .NET backend, then assembles the runtime image. First build takes a few minutes; later builds reuse Docker's layer cache for stages you haven't touched (e.g. if you only change backend code, the libvips-build and frontend-build stages stay cached).
- Once built, run it with the command in DOCKERIFY.md's "Run (minimum)" section.

### Building for both amd64 and arm64

The plain `docker build` above only produces an image for your local machine's
architecture. To build for both `linux/amd64` and `linux/arm64` (e.g. to publish an
image that works on both typical cloud VMs and Apple Silicon / Raspberry Pi), use
`docker buildx` instead:

```sh
docker buildx build --platform linux/amd64,linux/arm64 -t aeinbu/mypersonalarchive:latest --push .
```

- `--push` is required for a multi-platform build — Docker can't load more than one
  platform's image into your local `docker images` at once, only into a registry
  (Docker Hub, GHCR, etc.), so you need to be logged in (`docker login`) first.
- To just verify both platforms build successfully without publishing anywhere,
  drop `--push` (and don't add `--load` either) — buildx will build both platforms
  and discard the output, which is enough to catch cross-platform build failures.
- To build and use a single non-native platform locally (e.g. build an amd64 image
  on an arm64 machine to test it), use `--platform linux/amd64 --load` instead —
  `--load` only works with one platform at a time.
- All base images in the Dockerfile (`ubuntu`, `node`, `mcr.microsoft.com/dotnet/sdk`,
  `mcr.microsoft.com/dotnet/aspnet`) publish both architectures, and the
  `libvips-build` stage compiles from source per-platform, so no Dockerfile changes
  are needed to support both — buildx handles the cross-compilation (via QEMU
  emulation unless you have native builders for both architectures, which is slower
  but requires no extra setup).

## Run (minimum)

```sh
docker run -d \
  --name mypersonalarchive \
  -p 5054:5054 \
  -v mpa-data:/data \
  -e JWT__JwtSecret="a-long-random-secret-at-least-32-chars" \
  -e JWT__JwtIssuer="mypersonalarchive" \
  -e JWT__Audience="mypersonalarchive" \
  aeinbu/mypersonalarchive:latest
```

- `-v mpa-data:/data` — a **named volume**, not a bind mount. `/data` holds the SQLite
  database and uploaded files, and needs to survive container restarts/recreation.
  Using a named volume (rather than a host path) means Docker initializes it from the
  image's `/data` on first use, so it inherits the correct ownership (see
  `Dockerfile`'s `chown 1654:1654 /data`) automatically — no manual `chown` step,
  even if the volume is deleted and recreated. A host bind mount does not get this
  treatment; if you use one instead, make sure the host directory is owned by uid/gid
  `1654` yourself.
- `JWT__JwtSecret` / `JWT__JwtIssuer` / `JWT__Audience` — the container starts without
  these, but JWT-based API authentication will fail until they're set. Any value
  works as long as it's consistent across restarts (changing the secret invalidates
  existing tokens).

## Run with Docker Compose (minimum)

Same setup as above, as a `compose.yaml` in the repo root:

```yaml
services:
  mypersonalarchive:
    build: .
    image: aeinbu/mypersonalarchive:latest
    ports:
      - "5054:5054"
    volumes:
      - mpa-data:/data
    environment:
      JWT__JwtSecret: "a-long-random-secret-at-least-32-chars"
      JWT__JwtIssuer: "mypersonalarchive"
      JWT__Audience: "mypersonalarchive"

volumes:
  mpa-data:
```

```sh
docker compose up -d --build
```

- `build: .` + `image: aeinbu/mypersonalarchive:latest` means `docker compose up --build` builds
  the image from the repo-root Dockerfile and tags it, so you don't need a separate
  `docker build` step. Drop `--build` on later runs to reuse the existing image.
- `mpa-data:` under the top-level `volumes:` key declares the same kind of named
  volume as the `docker run -v mpa-data:/data` example above — same self-healing
  ownership behavior applies.
- Any of the optional environment variables below can be added under `environment:`
  the same way.

## Optional environment variables

| Variable | Purpose |
|---|---|
| `ASPNETCORE_HTTP_PORTS` | Port Kestrel listens on inside the container. Defaults to `5054` (set in the Dockerfile). Change this *and* the `-p` mapping together. |
| `CERTIFICATE_PASSWORD` | Enables HTTPS. Requires a cert at `/data/https/server.pfx` (put it in the `/data` volume) and this password to unlock it. Without it, Kestrel serves plain HTTP. |
| `Oidc__Enabled` | Set to `true` to enable OpenID Connect login (e.g. Keycloak, another IdP). |
| `Oidc__Authority` | OIDC authority URL. |
| `Oidc__ClientId` | OIDC client id. |
| `Oidc__ClientSecret` | OIDC client secret. |
| `Oidc__CallbackPath` | OIDC sign-in callback path. |
| `Oidc__SignedOutCallbackPath` | OIDC sign-out callback path. |
| `Oidc__DefaultRedirectPath` | Where to send users after login. Defaults to `/`. |
| `Keycloak__Enabled` | Set to `true` to enable the Keycloak organization-admin API client. |
| `Keycloak__BaseUrl` | Keycloak admin API base URL. |
| `Keycloak__Authority` | Keycloak realm authority URL. |
| `Keycloak__Realm` | Keycloak realm name. |
| `Keycloak__ClientId` | Keycloak admin API client id. |
| `Keycloak__ClientSecret` | Keycloak admin API client secret. |
| `Keycloak__Admin__Username` | Keycloak admin username, if the admin API client needs it. |
| `Keycloak__Admin__Password` | Keycloak admin password. |

`Oidc__*` and `Keycloak__*` are only needed if you want SSO login instead of (or in
addition to) local JWT/cookie auth — both are gated behind their respective
`Enabled` flags and are safely omitted for a minimal single-instance deployment.

## Notes

- The image bundles the built frontend at `/app/webapp/` and serves it directly —
  no separate frontend container or reverse proxy is required for a basic setup.
- The database is SQLite, stored under `/data/Database` inside the volume — there's
  no separate database container to run.
