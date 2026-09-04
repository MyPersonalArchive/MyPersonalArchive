#!/usr/bin/bash

# bash parameter completion for git
echo "source /usr/share/bash-completion/completions/git" >> ~/.bashrc

# bash parameter completion for the dotnet CLI
echo "source .devcontainer/bash/dotnet-autocompletion" >> ~/.bashrc

# bash parameter completion for npm
# echo "source <(npm completion)" >> ~/.bashrc

# bash parameter completion for pnpm
echo "source <(pnpm completion bash)" >> ~/.bashrc

# bash parameter completion for docker
echo "source <(docker completion bash)" >> ~/.bashrc

#
dotnet tool restore
