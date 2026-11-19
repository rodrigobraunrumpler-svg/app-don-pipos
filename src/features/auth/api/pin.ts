import { AppError, toAppError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

import {
  changePinResponseSchema,
  signInResponseSchema,
  type ChangePinResult,
  type SignInResult,
} from "../schema/sign-in";

async function invoke(name: string, body: Record<string, string>): Promise<unknown> {
  const { data, error } = await supabase().functions.invoke(name, { body });
  if (error) throw toAppError(error);
  return data;
}

// Ingresa con el número y el PIN. Si el servidor los acepta, guarda la sesión que abrió
export async function signInWithPin(phone: string, pin: string): Promise<SignInResult> {
  const parsed = signInResponseSchema.safeParse(await invoke("sign-in-with-pin", { phone, pin }));
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  if (parsed.data.status !== "ok") return parsed.data;

  const { accessToken, refreshToken } = parsed.data.session;
  const { error } = await supabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw toAppError(error);
  return { status: "ok" };
}

export async function changePin(current: string, next: string): Promise<ChangePinResult> {
  const parsed = changePinResponseSchema.safeParse(await invoke("change-pin", { current, next }));
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}
