#!/bin/bash
# Compiles libvips from source for the production runtime image.
# Mirrors .devcontainer/docker/build-libvips.sh, adapted for non-interactive
# root execution inside a Docker build stage (no sudo, apt -y, skips the
# meson test suite to keep image builds fast).
# https://github.com/libvips/libvips/wiki/Build-for-Ubuntu
set -euo pipefail

# Note: unlike .devcontainer/docker/build-libvips.sh, this skips the
# ppa:lovell/cgif PPA - it only ever published builds for Ubuntu 20.04/21.10
# and 404s on noble. libcgif-dev is available directly from noble's universe
# repo, so the PPA isn't needed here.
apt-get update
apt-get install --yes libcgif-dev

apt-get install --yes \
    build-essential \
    ninja-build \
    bc \
    wget \
    meson

apt-get install --yes \
    libfftw3-dev \
    libopenexr-dev \
    libgsf-1-dev \
    libglib2.0-dev \
    liborc-dev \
    libopenslide-dev \
    libmatio-dev \
    libwebp-dev \
    libjpeg-turbo8-dev \
    libexpat1-dev \
    libexif-dev \
    libtiff5-dev \
    libcfitsio-dev \
    libpoppler-glib-dev \
    librsvg2-dev \
    libpango1.0-dev \
    libopenjp2-7-dev \
    liblcms2-dev \
    libimagequant-dev \
    libheif-dev \
    libde265-dev \
    libx265-dev \
    libheif-plugin-aomenc \
    libavif-dev

cd /tmp
wget https://github.com/libvips/libvips/releases/download/v8.13.3/vips-8.13.3.tar.gz
tar xf vips-8.13.3.tar.gz
cd vips-8.13.3
meson setup build --libdir=lib --buildtype=release -Dintrospection=false
cd build
meson compile
meson install
ldconfig
cd /
rm -rf /tmp/vips-8.13.3 /tmp/vips-8.13.3.tar.gz
