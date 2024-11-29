Before using this, please check if you have updated with the latest test build. This will be the absolute most newest image for this feature branch.

docker build -f Dockerfile.test -t coldbolt/jobsbolt-api:docker-dev-latest.

This command will open up the test version of Dockerfile, which loads up npm run build:test, which bypasses Sentry which in this case is not needed.
