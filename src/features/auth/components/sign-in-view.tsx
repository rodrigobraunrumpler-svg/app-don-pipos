import { useUnlock } from "../hooks/use-unlock";
import { LockedOut } from "./locked-out";
import { SignInForm } from "./sign-in-form";

// Ingresar: el formulario, o el aviso de que se cerró la sesión de este celular
export function SignInView() {
  const { lockedOut, dismissLockedOut } = useUnlock();
  return lockedOut ? <LockedOut onSignInAgain={dismissLockedOut} /> : <SignInForm />;
}
