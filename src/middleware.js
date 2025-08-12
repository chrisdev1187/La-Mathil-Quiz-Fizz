import { NextResponse } from "next/server";

export const config = {
  matcher: "/integrations/:path*",
};

export function middleware(request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-createxyz-project-id", "8d0f6af2-9be3-4e33-9601-5668c8fb74bd");
  requestHeaders.set("x-createxyz-project-group-id", "c7e80119-7451-4b90-abcb-b855aab20fd1");


  request.nextUrl.href = `https://www.create.xyz/${request.nextUrl.pathname}`;

  return NextResponse.rewrite(request.nextUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}