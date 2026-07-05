"use client";

import { SignInButton, SignIn } from "@asgardeo/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6 md:p-8 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {process.env.NODE_ENV === "production" && (
          <div
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid #fde68a",
              padding: "14px 16px",
              background: "#fffbeb",
            }}
          >
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: 11,
                fontWeight: 700,
                color: "#92400e",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Demo credentials
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 500, color: "#78350f" }}
                >
                  Email
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1c1917",
                    fontFamily: "monospace",
                  }}
                >
                  demo@openats.dev
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 500, color: "#78350f" }}
                >
                  Password
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1c1917",
                    fontFamily: "monospace",
                  }}
                >
                  Demo@123#
                </span>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          :global(.custom-signin h2) {
            font-size: 0;
          }
          :global(.custom-signin h2::after) {
            content: "Sign in to OpenATS";
            font-size: 1.375rem;
          }
        `}</style>
        <SignIn
          size="small"
          variant="outlined"
          className="custom-signin"
          onSuccess={() => {}}
          onError={() => {}}
        />
      </div>
    </div>
  );
}
