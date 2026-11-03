import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { localStorage, LOGO_NAME } from "../../src/shared/services/local-storage";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "openats-files-"));
  vi.stubEnv("STORAGE_DIR", dir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("local storage", () => {
  it("keeps a CV in the private folder, reads it back and deletes it", async () => {
    const key = `resumes/${ID}.pdf`;
    await localStorage.putResume(key, Buffer.from("%PDF-1.7 test"));

    expect((await localStorage.getResume(key))?.toString()).toBe("%PDF-1.7 test");
    expect((await stat(path.join(dir, "private", key))).mode & 0o777).toBe(0o600);

    await localStorage.deleteResume(key);
    expect(await localStorage.getResume(key)).toBeNull();
    // Deleting again is not an error, as with a bucket.
    await expect(localStorage.deleteResume(key)).resolves.toBeUndefined();
  });

  it("keeps a logo in the public folder", async () => {
    await localStorage.putLogo(`${ID}.png`, Buffer.from("png"));
    expect((await localStorage.getLogo(`${ID}.png`))?.toString()).toBe("png");
    expect(await readdir(path.join(dir, "public", "logos"))).toEqual([`${ID}.png`]);
  });

  it("leaves no temporary file behind", async () => {
    await localStorage.putResume(`resumes/${ID}.pdf`, Buffer.from("x"));
    expect(await readdir(path.join(dir, "private", "resumes"))).toEqual([`${ID}.pdf`]);
  });

  it("never builds a path from a key that is not one of ours", async () => {
    for (const key of ["resumes/../../etc/passwd", "../secret.pdf", `resumes/${ID}.pdf/..`, "/etc/passwd", ""]) {
      expect(await localStorage.getResume(key)).toBeNull();
      await expect(localStorage.putResume(key, Buffer.from("x"))).rejects.toThrow("Invalid CV key");
      await expect(localStorage.deleteResume(key)).rejects.toThrow("Invalid CV key");
    }
    for (const name of ["../x.png", `${ID}.html`, `${ID}.png/../../a`, "logo.png"]) {
      expect(LOGO_NAME.test(name)).toBe(false);
      expect(await localStorage.getLogo(name)).toBeNull();
    }
  });

  it("does not read a CV as a logo, or a logo as a CV", async () => {
    await localStorage.putResume(`resumes/${ID}.pdf`, Buffer.from("cv"));
    expect(await localStorage.getLogo(`${ID}.pdf`)).toBeNull();
  });
});
