import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  auth: {
    getSessionUser: vi.fn(),
  },
}));

import { cookies } from "next/headers";
import { auth } from "@/app/lib/auth";
import { getAdminUser } from "../auth";

const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockGetSessionUser = auth.getSessionUser as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  process.env.ADMIN_USER_IDS = "user-1,user-2";
});

describe("admin authorization", () => {
  it("allows admin by user ID", async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ value: "token" }),
    });
    mockGetSessionUser.mockResolvedValue({ id: "user-1", email: "admin@example.com" });
    const user = await getAdminUser();
    expect(user?.id).toBe("user-1");
  });

  it("rejects ordinary user", async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ value: "token" }),
    });
    mockGetSessionUser.mockResolvedValue({ id: "user-99", email: "user@example.com" });
    const user = await getAdminUser();
    expect(user).toBeNull();
  });

  it("rejects unauthenticated", async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    });
    const user = await getAdminUser();
    expect(user).toBeNull();
  });

  it("fails closed when allowlist empty", async () => {
    process.env.ADMIN_USER_IDS = "";
    mockCookies.mockResolvedValue({
      get: () => ({ value: "token" }),
    });
    mockGetSessionUser.mockResolvedValue({ id: "user-1", email: "admin@example.com" });
    const user = await getAdminUser();
    expect(user).toBeNull();
  });

  it("does not authorize by email only", async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ value: "token" }),
    });
    mockGetSessionUser.mockResolvedValue({ id: "user-99", email: "user-1" });
    const user = await getAdminUser();
    expect(user).toBeNull();
  });
});
