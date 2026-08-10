import { describe, expect, it } from "vitest";
import { getRoleDisplayName } from "@dan1/shared";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { expandPermissions, hasPermission } from "../src/lib/permissions.js";
import { hashToken } from "../src/services/auth.service.js";

describe("password hashing (scrypt, matches packages/database/prisma/seed.ts format)", () => {
  it("verifies a correct password against its hash", () => {
    const stored = hashPassword("91001");
    expect(verifyPassword("91001", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashPassword("91001");
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("produces a `salt:hash` shaped string", () => {
    const stored = hashPassword("99999");
    const parts = stored.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(parts[1]).toMatch(/^[0-9a-f]{128}$/);
  });

  it("produces different salts (and thus different hashes) for the same password", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(verifyPassword("same-password", a)).toBe(true);
    expect(verifyPassword("same-password", b)).toBe(true);
  });

  it("returns false for malformed stored hashes instead of throwing", () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});

describe("session token hashing", () => {
  it("is deterministic and produces a 64-char hex sha256 digest", () => {
    const token = "abc123";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});

describe("role display names", () => {
  it("returns Japanese labels for known role codes", () => {
    expect(getRoleDisplayName("system_admin")).toBe("システム管理者");
    expect(getRoleDisplayName("internal_staff")).toBe("社内一般");
    expect(getRoleDisplayName("facility_staff")).toBe("施設一般");
  });

  it("falls back to the stored name or code for unknown roles", () => {
    expect(getRoleDisplayName("custom_role", "カスタム")).toBe("カスタム");
    expect(getRoleDisplayName("custom_role")).toBe("custom_role");
  });
});

describe("permission resolution", () => {
  it("grants every permission to system_admin via the wildcard", () => {
    const permissions = expandPermissions("system_admin", []);
    expect(hasPermission(permissions, "admin.data_fix")).toBe(true);
    expect(hasPermission(permissions, "anything.at.all")).toBe(true);
  });

  it("grants internal_staff order permissions but not admin.role.update", () => {
    const permissions = expandPermissions("internal_staff", []);
    expect(hasPermission(permissions, "order.read")).toBe(true);
    expect(hasPermission(permissions, "order.create")).toBe(true);
    expect(hasPermission(permissions, "admin.role.update")).toBe(false);
  });

  it("scopes facility_staff to its own order permissions only", () => {
    const permissions = expandPermissions("facility_staff", []);
    expect(hasPermission(permissions, "order.read")).toBe(true);
    expect(hasPermission(permissions, "master.customer.update")).toBe(false);
    expect(hasPermission(permissions, "procurement.schedule.update")).toBe(false);
  });

  it("uses DB-configured role_permissions when populated", () => {
    const permissions = expandPermissions("facility_staff", ["custom.extra_permission"]);
    expect(hasPermission(permissions, "order.read")).toBe(false);
    expect(hasPermission(permissions, "custom.extra_permission")).toBe(true);
  });

  it("returns an empty-ish permission set for an unknown role code", () => {
    const permissions = expandPermissions("unknown_role", []);
    expect(hasPermission(permissions, "order.read")).toBe(false);
  });
});
