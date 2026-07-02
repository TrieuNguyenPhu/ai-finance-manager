export type HealthResponse = {
  status: "ok";
  service: "web";
};

export function getHealth(): HealthResponse {
  return { status: "ok", service: "web" };
}
