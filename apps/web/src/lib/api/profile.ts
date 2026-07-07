import { api } from "./client";
import type { Profile } from "./types";

export function getProfile() {
  return api<Profile>("/api/v1/profile");
}

export function updateProfile(body: {
  displayName?: string;
  preferredCurrency?: string;
  locale?: string;
}) {
  return api<Profile>("/api/v1/profile", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
