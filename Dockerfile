FROM node:20-alpine
RUN apk add --no-cache bash
# Install PostgreSQL client (psql)
RUN apk add --no-cache postgresql-client

# Set the working directory
WORKDIR /jobsbolt-alpine

# Copy all setup
COPY package.json package-lock.json /jobsbolt-alpine/

# Install
RUN npm install

# Copy everything
COPY . /jobsbolt-alpine/

# Build
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
RUN npm run build

# Clean up
RUN rm -rf node_modules .env
RUN npm install --production

# Install nest
RUN npm i @nestjs/cli

# Start 
CMD ["npm", "run", "start"]
