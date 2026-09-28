"use client";

import { useEffect } from "preact/hooks";
import { SignInWithGoogle, useAuth, useMutation } from "@spacefast/zero/client";
import { Spinner } from "@spacefast/zero/kit";
// @ts-ignore -- the original game UI, plain JS. start.js must load before app.js.
import "../client/vanilla/start.js";
// @ts-ignore
import "../client/vanilla/app.js";
// @ts-ignore
import { attachBridge } from "../client/vanilla/bridge.js";

export default function SidequestPage() {
  const auth = useAuth();
  const api = useMutation<[path: string, body: unknown, offset: number], unknown>("api");
  const signedIn = !auth.isLoading && !auth.isGuest;

  const aiProbe = useMutation<[], unknown>("aiProbe"); // TEMPORARY probe hook
  useEffect(() => {
    if (signedIn) (window as any).__sqAiProbe = aiProbe; // TEMPORARY
    if (signedIn) attachBridge(api);
  }, [signedIn]);

  if (signedIn) return null;
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,28,24,0.92)" }}>
      <div class="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg p-6 text-center" style={{ background: "#26322c", color: "#eee7cc", border: "2px solid #4d5f53" }}>
        <h1 class="text-2xl font-bold">Sidequest</h1>
        <p class="text-sm" style={{ color: "#c9c2a6" }}>Small steps. Great adventures. Sign in to keep your quests, loot, and companions in your own save.</p>
        {auth.isLoading ? <Spinner size="sm" /> : <SignInWithGoogle class="rounded px-4 py-2 text-sm font-semibold" style={{ background: "#e7a664", color: "#1d2521" }} />}
      </div>
    </div>
  );
}
