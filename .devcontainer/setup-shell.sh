#!/usr/bin/bash

# bash parameter completion for git
echo "source /usr/share/bash-completion/completions/git" >> ~/.bashrc

# bash parameter completion for the dotnet CLI
echo "source .devcontainer/bash/dotnet-autocompletion" >> ~/.bashrc

# set up node and npm with asdf
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf install nodejs 22.11.0
asdf global nodejs 22.11.0

# bash parameter completion for npm
echo "source <(npm completion)" >> ~/.bashrc

#
dotnet tool restore
