import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../config/normalize.js";
import { rootLayoutTemplate } from "./templates.js";

describe("rootLayoutTemplate", () => {
  it("adds production-only analytics to the generated layout", () => {
    const config = resolveConfig(
      {
        title: "Test",
        analytics: {
          googleAnalytics: { measurementId: "G-123" },
          scripts: [{ src: "https://analytics.example.com/script.js", strategy: "lazyOnload" }],
        },
      },
      { root: "/project", configPath: "/project/makit.config.ts" },
    );

    const template = rootLayoutTemplate(config);

    expect(template).toContain(
      'const analytics = {"googleAnalytics":{"measurementId":"G-123"},"scripts":[{"src":"https://analytics.example.com/script.js","strategy":"lazyOnload"}]};',
    );
    expect(template).toContain('process.env.NODE_ENV === "production"');
    expect(template).toContain("<AnalyticsScripts config={analytics} />");
  });
});
