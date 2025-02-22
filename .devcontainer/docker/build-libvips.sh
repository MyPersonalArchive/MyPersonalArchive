# https://github.com/libvips/libvips/wiki/Build-for-Ubuntu

sudo add-apt-repository ppa:lovell/cgif
sudo apt-get update
sudo apt-get install libcgif-dev

sudo apt install --yes \
    build-essential \
    ninja-build \
    bc \
    wget \
    meson

sudo apt install --yes \
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
    libimagequant-dev

wget https://github.com/libvips/libvips/releases/download/v8.13.3/vips-8.13.3.tar.gz
tar xf vips-8.13.3.tar.gz
cd vips-8.13.3
meson setup build --libdir=lib --buildtype=release -Dintrospection=false
cd build
meson compile
meson test
sudo meson install

echo LD_LIBRARY_PATH=/usr/local/lib/aarch64-linux-gnu/:$LD_LIBRARY_PATH >> /etc/environment
