#noble = ubuntu, bookworm = debian
FROM mcr.microsoft.com/devcontainers/dotnet:9.0-noble
# FROM mcr.microsoft.com/devcontainers/dotnet:9.0-bookworm


COPY docker/build-libvips.sh /docker/build-libvips.sh
RUN chmod +x /docker/build-libvips.sh
RUN /docker/build-libvips.sh

# RUN chown -R vscode:vscode /tmp
RUN chmod -R 777 /tmp

RUN apt-get update && apt-get install -y sqlite3

WORKDIR /workspaces/MyPersonalArchive
RUN mkdir .devcontainer
RUN chown -R vscode:vscode .devcontainer
