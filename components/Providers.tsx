"use client";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ConfigProvider } from "@/lib/config-context";
import { FeedbackProvider } from "./feedback";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <ConfigProvider>{children}</ConfigProvider>
      </AuthProvider>
    </FeedbackProvider>
  );
}
