import { defineNavigation } from "@natsuneko-laboratory/makit/metadata";

export default defineNavigation({
  items: [
    { type: "page", page: "index", title: "Welcome" },
    {
      type: "section",
      id: "getting-started",
      title: "Getting Started",
      items: [{ type: "page", page: "getting-started" }],
    },
    {
      type: "section",
      id: "guides",
      title: "Guides",
      collapsible: true,
      collapsed: false,
      items: [{ type: "page", page: "guides.configuration" }],
    },
  ],
});
