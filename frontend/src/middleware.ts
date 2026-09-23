import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Chrome/DevTools probes this path for workspace discovery. Reply with a
// valid empty payload instead of 404 so the probe stops showing up as an
// error in logs and the preview.
export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname ===
    "/.well-known/appspecific/com.chrome.devtools.json"
  ) {
    return NextResponse.json({ applications: {} });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/.well-known/appspecific/com.chrome.devtools.json"],
};
