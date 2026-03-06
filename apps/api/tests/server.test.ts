import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("API server metadata", () => {
  it("serves an OpenAPI definition for Nevermined agent registration", async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/openapi.json"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "Platon Memory API"
      },
      paths: {
        "/sessions": {
          post: {
            operationId: "dumpSession"
          }
        },
        "/retrieve": {
          post: {
            operationId: "retrieveContext"
          }
        }
      }
    });

    await app.close();
  });
});
