To run the stress test, use the following command.

export $(cat .env | xargs) && k6 run stress.js
