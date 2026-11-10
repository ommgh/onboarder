import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { BackButton } from "./back-button";
import { Header } from "./header";

export const ErrorCard = () => {
  return (
    <Card>
      <CardHeader>
        <Header label="Oops! Something went wrong" />
      </CardHeader>
      <CardFooter>
        <BackButton label="Back to login" href="/auth/login" />
      </CardFooter>
    </Card>
  );
};
