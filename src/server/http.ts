import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export function ok<T>(data: T, init?: ResponseInit) {
  logger.info("api.response_json", { status: init?.status ?? 200, body: { ok: true, data } });
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  logger.info("api.response_json", { status, body: { ok: false, error: { message, details } } });
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    logger.warn("api.validation_error", { details: error.flatten() });
    return fail("Invalid request data.", 422, error.flatten());
  }
  if (error instanceof ApiError) {
    logger.warn("api.error", { message: error.message, status: error.status, details: error.details });
    return fail(error.message, error.status, error.details);
  }
  if (error instanceof Error) {
    logger.error("api.unhandled_error", { name: error.name, message: error.message, stack: error.stack });
    return fail(error.message, 400);
  }
  logger.error("api.unknown_error", { error });
  return fail("Unexpected server error.", 500);
}
