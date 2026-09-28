import type { ComponentChildren } from "preact";
import { signOut, useAuth } from "@spacefast/zero/client";
// @ts-ignore
import { forgetLinearKey } from "./vanilla/linear-browser.js";

// The game draws its own chrome, so the layout only adds a small sign-out control.
export function Layout({ children }: { children: ComponentChildren }) {
  const auth = useAuth();
  return (
    <>
      {children}
      {!auth.isLoading && !auth.isGuest ? (
        <button
          type="button"
          class="fixed bottom-2 left-2 z-40 rounded px-2 py-1 text-xs"
          style={{ background: "rgba(38,50,44,0.85)", color: "#c9c2a6", border: "1px solid #4d5f53" }}
          onClick={() => { forgetLinearKey(); void signOut(); }}
        >
          Sign out {auth.displayName}
        </button>
      ) : null}
    </>
  );
}
