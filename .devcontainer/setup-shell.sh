#!/usr/bin/bash

# bash parameter completion for git
echo "source /usr/share/bash-completion/completions/git" >> ~/.bashrc

# bash parameter completion for the dotnet CLI
echo "source .devcontainer/bash/dotnet-autocompletion" >> ~/.bashrc

# bash parameter completion for npm
echo "source <(npm completion)" >> ~/.bashrc

#
dotnet tool restore
