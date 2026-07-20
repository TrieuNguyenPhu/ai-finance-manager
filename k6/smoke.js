import http from "k6/http";
import { check } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export const options = {
  vus: 1,
  iterations: 5,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/health`);
  check(response, {
    "gateway health is 200": (res) => res.status === 200,
    "gateway health identifies service": (res) =>
      res.json("service") === "gateway-service",
  });
}
