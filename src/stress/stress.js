import http from 'k6/http';
import { check } from 'k6';

// export const options = {
//   vus: 1000, // Maximum number of virtual users
//   iterations: 100000, // Total number of requests to simulate
// };

export const options = {
  vus: 20, // 50 virtual users simulate a growing site.
  duration: '30s', // Run for 1 minute to test sustained load.
  // iterations: 1000, // Around 50 requests/second (peak).
};

// Use the environment variable for the JWT token
const token = __ENV.JWT_TOKEN;

export default function () {
  // Target the API endpoint
  const url = 'https://jobsbolt.org/jobs';
  // const url = 'http://localhost:3000/api/job/pending-interested-slim';
  const params = {
    headers: {
      Authorization: `Bearer ${token}`, // Include the JWT
    },
    cookies: {
      jwt: token,
    },
  };

  const res = http.get(url, params);

  // Parse the JSON response
  // const response = JSON.parse(res.body);

  // Validate the response
  check(res, {
    'status is 200': (r) => r.status === 200, // Ensure the request is successful
  });
}
