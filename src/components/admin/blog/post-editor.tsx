"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Table2,
  Trash,
} from "lucide-react";
import { extensions } from "@/lib/tiptap/extensions";
import { useState, useCallback, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PostEditorProps {
  content: any;
  onChange: (content: any) => void;
}

export function PostEditor({ content, onChange }: PostEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-full w-full !max-w-none p-4",
      },
    },
  });

  // Sync content updates from parent (e.g. async load)
  useEffect(() => {
    if (editor && content) {
      // Simple check to avoid loops/redraws if content is "same"
      // But Tiptap JSON comparison is tricky.
      // For "load from server" scenario, usually editor is empty or content is totally different.
      // If we just setContent, it resets cursor.
      // However, here the main issue is INITIAL load.
      // Or if the parent completely replaces content (Regenerate).

      // We can check if editor is empty, or just blindly set it for now?
      // Better: check if content changed.

      // Since this is an admin editor, forcing update on prop change is acceptable
      // if we assume the parent only updates "content" when it really changes (like load).
      // But onChange calls setContent in parent -> loop?
      // No, onChange passes "JSON from editor" to parent.
      // Parent updates state.
      // Parent passes state back to PostEditor.
      // If we strictly sync, we create a loop and cursor jump.

      // FIX: Only update if editor is empty OR if we implement deep comparison.
      // For the "Post didn't load" issue, checking isEmpty is enough for initial load.

      if (editor.isEmpty) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "content");

        const res = await fetch("/api/admin/blog/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Upload failed");
        }

        const { url } = await res.json();
        editor?.chain().focus().setImage({ src: url }).run();
      } catch (error: any) {
        setUploadError(error.message);
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  }, [editor]);

  const handleSetLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="space-y-4">
      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="bg-muted/50 p-2 border-b flex flex-wrap gap-1">
          <Button
            type="button"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant={
              editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"
            }
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={
              editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
            }
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={
              editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"
            }
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="sm"
            onClick={handleSetLink}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleImageUpload}
            disabled={isUploading}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            disabled={!editor.can().insertTable()}
          >
            <Table2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.can().deleteTable()}
            title="Delete Table"
          >
            <Trash className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor */}
        <div className="h-[600px] overflow-auto border rounded-b-lg w-full">
          <EditorContent editor={editor} className="min-h-full" />
        </div>
      </div>
    </div>
  );
}
