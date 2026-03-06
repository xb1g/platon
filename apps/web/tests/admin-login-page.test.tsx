import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "../app/admin/login/page";
import { POST } from "../app/admin/auth/route";
import { ADMIN_SESSION_COOKIE_NAME } from "../lib/admin/auth-cookie";

describe("admin login page", () => {
  it("renders a password form", async () => {
    const markup = renderToStaticMarkup(
      await LoginPage({ searchParams: Promise.resolve({}) }),
    );

    expect(markup).toContain('action="/admin/auth"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('name="password"');
  });

  it("redirects back with an error on invalid password", async () => {
    const form = new FormData();
    form.set("password", "wrong");

    const response = await POST(
      new Request("http://localhost:3000/admin/auth", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?error=invalid",
    );
  });

  it("sets the admin cookie and redirects on valid password", async () => {
    const form = new FormData();
    form.set("password", "bigf");

    const response = await POST(
      new Request("http://localhost:3000/admin/auth", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
    expect(response.headers.get("set-cookie")).toContain(ADMIN_SESSION_COOKIE_NAME);
  });
});
