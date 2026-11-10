"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { newVerification } from "@/actions/new-verification";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-sucess";
import { CardWrapper } from "./card-wrapper";

const SearchParamsHandler = ({
  setToken,
}: {
  setToken: (token: string | null) => void;
}) => {
  const searchParams = useSearchParams();
  setToken(searchParams.get("token"));
  return null;
};

export const NewVerificationForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const onSubmit = useCallback(() => {
    if (!token) {
      setError("Missing token");
      return;
    }
    newVerification(token)
      .then((data) => {
        setError(data.error || null);
        setSuccess(data.success || null);
      })
      .catch(() => {
        setError("Something went wrong");
      });
  }, [token]);

  useEffect(() => {
    if (token) {
      onSubmit();
    }
  }, [onSubmit, token]);

  return (
    <CardWrapper
      headerLabel="Verify your email"
      backButtonHref="/auth/login"
      backButtonLabel="Back to login"
    >
      <Suspense fallback={null}>
        <SearchParamsHandler setToken={setToken} />
      </Suspense>
      <div className="flex items-center w-full justify-center">
        {!success && !error && (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
        <FormSuccess message={success || undefined} />
        <FormError message={error || undefined} />
      </div>
    </CardWrapper>
  );
};
