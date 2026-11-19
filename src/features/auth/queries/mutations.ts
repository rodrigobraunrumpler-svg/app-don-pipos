import { mutationOptions } from "@tanstack/react-query";

import { changePin, signInWithPin } from "../api/pin";
import { signOutHere } from "../api/session";

export const signInMutation = mutationOptions({
  mutationFn: ({ phone, pin }: { phone: string; pin: string }) => signInWithPin(phone, pin),
});

export const changePinMutation = mutationOptions({
  mutationFn: ({ current, next }: { current: string; next: string }) => changePin(current, next),
});

export const signOutMutation = mutationOptions({ mutationFn: signOutHere });
