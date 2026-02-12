import { vi } from "vitest";

const defaultSession = {
  user: {
    id: "test-user-id",
    username: "testuser",
    role: "ADMIN",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const auth = vi.fn().mockResolvedValue(defaultSession);

/** Call this in a test to simulate an unauthenticated request */
export function mockUnauthenticated() {
  auth.mockResolvedValueOnce(null);
}
