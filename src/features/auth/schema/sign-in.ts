import { z } from "zod";

// Lo que responden las funciones del servidor del acceso (docs/spec/auth.md §3)
const wrongPin = z.object({ status: z.literal("wrong_pin"), attemptsLeft: z.number().int().min(1).max(5) });
const locked = z.object({
  status: z.literal("locked"),
  retryAt: z
    .string()
    .transform((text) => new Date(text))
    .refine((date) => !Number.isNaN(date.getTime())),
});
const hardLocked = z.object({ status: z.literal("hard_locked") });

export const signInResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    session: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1), expiresAt: z.number() }),
  }),
  wrongPin,
  locked,
  hardLocked,
]);

export const changePinResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok") }),
  wrongPin,
  locked,
  hardLocked,
  z.object({ status: z.literal("same_pin") }),
  z.object({ status: z.literal("obvious_pin") }),
]);

export type SignInResult = { status: "ok" } | Exclude<z.infer<typeof signInResponseSchema>, { status: "ok" }>;
export type ChangePinResult = z.infer<typeof changePinResponseSchema>;
