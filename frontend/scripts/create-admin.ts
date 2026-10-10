/**
 * Creates the first super admin, or promotes an existing user to one.
 *
 *   pnpm --filter ./frontend exec tsx scripts/create-admin.ts \
 *     --email ada@example.com --first-name Ada --last-name Lovelace
 *
 * Public sign-up is disabled, so this is how a fresh install gets its first
 * account. It is also the recovery path for a locked-out install, and how an
 * install upgrading from an external identity provider gives an existing
 * user a password.
 *
 * Anything not passed as a flag is asked for. The password is read without
 * echo and is never printed or logged.
 */
import path from "node:path";
import readline from "node:readline";
import { Writable } from "node:stream";
import { parseArgs } from "node:util";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE,
} from "../lib/auth-errors";
import { checkEnv } from "../lib/env";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function ask(question: string, opts: { hidden?: boolean } = {}) {
  if (!process.stdin.isTTY) {
    fail(
      "A required value is missing and there is no terminal to ask for it. Pass --email, --first-name, --last-name and --password.",
    );
  }

  return new Promise<string>((resolve) => {
    let muted = false;
    const output = new Writable({
      write(chunk, _encoding, callback) {
        if (!muted) process.stdout.write(chunk);
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output,
      terminal: true,
    });

    rl.question(question, (answer) => {
      rl.close();
      if (opts.hidden) process.stdout.write("\n");
      resolve(answer);
    });

    // Muted after the question is written, so typed characters are not echoed.
    muted = Boolean(opts.hidden);
  });
}

function passwordProblem(password: string): string | null {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return PASSWORD_RULE;
  }
  return null;
}

async function readInputs() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      "first-name": { type: "string" },
      "last-name": { type: "string" },
      password: { type: "string" },
    },
  });

  const email = (values.email ?? (await ask("Admin email: ")))
    .trim()
    .toLowerCase();
  if (!EMAIL_PATTERN.test(email)) fail(`"${email}" is not a valid email.`);

  const firstName = (values["first-name"] ?? (await ask("First name: "))).trim();
  const lastName = (values["last-name"] ?? (await ask("Last name: "))).trim();
  if (!firstName || !lastName) fail("First name and last name are required.");

  let password = values.password;
  if (password === undefined) {
    password = await ask(`Password (${PASSWORD_RULE.toLowerCase()}): `, {
      hidden: true,
    });
    const confirmation = await ask("Confirm password: ", { hidden: true });
    if (password !== confirmation) fail("The passwords do not match.");
  }

  const problem = passwordProblem(password);
  if (problem) fail(`Password not accepted. ${problem}`);

  return { email, firstName, lastName, password };
}

async function main() {
  // Outside Next.js nothing loads frontend/.env for us. Variables already in
  // the environment win, as they do in Next.js.
  try {
    process.loadEnvFile(path.join(__dirname, "../.env"));
  } catch {
    // No .env file: rely on the environment as it is.
  }

  const issues = checkEnv(process.env);
  if (issues.length > 0) {
    fail(
      `Missing or invalid environment variables:\n${issues
        .map((issue) => `  - ${issue}`)
        .join("\n")}\n\nCheck frontend/.env against frontend/.env.example.`,
    );
  }

  const { email, firstName, lastName, password } = await readInputs();

  // Imported only now: these read the environment when they load.
  const { betterAuth } = await import("better-auth");
  const { authOptions } = await import("../lib/auth-options");
  const { pool } = await import("../lib/db");

  // Its own instance, without nextCookies(), which needs a Next.js request.
  const auth = betterAuth(authOptions);

  try {
    // Matched without regard to case: rows from before built-in sign-in may
    // hold a mixed-case email, which Better Auth's own lookup would miss.
    const existing = await pool.query<{ id: number }>(
      "select id from users where lower(email) = $1",
      [email],
    );

    if (existing.rows.length > 1) {
      fail(
        `More than one user matches ${email} when case is ignored. Resolve the duplicate rows first.`,
      );
    }

    if (existing.rows.length === 0) {
      const { user } = await auth.api.createUser({
        body: {
          email,
          password,
          name: `${firstName} ${lastName}`,
          role: "super_admin",
          data: { firstName, lastName },
        },
      });

      console.log(`\nCreated super admin ${email} (user id ${user.id}).`);
      return;
    }

    // Existing user: the row and its id stay, so everything linked to it
    // (jobs, hiring teams, notes, history) is untouched.
    const userId = String(existing.rows[0].id);
    const ctx = await auth.$context;

    await ctx.internalAdapter.updateUser(userId, {
      // Stored in lower case so that sign-in, which lower-cases, finds it.
      email,
      role: "super_admin",
      banned: false,
      banReason: null,
      banExpires: null,
      isActive: true,
    });

    const hash = await ctx.password.hash(password);
    if (await ctx.internalAdapter.findCredentialAccount(userId)) {
      await ctx.internalAdapter.updatePassword(userId, hash);
    } else {
      // Every user from before built-in sign-in: they never had a password here.
      await ctx.internalAdapter.linkAccount({
        userId,
        providerId: "credential",
        accountId: userId,
        password: hash,
      });
    }

    // This is the lockout recovery path, so whoever was signed in as this
    // user before the password changed is signed out.
    await ctx.internalAdapter.deleteUserSessions(userId);

    console.log(
      `\nUpdated ${email} (user id ${userId}): role set to super_admin, account active, password set.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  // Only the message: an error object could carry the request body.
  console.error(
    `\nCould not create the admin: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
