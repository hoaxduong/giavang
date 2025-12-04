import { EditorOptions } from "@tiptap/react";
import { extensions } from "./extensions";

export const editorConfig: Partial<EditorOptions> = {
  extensions,
  editorProps: {
    attributes: {
      class:
        "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] max-w-none p-4",
    },
  },
};
