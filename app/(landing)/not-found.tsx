import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="font-serif text-8xl text-primary">404</div>
      <h1 className="mt-4 text-2xl font-semibold">This shelf is empty</h1>
      <p className="mt-2 text-muted-foreground">
        The page you're looking for isn't here.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
