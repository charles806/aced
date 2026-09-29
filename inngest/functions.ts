import { inngest } from "./client";
import { processNoteExtraction } from "../app/lib/extraction/process-note";

export const processNoteExtractionFunction = inngest.createFunction(
  {
    id: "process-note-extraction",
    triggers: {
      event: "note/extraction.requested",
    },
  },
  async ({ event, step }) => {
    const result = await step.run("extract-note", async () => {
      return processNoteExtraction(event.data.noteId);
    });

    return result;
  }
);