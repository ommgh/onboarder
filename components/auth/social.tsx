"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { DEFAULT_AUTH_REDIRECT } from "@/routes";

export const Social = () => {
  const [pending, setPending] = useState(false);
  return (
    <Button
      size="lg"
      variant="outline"
      className="h-11 w-full"
      disabled={pending}
      onClick={() => {
        setPending(true);
        signIn("google", { callbackUrl: DEFAULT_AUTH_REDIRECT }).catch(() =>
          setPending(false),
        );
      }}
    >
      <FcGoogle className="size-5" /> Continue with Google
    </Button>
  );
};
