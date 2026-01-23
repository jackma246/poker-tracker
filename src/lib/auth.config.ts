import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnSessions = nextUrl.pathname.startsWith("/sessions");
      const isProtected = isOnDashboard || isOnSessions;

      if (isProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      } else if (isLoggedIn) {
        // Redirect logged-in users from login/register to dashboard
        if (
          nextUrl.pathname === "/login" ||
          nextUrl.pathname === "/register"
        ) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }
      return true;
    },
  },
  providers: [], // configured in auth.ts
} satisfies NextAuthConfig;
