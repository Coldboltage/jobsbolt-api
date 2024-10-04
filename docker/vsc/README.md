After you confirm everything works with this vsc, you should create a docker image for the API if you wish to test it in a docker setup.

docker build -f Dockerfile.test -t coldbolt/jobsbolt-api:docker-dev-latest.

This command will open up the test version of Dockerfile, which loads up npm run build:test, which bypasses Sentry which in this case is not needed.
