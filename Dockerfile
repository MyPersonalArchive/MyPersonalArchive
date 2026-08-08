# syntax=docker/dockerfile:1

# ---- libvips (compiled from source, same version/config as .devcontainer) ----
FROM ubuntu:24.04 AS libvips-build
COPY docker/build-libvips.sh /tmp/build-libvips.sh
RUN chmod +x /tmp/build-libvips.sh && /tmp/build-libvips.sh

# ---- frontend ----
FROM node:24-slim AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- backend ----
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS backend-build
WORKDIR /src
COPY . .
RUN dotnet publish Backend.WebApi/Backend.WebApi.csproj -c Release -o /app/publish

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
WORKDIR /app

# Runtime shared libraries that libvips links against.
RUN apt-get update && apt-get install --yes --no-install-recommends \
        libfftw3-double3 \
        libopenexr-3-1-30 \
        libgsf-1-114 \
        libglib2.0-0t64 \
        liborc-0.4-0t64 \
        libopenslide0 \
        libmatio11 \
        libwebp7 \
        libwebpmux3 \
        libwebpdemux2 \
        libjpeg-turbo8 \
        libexpat1 \
        libexif12 \
        libtiff6 \
        libcfitsio10 \
        libpoppler-glib8 \
        librsvg2-2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libopenjp2-7 \
        liblcms2-2 \
        libimagequant0 \
        libheif1 \
        libde265-0 \
        libx265-199 \
        libavif16 \
        libcgif0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=libvips-build /usr/local/lib/ /usr/local/lib/
RUN ldconfig

COPY --from=backend-build /app/publish .
COPY --from=frontend-build /src/frontend/dist ./webapp

RUN mkdir -p /data && chown -R 1654:1654 /data
USER 1654:1654

# The base image sets ASPNETCORE_HTTP_PORTS=8080; override it so the app's own
# port fallback (see RegisterEndpoints in Program.cs) and EXPOSE below agree.
ENV ASPNETCORE_HTTP_PORTS=5054
EXPOSE 5054
ENTRYPOINT ["dotnet", "Backend.WebApi.dll"]
