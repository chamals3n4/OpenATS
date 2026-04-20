"use client";

import { SignedIn, SignedOut, UserProfile } from "@asgardeo/nextjs";

export default function AsgardeoUserDetailsPage() {
  return (
    <div>
      <SignedIn>
        <div>
          <UserProfile />
        </div>
      </SignedIn>

      <SignedOut>
        <p>
          You are not signed in. Please sign in to view your Asgardeo user
          details.
        </p>
      </SignedOut>
    </div>
  );
}
