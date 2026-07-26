import { definePageMetadata } from "../../packages/makit/src/metadata/index.ts";

export default definePageMetadata({
  id: "changelog",
  title: "変更履歴",
  description: "Makit のリリース履歴。",
  changelog: {
    repository: "mika-f/makit",
    limit: 20,
  },
});
