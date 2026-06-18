"use client";

import Image from "next/image";
import { SignInButton, SignIn } from "@asgardeo/nextjs";

export default function LoginPage() {
  return (
    <>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="bg-muted relative hidden lg:block">
          <Image
            src="/login.svg"
            alt="Login visual"
            fill
            className="object-cover "
            priority
          />
        </div>
        <div className="flex flex-col gap-4 p-6 md:p-8 bg-white">
          <div className="flex flex-1 items-center justify-center pb-16">
            <div className="w-full max-w-sm flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "#b0bac5",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  Powered by
                </p>
                <Image
                  src="/asgardeo-by-wso2.svg"
                  alt="Asgardeo by WSO2"
                  width={150}
                  height={31}
                  priority
                  style={{ display: "block" }}
                />
              </div>

              {/* <div style={{ textAlign: "center" }}>
                <h1
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#0f172a",
                    letterSpacing: "-0.3px",
                    lineHeight: 1.3,
                  }}
                >
                  Sign in to OpenATS
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#8896a5",
                    lineHeight: 1.6,
                  }}
                >
                  Securely authenticated via your Asgardeo organization.
                </p>
              </div> */}

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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#78350f" }}>Email</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1c1917", fontFamily: "monospace" }}>
                        demo@openats.dev
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#78350f" }}>Password</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1c1917", fontFamily: "monospace" }}>
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

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#b0bac5",
                  textAlign: "center",
                  lineHeight: 1.7,
                }}
              >
                By signing in, you agree to Asgardeo&apos;s{" "}
                <a
                  href="https://wso2.com/terms-of-use/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#FF7300", textDecoration: "none" }}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="https://wso2.com/privacy-policy/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#FF7300", textDecoration: "none" }}
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
