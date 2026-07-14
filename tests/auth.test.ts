import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth";

test("local auth normalizes emails and verifies scrypt password hashes", () => {
  assert.equal(normalizeEmail("  Student@Example.COM "), "student@example.com");
  const stored = hashPassword("correct horse battery staple");
  assert.equal(verifyPassword("correct horse battery staple", stored), true);
  assert.equal(verifyPassword("incorrect password", stored), false);
  assert.notEqual(stored, "correct horse battery staple");
});
