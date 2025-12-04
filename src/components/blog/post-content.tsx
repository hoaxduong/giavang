"use client";

import { useEffect, useRef } from "react";

interface PostContentProps {
  content: any; // Tiptap JSON
}

export function PostContent({ content }: PostContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || !content) return;

    // Render Tiptap JSON content as HTML
    const renderNode = (node: any): string => {
      if (!node) return "";

      if (node.type === "text") {
        let text = node.text || "";

        // Apply marks
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case "bold":
                text = `<strong>${text}</strong>`;
                break;
              case "italic":
                text = `<em>${text}</em>`;
                break;
              case "link":
                text = `<a href="${mark.attrs?.href || "#"}" class="text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer">${text}</a>`;
                break;
            }
          });
        }

        return text;
      }

      const children = node.content
        ? node.content.map(renderNode).join("")
        : "";

      switch (node.type) {
        case "paragraph":
          return `<p>${children}</p>`;
        case "heading":
          const level = node.attrs?.level || 1;
          return `<h${level}>${children}</h${level}>`;
        case "bulletList":
          return `<ul>${children}</ul>`;
        case "orderedList":
          return `<ol>${children}</ol>`;
        case "listItem":
          return `<li>${children}</li>`;
        case "image":
          const src = node.attrs?.src || "";
          const alt = node.attrs?.alt || "";
          return `<img src="${src}" alt="${alt}" class="rounded-lg max-w-full h-auto" />`;
        case "blockquote":
          return `<blockquote>${children}</blockquote>`;
        case "codeBlock":
          return `<pre><code>${children}</code></pre>`;
        case "horizontalRule":
          return "<hr />";
        case "hardBreak":
          return "<br />";
        default:
          return children;
      }
    };

    const html = content.content
      ? content.content.map(renderNode).join("")
      : "";
    contentRef.current.innerHTML = html;
  }, [content]);

  return (
    <div
      ref={contentRef}
      className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none
        prose-headings:font-bold prose-headings:tracking-tight
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-lg prose-img:shadow-md
        prose-blockquote:border-l-primary prose-blockquote:bg-muted prose-blockquote:py-1 prose-blockquote:px-4
        prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-muted prose-pre:border"
    />
  );
}
