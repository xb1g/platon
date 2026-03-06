import {
  buildAdminSessionCookieHeader,
} from "../../../lib/admin/auth-cookie";
import {
  createAdminSessionToken,
  verifyAdminPassword,
} from "../../../lib/admin/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get("password");
  const url = new URL(request.url);

  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return Response.redirect(
      new URL("/admin/login?error=invalid", url),
      303,
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/admin", url).toString(),
      "Set-Cookie": buildAdminSessionCookieHeader(createAdminSessionToken()),
    },
  });
}
