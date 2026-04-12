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
                By signing in, you agree to WSO2 Asgardeo&apos;s{" "}
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
