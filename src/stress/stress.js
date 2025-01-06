import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100, // Number of virtual users
  iterations: 1000, // Total number of requests to make
};

// Use the environment variable for the JWT token
const token = __ENV.JWT_TOKEN;

export default function () {
  // Target the API endpoint
  const url = 'https://jobsbolt.org/api/job/pending-interested';
  const params = {
    headers: {
      Authorization: `Bearer ${token}`, // Include the JWT
    },
  };

  const res = http.get(url, params);

  // Parse the JSON response
  const response = JSON.parse(res.body);

  // Validate the response
  check(res, {
    'status is 200': (r) => r.status === 200, // Ensure the request is successful
  });
}
