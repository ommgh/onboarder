import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { HttpError } from "./session";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(
  status: number,
  error: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function parseJson<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
  return schema.parse(body);
}

/** Wraps a route handler so thrown HttpErrors / ZodErrors become clean JSON responses. */
export function handler<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return fail(
      error.status,
      error.message,
      error.code ? { code: error.code } : undefined,
    );
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return fail(400, `${where}${first?.message ?? "Invalid input"}`, {
      issues: error.issues,
    });
  }
  console.error(error);
  return fail(500, "Something went wrong on our side. Please try again.");
}
