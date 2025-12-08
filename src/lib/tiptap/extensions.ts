import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

export const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
  Image.configure({
    inline: true,
    allowBase64: false,
    HTMLAttributes: {
      class: "rounded-lg max-w-full h-auto",
    },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    HTMLAttributes: {
      class: "text-primary underline underline-offset-4",
    },
  }),
  Placeholder.configure({
    placeholder: "Viết nội dung bài viết của bạn...",
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: "w-full border-collapse border border-border my-4 not-prose",
    },
  }),
  TableRow,
  TableHeader.configure({
    HTMLAttributes: {
      class: "border border-border bg-muted !px-4 !py-2 text-left font-bold",
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      class: "border border-border !px-4 !py-2",
    },
  }),
];
