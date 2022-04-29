#Stage 1 - Install dependencies and build the app
FROM google/dart

# Install flutter dependencies
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y curl git wget unzip libgconf-2-4 gdb libstdc++6 libglu1-mesa fonts-droid-fallback lib32stdc++6 python3
RUN apt-get clean

# Clone the flutter repo
RUN git clone https://github.com/flutter/flutter.git /usr/local/flutter

# Set flutter path
# RUN /usr/local/flutter/bin/flutter doctor -v
ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Run flutter doctor
RUN flutter doctor -v
# Enable flutter web
RUN flutter channel master
RUN flutter upgrade
RUN flutter config --enable-web

# Copy files to container and build
RUN mkdir /app/
COPY . /app/
WORKDIR /app/
RUN flutter pub get
RUN flutter build web

# Document the exposed port
EXPOSE 8080

# Set the server startup script as executable
RUN ["chmod", "+x", "/app/server/server.sh"]

# Start the web server
ENTRYPOINT [ "/app/server/server.sh" ]