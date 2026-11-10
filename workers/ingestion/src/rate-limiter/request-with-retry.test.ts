import { describe, expect, it, vi } from "vitest";
import {
  RateLimiter,
  requestWithRetry,
} from "./request-with-retry.js";

describe("requestWithRetry", () => {
  it("returns immediately for a successful response", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const result = await requestWithRetry(
      request,
      async (response) => response.json(),
      {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        timeoutMs: 1_000,
      },
      new RateLimiter(0),
    );

    expect(result).toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("retries a 500 response", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("server error", { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    const result = await requestWithRetry(
      request,
      async (response) => response.json(),
      {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        timeoutMs: 1_000,
      },
      new RateLimiter(0),
    );

    expect(result).toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("retries a 429 response", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 429,
          headers: {
            "retry-after": "0",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    const result = await requestWithRetry(
      request,
      async (response) => response.json(),
      {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        timeoutMs: 1_000,
      },
      new RateLimiter(0),
    );

    expect(result).toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not retry a normal 4xx response", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response("bad request", { status: 400 }),
    );

    await expect(
      requestWithRetry(
        request,
        async (response) => response.json(),
        {
          maxAttempts: 3,
          baseDelayMs: 1,
          maxDelayMs: 5,
          timeoutMs: 1_000,
        },
        new RateLimiter(0),
      ),
    ).rejects.toThrow("400");

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fails after the maximum number of attempts", async () => {
    const request = vi.fn().mockImplementation(
      async () => new Response("server error", { status: 503 }),
    );

    await expect(
      requestWithRetry(
        request,
        async (response) => response.json(),
        {
          maxAttempts: 3,
          baseDelayMs: 1,
          maxDelayMs: 5,
          timeoutMs: 1_000,
        },
        new RateLimiter(0),
      ),
    ).rejects.toThrow("503");

    expect(request).toHaveBeenCalledTimes(3);
  });
});
