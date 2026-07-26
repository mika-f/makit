import { definePageMetadata } from "../../packages/makit/src/metadata/index.ts";

export default definePageMetadata({
  id: "changelog",
  title: "Changelog",
  description: "Release history of Makit.",
  changelog: {
    repository: "mika-f/makit",
    limit: 20,
  },
});
