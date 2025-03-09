import Contents from "./config/content";
import { notFound } from "next/navigation";
import { getAccessToken } from "@/lib/cookies";
import { NextRequest, NextResponse } from "next/server";

// private route list
const PR_ROUTES = ["/home"];
// private route without redirection
const PR_ROUTES_WO_RED: string[] = [];

// language excluded paths
const LANG_EXC_ROUTES = ["/design", "/not-found", "/api", "/examples"];

// get current language from pathname
const getLang = (pathname: string) => {
  if (
    pathname.split("/").length > 1 &&
    Contents.languages.includes(
      pathname.split("/")[1] as (typeof Contents.languages)[number]
    )
  ) {
    return pathname.split("/")[1];
  }

  return Contents.languages[0];
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // get language
  const lang = getLang(pathname);

  // next redirect header config
  const nextRedirect = (path: string) => {
    const response = NextResponse.redirect(
      new URL(`/${lang}` + path, request.url)
    );
    response.headers.set("x-pathname", pathname);
    return response;
  };

  const response = NextResponse.next({});
  response.headers.set("x-pathname", pathname);

  // get token from cookie
  const token = getAccessToken();

  // redirect user based on token
  if (pathname === "/") {
    return token ? nextRedirect("/home") : nextRedirect("/login");
  }

  // if path included in paths where language is not required
  if (LANG_EXC_ROUTES.includes(`/${pathname.split("/")[1]}`)) return response;

  // redirect to not found if path does not conatain valid language
  if (
    !Contents.languages.includes(
      pathname.split("/")[1] as (typeof Contents.languages)[number]
    )
  )
    notFound();

  // actual path without language
  const actualPath =
    "/" +
    pathname
      .split("/")
      .slice(2)
      .reduce((a, b) => a + "/" + b);

  // redirect to home page if token is present
  if (token && actualPath === "/login") {
    return nextRedirect("/home");
  }

  // check if the token present for private routes
  if (
    PR_ROUTES.concat(PR_ROUTES_WO_RED).some((route) =>
      actualPath.startsWith(route)
    ) &&
    !token
  ) {
    const loginUrl = new URL(`/${lang}` + "/login", request.url);

    // append the url needed to redirect on login url as query param if the route is needed to redirect
    if (PR_ROUTES_WO_RED.every((route) => !actualPath.startsWith(route))) {
      loginUrl.searchParams.set("redirect", actualPath);
    }

    const response = NextResponse.redirect(loginUrl);
    response.headers.set("x-pathname", pathname);
    return response;
  }

  return response;
}

// apply middleware except some routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image).*)"],
};
