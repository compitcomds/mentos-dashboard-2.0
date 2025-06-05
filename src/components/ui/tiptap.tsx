
import React, { useCallback, useEffect, useState, useRef, memo } from "react";
import { EditorContent, useEditor, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image"; // Standard Tiptap Image extension
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIconLucide, // Renamed to avoid conflict
  Pilcrow,
  Baseline,
  Unlink,
  CodeXml,
  ChevronDown,
  Eraser,
  Video,
} from "lucide-react";

import { Separator } from "./separator";
import { Textarea } from "./textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { Button, buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MediaSelectorDialog from "@/app/dashboard/web-media/_components/media-selector-dialog";
// Input is not directly used in the simplified version for image dimensions

interface TipTapEditorProps {
  content?: string;
  onContentChange?: (content: string) => void;
  className?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = memo(
  ({ content = "", onContentChange, className }) => {
    const [isSourceMode, setIsSourceMode] = useState(false);
    const [sourceContent, setSourceContent] = useState(content);
    const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
    const [isBubbleMenuMounted, setIsBubbleMenuMounted] = useState(false);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3], HTMLAttributes: {} },
          bulletList: { HTMLAttributes: {} },
          orderedList: { HTMLAttributes: {} },
          blockquote: { HTMLAttributes: {} },
          codeBlock: false,
          horizontalRule: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        }),
        TiptapImage.configure({ // Using standard TiptapImage
          inline: false,
          allowBase64: true,
          // No custom attributes for alignment/style needed here for standard usage
        }),
        Placeholder.configure({
          placeholder: "Start writing your amazing content here…",
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"], // Removed 'image' from types
          alignments: ["left", "center", "right", "justify"],
          defaultAlignment: "left",
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        setSourceContent(html);
        if (onContentChange && !isSourceMode) {
          onContentChange(html);
        }
      },
      onTransaction: ({ editor, transaction }) => {
        if (transaction.docChanged && !transaction.meta.view) {
          const html = editor.getHTML();
          if (html !== sourceContent) {
            setSourceContent(html);
          }
        }
      },
    });

    useEffect(() => {
      if (editor && !isSourceMode) {
        const editorHtml = editor.getHTML();
        if (editorHtml !== content) {
          editor.commands.setContent(content, false);
          setSourceContent(content);
        }
      }
    }, [content, editor, isSourceMode]);

    useEffect(() => {
      if (isSourceMode && editor) {
        const editorHtml = editor.getHTML();
        if (editorHtml !== sourceContent) {
          setSourceContent(editorHtml);
        }
      }
    }, [isSourceMode, editor, sourceContent]);

    useEffect(() => {
      if (editor && !isBubbleMenuMounted) {
        setIsBubbleMenuMounted(true);
      }
    }, [editor, isBubbleMenuMounted]);

    const setLinkCallback = useCallback(() => {
      if (!editor) return;
      const previousUrl = editor.getAttributes("link").href;
      const url = window.prompt(
        "Enter URL (leave empty to remove link)",
        previousUrl || "https://"
      );

      if (url === null) return;

      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        let finalUrl = url;
        if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
          finalUrl = `https://${url}`;
        }
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: finalUrl, target: "_blank" })
          .run();
      }
    }, [editor]);

    type Media = {
      fileUrl: string;
      alt?: string;
      mime?: string;
      name?: string;
      [key: string]: any;
    };

    const handleMediaSelect = (media: Media) => {
      const { fileUrl: mediaUrl, alt: altText, mime: mimeType, name } = media;
      if (editor && mediaUrl) {
        if (mimeType?.startsWith("image/")) {
          // Standard image insertion
          editor
            .chain()
            .focus()
            .setImage({
              src: mediaUrl,
              alt: altText || name || undefined,
            })
            .run();
        } else {
          // Insert non-image files as download links
          const displayText = `Download: ${name || altText || "File"}`;
          const downloadBtnHtml = `<p><a href="${mediaUrl}" download target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 8px 16px; background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); text-decoration: none; border-radius: 0.375rem; font-weight: 500;">${displayText}</a></p>`;
          editor.chain().focus().insertContent(downloadBtnHtml).run();
        }
      }
      setIsMediaSelectorOpen(false);
    };

    const handleSourceChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      const newHtml = event.target.value;
      setSourceContent(newHtml);
      if (onContentChange) {
        onContentChange(newHtml);
      }
    };

    const toggleSourceMode = () => {
      const newMode = !isSourceMode;
      if (newMode && editor) {
        setSourceContent(editor.getHTML());
      } else if (!newMode && editor) {
        const currentSource = sourceContent;
        const editorHtml = editor.getHTML();
        if (editorHtml !== currentSource) {
          editor.commands.setContent(currentSource, true);
        }
        if (onContentChange) {
          onContentChange(currentSource);
        }
      }
      setIsSourceMode(newMode);
    };

    if (!editor) {
      return (
        <div
          className={cn(
            "border border-border rounded-md p-4 min-h-[300px] flex items-center justify-center text-muted-foreground",
            className
          )}
        >
          Loading Editor...
        </div>
      );
    }

    const toolbarItems = [
      {
        type: "button",
        icon: CodeXml,
        action: toggleSourceMode,
        tooltip: "View/Edit Source",
        isActive: isSourceMode,
        id: "source",
      },
      { type: "separator", id: "sep-source" },
      {
        type: "dropdown",
        id: "block-type",
        items: [
          {
            label: "Paragraph",
            action: () => editor.chain().focus().setParagraph().run(),
            isActive: editor.isActive("paragraph"),
          },
          {
            label: "Heading 1",
            action: () =>
              editor.chain().focus().toggleHeading({ level: 1 }).run(),
            isActive: editor.isActive("heading", { level: 1 }),
          },
          {
            label: "Heading 2",
            action: () =>
              editor.chain().focus().toggleHeading({ level: 2 }).run(),
            isActive: editor.isActive("heading", { level: 2 }),
          },
          {
            label: "Heading 3",
            action: () =>
              editor.chain().focus().toggleHeading({ level: 3 }).run(),
            isActive: editor.isActive("heading", { level: 3 }),
          },
        ],
      },
      { type: "separator", id: "sep-block" },
      {
        type: "button",
        icon: Bold,
        action: () => editor.chain().focus().toggleBold().run(),
        tooltip: "Bold (Ctrl+B)",
        isActive: editor.isActive("bold"),
        id: "bold",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: Italic,
        action: () => editor.chain().focus().toggleItalic().run(),
        tooltip: "Italic (Ctrl+I)",
        isActive: editor.isActive("italic"),
        id: "italic",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: UnderlineIcon,
        action: () => editor.chain().focus().toggleUnderline().run(),
        tooltip: "Underline (Ctrl+U)",
        isActive: editor.isActive("underline"),
        id: "underline",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: Strikethrough,
        action: () => editor.chain().focus().toggleStrike().run(),
        tooltip: "Strikethrough",
        isActive: editor.isActive("strike"),
        id: "strike",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: Code,
        action: () => editor.chain().focus().toggleCode().run(),
        tooltip: "Code",
        isActive: editor.isActive("code"),
        id: "code",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: Eraser,
        action: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
        tooltip: "Clear Formatting & Nodes",
        id: "clear-all",
        disabled: isSourceMode,
      },
      { type: "separator", id: "sep-format" },
      {
        type: "button",
        icon: List,
        action: () => editor.chain().focus().toggleBulletList().run(),
        tooltip: "Bullet List",
        isActive: editor.isActive("bulletList"),
        id: "bullet-list",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: ListOrdered,
        action: () => editor.chain().focus().toggleOrderedList().run(),
        tooltip: "Numbered List",
        isActive: editor.isActive("orderedList"),
        id: "ordered-list",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: Quote,
        action: () => editor.chain().focus().toggleBlockquote().run(),
        tooltip: "Blockquote",
        isActive: editor.isActive("blockquote"),
        id: "quote",
        disabled: isSourceMode,
      },
      { type: "separator", id: "sep-list" },
      {
        type: "button",
        icon: AlignLeft,
        action: () => editor.chain().focus().setTextAlign("left").run(),
        tooltip: "Align Left",
        isActive: editor.isActive({ textAlign: "left" }),
        id: "align-left",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: AlignCenter,
        action: () => editor.chain().focus().setTextAlign("center").run(),
        tooltip: "Align Center",
        isActive: editor.isActive({ textAlign: "center" }),
        id: "align-center",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: AlignRight,
        action: () => editor.chain().focus().setTextAlign("right").run(),
        tooltip: "Align Right",
        isActive: editor.isActive({ textAlign: "right" }),
        id: "align-right",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: AlignJustify,
        action: () => editor.chain().focus().setTextAlign("justify").run(),
        tooltip: "Justify",
        isActive: editor.isActive({ textAlign: "justify" }),
        id: "align-justify",
        disabled: isSourceMode,
      },
      { type: "separator", id: "sep-align" },
      {
        type: "button",
        icon: LinkIcon,
        action: setLinkCallback,
        tooltip: "Add/Edit Link",
        isActive: editor.isActive("link"),
        id: "link",
        disabled: isSourceMode,
      },
      {
        type: "button",
        icon: Unlink,
        action: () => editor.chain().focus().unsetLink().run(),
        tooltip: "Remove Link",
        id: "unlink",
        disabled: !editor.isActive("link") || isSourceMode,
      },
      {
        type: "button",
        icon: ImageIconLucide, // Using renamed import
        action: () => setIsMediaSelectorOpen(true),
        tooltip: "Attach Image/Video",
        id: "attach-media",
        disabled: isSourceMode,
      },
    ];

    const getActiveBlockLabel = () => {
      if (!editor) return "Paragraph";
      if (editor.isActive("heading", { level: 1 })) return "Heading 1";
      if (editor.isActive("heading", { level: 2 })) return "Heading 2";
      if (editor.isActive("heading", { level: 3 })) return "Heading 3";
      return "Paragraph";
    };

    const shouldShowLinkBubbleMenu = ({
      editor: currentEditor,
      from,
      to,
    }: any): boolean => {
      return !!currentEditor && from === to && currentEditor.isActive("link");
    };

    return (
      <TooltipProvider>
        <div
          ref={editorContainerRef}
          className={cn(
            "border border-border rounded-md flex flex-col",
            className
          )}
        >
          <div className="flex items-center px-2 py-1.5 border-b border-border flex-wrap gap-1 bg-muted/50 rounded-t-md flex-shrink-0">
            {toolbarItems.map((item) => {
              if (item.type === "separator") {
                return (
                  <Separator
                    key={item.id}
                    orientation="vertical"
                    className="h-6 mx-1"
                  />
                );
              }
              if (item.type === "dropdown") {
                return (
                  <DropdownMenu key={item.id}>
                    <DropdownMenuTrigger
                      asChild
                      disabled={isSourceMode || !editor}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 gap-1 text-sm w-32 justify-start"
                      >
                        <span>{getActiveBlockLabel()}</span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {item.items.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.label}
                          onClick={subItem.action}
                          className={cn(subItem.isActive && "bg-accent")}
                          disabled={isSourceMode || !editor}
                        >
                          {subItem.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              return (
                <ToolbarButton
                  key={item.id}
                  onClick={item.action}
                  isActive={item.isActive}
                  disabled={item.disabled || !editor}
                  tooltip={item.tooltip}
                >
                  <item.icon className="w-4 h-4" />
                </ToolbarButton>
              );
            })}
          </div>

          {editor && isBubbleMenuMounted && editorContainerRef.current && (
            <BubbleMenu
              editor={editor}
              shouldShow={shouldShowLinkBubbleMenu}
              tippyOptions={{
                duration: 100,
                appendTo: () => editorContainerRef.current || document.body,
                placement: "bottom",
              }}
              className="bg-background border border-border shadow-md rounded-md p-1 flex gap-1 items-center"
              pluginKey="linkBubbleMenu"
            >
              <input
                type="text"
                defaultValue={editor.getAttributes("link").href || ""}
                onBlur={(e) => {
                  const url = e.target.value;
                  if (url === "") {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .unsetLink()
                      .run();
                  } else {
                    let finalUrl = url;
                    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
                      finalUrl = `https://${url}`;
                    }
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .setLink({ href: finalUrl, target: "_blank" })
                      .run();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                placeholder="https://example.com"
                className="text-sm p-1 border rounded-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring flex-grow min-w-[200px]"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                tooltip="Remove Link"
                className="px-2 h-auto text-xs"
              >
                <Unlink className="w-3 h-3" />
              </ToolbarButton>
            </BubbleMenu>
          )}

          {/* Image specific bubble menu removed */}

          <div className="flex-1 overflow-y-auto editor-content-area-wrapper">
            {isSourceMode ? (
              <Textarea
                value={sourceContent}
                onChange={handleSourceChange}
                className="w-full h-full font-mono text-sm p-3 rounded-b-md border-t-0 focus:outline-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[300px]"
                placeholder="Edit HTML source..."
              />
            ) : (
              <EditorContent
                editor={editor}
                className="prose dark:prose-invert max-w-none p-4 h-full min-h-[300px] focus:outline-none rounded-b-md editor-content-area"
              />
            )}
          </div>
        </div>

        <MediaSelectorDialog
          isOpen={isMediaSelectorOpen}
          onOpenChange={setIsMediaSelectorOpen}
          onMediaSelect={handleMediaSelect}
          returnType="url"
        />
      </TooltipProvider>
    );
  }
);
TipTapEditor.displayName = "TipTapEditor";

const ToolbarButton = memo(
  ({
    children,
    tooltip,
    isActive,
    disabled,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive?: boolean;
    tooltip?: string;
  }) => {
    const ButtonComponent = (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className
        )}
        {...props}
      >
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement, {
              className: cn(
                "w-4 h-4",
                (children as React.ReactElement).props.className
              ),
            })
          : children}
      </button>
    );

    if (!tooltip) return ButtonComponent;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{ButtonComponent}</TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
);
ToolbarButton.displayName = "ToolbarButton";

export default TipTapEditor;
