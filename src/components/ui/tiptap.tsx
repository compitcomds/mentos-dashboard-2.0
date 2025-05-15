import React, { useCallback, useEffect, useState, useRef, memo } from 'react'; // Import memo
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TiptapImage from '@tiptap/extension-image';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link as LinkIcon, List, ListOrdered, Heading1, Heading2, Heading3, Quote, AlignLeft, AlignCenter, AlignRight, AlignJustify, Image as ImageIcon, Pilcrow, Baseline, Unlink, CodeXml, ChevronDown, Eraser, Video, Lock, Unlock, Expand
} from 'lucide-react';

import { Separator } from './separator';
import { Textarea } from './textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Button, buttonVariants } from './button'; // Keep buttonVariants
import { cn } from '@/lib/utils';
import { // Ensure DropdownMenu components are imported correctly
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Import the MediaSelectorDialog
import MediaSelectorDialog from '@/app/dashboard/web-media/_components/media-selector-dialog';
import { Input } from './input';
// Import Tiptap Video extension if needed (requires installation: npm install @tiptap/extension-video)
// import VideoExtension from '@tiptap/extension-video';

// --- Custom Image Extension with Alignment Classes & Inline Styles ---
const CustomImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: { // Use class attribute for alignment
        default: 'align-left', // Default alignment class
        parseHTML: element => element.getAttribute('class')?.match(/align-(left|center|right)/)?.[0],
        renderHTML: attributes => {
           // Base classes for structure and spacing
           let baseClasses = 'block my-4'; // block display, vertical margin

           // Alignment class from attributes or default
           const alignmentClass = attributes.class || 'align-left';

           // Add sizing/border classes ONLY if no inline width/height is set via style
           let sizingClasses = '';
           if (!attributes.style || (!attributes.style.includes('width:') && !attributes.style.includes('height:'))) {
               sizingClasses = 'max-w-full h-auto border rounded-md';
           } else {
               sizingClasses = 'border rounded-md'; // Only border/rounding
           }

           // Combine base, sizing, and alignment classes
           return { class: `${baseClasses} ${sizingClasses} ${alignmentClass}`.trim() };
        },
      },
      style: { // Use style attribute for width/height
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          return attributes.style ? { style: attributes.style } : {};
        },
      },
      // Inherit src and alt from parent
      src: this.parent?.().src,
      alt: this.parent?.().alt,
       // Keep width/height for parsing but don't render directly
       width: {
         default: null,
         parseHTML: element => element.getAttribute('width') || element.style.width?.replace('px', ''),
         renderHTML: () => ({}),
       },
       height: {
         default: null,
         parseHTML: element => element.getAttribute('height') || element.style.height?.replace('px', ''),
         renderHTML: () => ({}),
       },
       'data-original-width': { // Store original dimensions if possible
         default: null,
         parseHTML: element => element.getAttribute('data-original-width'),
         renderHTML: attributes => attributes['data-original-width'] ? { 'data-original-width': attributes['data-original-width'] } : {},
       },
       'data-original-height': {
         default: null,
         parseHTML: element => element.getAttribute('data-original-height'),
         renderHTML: attributes => attributes['data-original-height'] ? { 'data-original-height': attributes['data-original-height'] } : {},
       },
    };
  },
});


interface TipTapEditorProps {
  content?: string;
  onContentChange?: (content: string) => void;
  className?: string;
}

// Memoize the component to prevent unnecessary re-renders
const TipTapEditor: React.FC<TipTapEditorProps> = memo(({ content = '', onContentChange, className }) => {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceContent, setSourceContent] = useState(content);
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [isBubbleMenuMounted, setIsBubbleMenuMounted] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [imageWidth, setImageWidth] = useState<string>('');
  const [imageHeight, setImageHeight] = useState<string>('');
  const [isRatioLocked, setIsRatioLocked] = useState<boolean>(true);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<number | null>(null);


   // Use forwardRef for the editor instance if necessary, but direct useEditor is common
   const editor = useEditor({
       extensions: [
         StarterKit.configure({
            heading: { levels: [1, 2, 3] },
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
             target: '_blank',
             rel: 'noopener noreferrer nofollow',
           },
         }),
          CustomImage.configure({
            inline: false,
            allowBase64: true,
          }),
         Placeholder.configure({
           placeholder: 'Start writing your amazing content here…',
         }),
         TextAlign.configure({
           types: ['heading', 'paragraph'],
           alignments: ['left', 'center', 'right', 'justify'],
           defaultAlignment: 'left',
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
           if (editor.isActive('image')) {
               updateImageDimensionStates();
           }
       },
        onSelectionUpdate: ({ editor }) => {
            if (editor.isActive('image')) {
               updateImageDimensionStates();
            } else {
                setImageWidth('');
                setImageHeight('');
                setCurrentAspectRatio(null);
            }
        },
      }); // Removed editor from dependency array

   const getCurrentImageDimensions = useCallback(() => {
        // Ensure editor exists before accessing its methods
        if (!editor || !editor.isActive('image')) return { width: '', height: '', ratio: null };
        const attrs = editor.getAttributes('image');
        const style = attrs.style || '';
        const widthMatch = style.match(/width:\s*([^;]+?)\s*(?:px|%)?\s*;/);
        const heightMatch = style.match(/height:\s*([^;]+?)\s*(?:px|%)?\s*;/);

        let width = widthMatch ? widthMatch[1].trim() : (attrs.width || '');
        let height = heightMatch ? heightMatch[1].trim() : (attrs.height || '');
        let ratio: number | null = null;

        if (typeof width === 'string') width = width.replace(/%\s*$/, '%');
        if (typeof height === 'string') height = height.replace(/%\s*$/, '%');

        const numericWidth = parseFloat(width);
        const numericHeight = parseFloat(height);

        if (!isNaN(numericWidth) && numericWidth > 0 && !isNaN(numericHeight) && numericHeight > 0) {
           ratio = numericWidth / numericHeight;
        } else {
            const originalWidth = parseFloat(attrs['data-original-width']);
            const originalHeight = parseFloat(attrs['data-original-height']);
            if (!isNaN(originalWidth) && originalWidth > 0 && !isNaN(originalHeight) && originalHeight > 0) {
                ratio = originalWidth / originalHeight;
            }
        }

        return {
            width: String(width),
            height: String(height),
            ratio: ratio
        };
   }, [editor]); // Dependency on editor


   const updateImageDimensionStates = useCallback(() => {
        const { width, height, ratio } = getCurrentImageDimensions();
        // Only update state if the value has actually changed
        if (width !== imageWidth) setImageWidth(width);
        if (height !== imageHeight) setImageHeight(height);
        if (ratio !== currentAspectRatio) setCurrentAspectRatio(ratio);
    }, [getCurrentImageDimensions, imageWidth, imageHeight, currentAspectRatio]); // Dependencies


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
        // Mount bubble menu only when editor is available
        if (editor && !isBubbleMenuMounted) {
            setIsBubbleMenuMounted(true);
        }
    }, [editor, isBubbleMenuMounted]);

     useEffect(() => {
        // Update dimensions only if editor exists and image is active
        if (editor?.isFocused && editor.isActive('image')) {
             updateImageDimensionStates();
        }
      // Add editor as dependency here too
     }, [editor, editor?.isFocused, updateImageDimensionStates]);


  const setLinkCallback = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL (leave empty to remove link)', previousUrl || 'https://');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let finalUrl = url;
      if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
        finalUrl = `https://${url}`;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl, target: '_blank' }).run();
    }
  }, [editor]);


   const handleMediaSelect = (mediaUrl: string, altText: string | null, mimeType: string | null) => {
      if (editor && mediaUrl) {
          if (mimeType?.startsWith('image/')) {
              const img = new window.Image();
              img.onload = () => {
                  const originalWidth = img.naturalWidth;
                  const originalHeight = img.naturalHeight;
                   const maxWidth = 600; // Max width constraint within editor content area
                   let initialWidth = originalWidth;
                   let initialHeight = originalHeight;
                   if (initialWidth > maxWidth) {
                       initialWidth = maxWidth;
                       initialHeight = (originalHeight * maxWidth) / originalWidth;
                   }
                   // Ensure minimum dimensions
                   initialWidth = Math.max(initialWidth, 50);
                   initialHeight = Math.max(initialHeight, 50);

                   const initialStyle = `width: ${Math.round(initialWidth)}px; height: ${Math.round(initialHeight)}px;`;

                  editor.chain().focus().setImage({
                      src: mediaUrl,
                      alt: altText || undefined,
                      class: 'align-left', // Default alignment
                       style: initialStyle,
                       // Store original dimensions for aspect ratio calculation
                       'data-original-width': String(originalWidth),
                       'data-original-height': String(originalHeight),
                  }).run();
                  updateImageDimensionStates(); // Immediately update state after setting image
              };
              img.onerror = () => {
                   // Fallback if image fails to load dimensions
                  editor.chain().focus().setImage({
                      src: mediaUrl,
                      alt: altText || undefined,
                      class: 'align-left',
                       style: 'width: 100px; height: auto; min-width: 50px; min-height: 50px;' // Default small size
                  }).run();
                  updateImageDimensionStates(); // Immediately update state after setting image
              };
              img.src = mediaUrl;

          } else if (mimeType?.startsWith('video/')) {
              console.warn("Video insertion requires @tiptap/extension-video. Inserting as link/placeholder.");
               editor.chain().focus().insertContent(`<p><a href="${mediaUrl}" target="_blank" rel="noopener noreferrer">View Video: ${altText || mediaUrl}</a></p>`).run();
          } else {
               editor.chain().focus().insertContent(`<p><a href="${mediaUrl}" target="_blank" rel="noopener noreferrer">View File: ${altText || mediaUrl}</a></p>`).run();
          }
      }
      setIsMediaSelectorOpen(false);
   };


   const handleSourceChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newHtml = event.target.value;
      setSourceContent(newHtml);
      // Update the actual editor content if not in source mode initially, but user switches back and forth
      if (editor && !isSourceMode) {
          const currentEditorHtml = editor.getHTML();
          if (currentEditorHtml !== newHtml) {
              // Be cautious with direct setContent, might trigger updates loop.
              // editor.commands.setContent(newHtml, false); // Might cause issues
          }
      }
       // Trigger external change handler if provided
       if (onContentChange) {
         onContentChange(newHtml);
       }
   };

   const toggleSourceMode = () => {
      const newMode = !isSourceMode;
      if (newMode && editor) {
          // Entering source mode: capture current editor HTML
          setSourceContent(editor.getHTML());
      } else if (!newMode && editor) {
           // Exiting source mode: apply source content back to editor
           const currentSource = sourceContent;
           const editorHtml = editor.getHTML();
           if (editorHtml !== currentSource) {
                 // Use setContent to update the editor from the source textarea
                 editor.commands.setContent(currentSource, true); // Pass true to trigger 'update'
           }
           // Ensure external handler gets the latest content when exiting source mode
           if (onContentChange) {
              onContentChange(currentSource);
           }
      }
      setIsSourceMode(newMode);
   };

   const updateImageAttributes = useCallback((attrs: { class?: string; style?: string; width?: string | null; height?: string | null }) => {
        if (!editor || !editor.isActive('image')) return;
        const currentAttrs = editor.getAttributes('image');
        let newStyle = currentAttrs.style || '';
        let styleChanged = false;

        // Helper to update width or height in the style string
        const updateStyleProp = (prop: 'width' | 'height', value: string | null | undefined) => {
            const regex = new RegExp(`${prop}:\\s*[^;]+;?`, 'i');
             let cleanValue = value === null || value === '' || value === undefined ? null : String(value).trim();

            // Handle removing the property if value is null/empty
            if (cleanValue === null) {
                if (newStyle.match(regex)) {
                    newStyle = newStyle.replace(regex, '').trim();
                    styleChanged = true;
                }
            }
            // Handle valid numeric (px), percentage (%), or 'auto' values
            else if (/^\d+(\.\d+)?(px|%)?$/.test(cleanValue) || cleanValue === 'auto') {
                 let newValueWithUnit = cleanValue;
                 // Add 'px' unit if only numbers are provided
                 if (/^\d+(\.\d+)?$/.test(cleanValue)) {
                     newValueWithUnit = `${cleanValue}px`;
                 }

                 // Enforce minimum 50px if units are pixels
                 if (newValueWithUnit.endsWith('px')) {
                      const numericVal = parseFloat(newValueWithUnit);
                      if (numericVal < 50) {
                           newValueWithUnit = '50px';
                           // Update the state driving the input field immediately
                           // This prevents the input from showing a value lower than 50
                           if (prop === 'width') setImageWidth('50');
                           if (prop === 'height') setImageHeight('50');
                      }
                 }

                 const newPropStyle = `${prop}: ${newValueWithUnit};`;

                // Replace existing style property or add new one
                if (newStyle.match(regex)) {
                    const currentStyleValue = newStyle.match(regex)?.[0];
                    // Only update if the value actually changed
                    if (currentStyleValue?.toLowerCase() !== newPropStyle.toLowerCase()) {
                         newStyle = newStyle.replace(regex, newPropStyle);
                         styleChanged = true;
                    }
                } else {
                    // Add the new style property (prepend to avoid issues with missing semicolons)
                    newStyle = `${newPropStyle} ${newStyle}`.trim();
                    styleChanged = true;
                }
            } else {
                // Log warning for invalid input values
                console.warn(`Invalid ${prop} value: "${value}". Must be numeric (px), percentage (%), 'auto', or empty.`);
            }
        };

        // Update width and height styles
        updateStyleProp('width', attrs.width);
        updateStyleProp('height', attrs.height);

       // Clean up the style string (remove double semicolons, trailing semicolon)
       newStyle = newStyle.replace(/;;/g, ';').replace(/;\s*$/, '').trim();
       // If style string is empty after cleaning, set it to null
       if (newStyle === '') newStyle = null as any; // Use 'as any' to bypass strict null check if needed

       // Prepare the final attributes object to pass to Tiptap
       const finalAttrs: Record<string, any> = {};
       // Include class if it changed
       if (attrs.class !== undefined && attrs.class !== currentAttrs.class) {
           finalAttrs.class = attrs.class;
       }
       // Include style if it changed or was modified
       if (styleChanged || newStyle !== currentAttrs.style) {
           finalAttrs.style = newStyle;
       }


       // Only run the Tiptap command if there are actual changes
       if (Object.keys(finalAttrs).length > 0) {
            // Double-check editor state just before command execution
            if (editor.isActive('image')) {
                 editor.chain().focus().updateAttributes('image', finalAttrs).run();
            }
       }
   }, [editor]); // Removed setImageWidth/Height, as they are handled inside the function


    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = e.target.value;
        setImageWidth(newWidth); // Update local state immediately for input responsiveness

        let newHeight = imageHeight;
        // Calculate height based on aspect ratio if locked and width is valid number
        if (isRatioLocked && currentAspectRatio && newWidth && /^\d+(\.\d+)?$/.test(newWidth)) {
            const numericWidth = parseFloat(newWidth);
            // Ensure calculated height is at least 50
            newHeight = String(Math.max(50, Math.round(numericWidth / currentAspectRatio)));
            setImageHeight(newHeight); // Update height state when locked
        } else if (!newWidth && isRatioLocked) {
             // If width is cleared and ratio locked, clear height too
             newHeight = '';
             setImageHeight(newHeight);
        }
         // Pass potentially updated width and height to Tiptap
         updateImageAttributes({ width: newWidth || null, height: newHeight || null });
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = e.target.value;
        setImageHeight(newHeight); // Update local state immediately

        let newWidth = imageWidth;
        // Calculate width based on aspect ratio if locked and height is valid number
        if (isRatioLocked && currentAspectRatio && newHeight && /^\d+(\.\d+)?$/.test(newHeight)) {
            const numericHeight = parseFloat(newHeight);
            // Ensure calculated width is at least 50
            newWidth = String(Math.max(50, Math.round(numericHeight * currentAspectRatio)));
            setImageWidth(newWidth); // Update width state when locked
        } else if (!newHeight && isRatioLocked) {
             // If height is cleared and ratio locked, clear width too
             newWidth = '';
             setImageWidth(newWidth);
        }
         // Pass potentially updated width and height to Tiptap
         updateImageAttributes({ width: newWidth || null, height: newHeight || null });
    };

    // Set width to 100% and height to auto
    const setWidthTo100Percent = () => {
        const newWidth = '100%';
        const newHeight = 'auto'; // Let height adjust automatically
        setImageWidth(newWidth); // Update state
        setImageHeight(newHeight); // Update state
         // Update Tiptap attributes
         updateImageAttributes({ width: newWidth, height: newHeight });
    };


  if (!editor) {
    return (
        <div className={cn("border border-border rounded-md p-4 min-h-[300px] flex items-center justify-center text-muted-foreground", className)}>
            Loading Editor...
        </div>
    );
  }

  // --- Toolbar Definition ---
  const toolbarItems = [
     { type: 'button', icon: CodeXml, action: toggleSourceMode, tooltip: 'View/Edit Source', isActive: isSourceMode, id: 'source' },
     { type: 'separator', id: 'sep-source' },
     { type: 'dropdown', id: 'block-type', items: [
       { label: 'Paragraph', action: () => editor.chain().focus().setParagraph().run(), isActive: editor.isActive('paragraph') },
       { label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
       { label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
       { label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
     ]},
     { type: 'separator', id: 'sep-block' },
     { type: 'button', icon: Bold, action: () => editor.chain().focus().toggleBold().run(), tooltip: 'Bold (Ctrl+B)', isActive: editor.isActive('bold'), id: 'bold', disabled: isSourceMode },
     { type: 'button', icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), tooltip: 'Italic (Ctrl+I)', isActive: editor.isActive('italic'), id: 'italic', disabled: isSourceMode },
     { type: 'button', icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), tooltip: 'Underline (Ctrl+U)', isActive: editor.isActive('underline'), id: 'underline', disabled: isSourceMode },
     { type: 'button', icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), tooltip: 'Strikethrough', isActive: editor.isActive('strike'), id: 'strike', disabled: isSourceMode },
     { type: 'button', icon: Code, action: () => editor.chain().focus().toggleCode().run(), tooltip: 'Code', isActive: editor.isActive('code'), id: 'code', disabled: isSourceMode },
     { type: 'button', icon: Eraser, action: () => editor.chain().focus().unsetAllMarks().clearNodes().run(), tooltip: 'Clear Formatting & Nodes', id: 'clear-all', disabled: isSourceMode },
     { type: 'separator', id: 'sep-format' },
     { type: 'button', icon: List, action: () => editor.chain().focus().toggleBulletList().run(), tooltip: 'Bullet List', isActive: editor.isActive('bulletList'), id: 'bullet-list', disabled: isSourceMode },
     { type: 'button', icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), tooltip: 'Numbered List', isActive: editor.isActive('orderedList'), id: 'ordered-list', disabled: isSourceMode },
     { type: 'button', icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), tooltip: 'Blockquote', isActive: editor.isActive('blockquote'), id: 'quote', disabled: isSourceMode },
     { type: 'separator', id: 'sep-list' },
     { type: 'button', icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), tooltip: 'Align Left', isActive: editor.isActive({ textAlign: 'left' }), id: 'align-left', disabled: isSourceMode },
     { type: 'button', icon: AlignCenter, action: () => editor.chain().focus().setTextAlign('center').run(), tooltip: 'Align Center', isActive: editor.isActive({ textAlign: 'center' }), id: 'align-center', disabled: isSourceMode },
     { type: 'button', icon: AlignRight, action: () => editor.chain().focus().setTextAlign('right').run(), tooltip: 'Align Right', isActive: editor.isActive({ textAlign: 'right' }), id: 'align-right', disabled: isSourceMode },
     { type: 'button', icon: AlignJustify, action: () => editor.chain().focus().setTextAlign('justify').run(), tooltip: 'Justify', isActive: editor.isActive({ textAlign: 'justify' }), id: 'align-justify', disabled: isSourceMode },
     { type: 'separator', id: 'sep-align' },
     { type: 'button', icon: LinkIcon, action: setLinkCallback, tooltip: 'Add/Edit Link', isActive: editor.isActive('link'), id: 'link', disabled: isSourceMode },
     { type: 'button', icon: Unlink, action: () => editor.chain().focus().unsetLink().run(), tooltip: 'Remove Link', id: 'unlink', disabled: !editor.isActive('link') || isSourceMode },
     { type: 'button', icon: ImageIcon, action: () => setIsMediaSelectorOpen(true), tooltip: 'Attach Image/Video', id: 'attach-media', disabled: isSourceMode },
  ];

  const getActiveBlockLabel = () => {
    if (!editor) return 'Paragraph'; // Return default if editor not ready
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    return 'Paragraph';
  };

  const shouldShowLinkBubbleMenu = ({ editor, view, state, oldState, from, to }: any): boolean => {
    // Added check for editor existence
    return !!editor && from === to && editor.isActive('link');
  };
  const shouldShowImageBubbleMenu = ({ editor }: any): boolean => {
     // Added check for editor existence
     return !!editor && editor.isActive('image');
   };


  return (
    <TooltipProvider>
        <div ref={editorContainerRef} className={cn("border border-border rounded-md flex flex-col", className)}>
            {/* Toolbar */}
            <div className="flex items-center px-2 py-1.5 border-b border-border flex-wrap gap-1 bg-muted/50 rounded-t-md flex-shrink-0">
             {toolbarItems.map((item) => {
                if (item.type === 'separator') {
                 return <Separator key={item.id} orientation="vertical" className="h-6 mx-1" />;
               }
                if (item.type === 'dropdown') {
                 return (
                    <DropdownMenu key={item.id}>
                     <DropdownMenuTrigger
                        asChild
                        disabled={isSourceMode || !editor} // Disable if in source mode or editor not ready
                      >
                       <Button variant="ghost" size="sm" className="px-2 gap-1 text-sm w-32 justify-start">
                         <span>{getActiveBlockLabel()}</span>
                         <ChevronDown className="w-4 h-4"/>
                       </Button>
                      </DropdownMenuTrigger>
                     <DropdownMenuContent>
                       {item.items.map((subItem) => (
                         <DropdownMenuItem
                           key={subItem.label}
                           onClick={subItem.action}
                           className={cn(subItem.isActive && 'bg-accent')}
                           disabled={isSourceMode || !editor} // Disable dropdown items too
                         >
                           {subItem.label}
                         </DropdownMenuItem>
                       ))}
                     </DropdownMenuContent>
                   </DropdownMenu>
                 );
                }
                 // Default case: Render ToolbarButton
                 return (
                     <ToolbarButton
                        key={item.id}
                        onClick={item.action}
                        isActive={item.isActive}
                        disabled={item.disabled || !editor} // General disable check
                        tooltip={item.tooltip}
                     >
                        {/* Render the icon component */}
                         <item.icon className="w-4 h-4" />
                    </ToolbarButton>
                 );
             })}
            </div>

             {/* --- Bubble Menu for Link Editing --- */}
             {editor && isBubbleMenuMounted && editorContainerRef.current && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={shouldShowLinkBubbleMenu}
                    tippyOptions={{
                        duration: 100,
                        appendTo: () => editorContainerRef.current || document.body, // Fallback to document.body
                        placement: 'bottom',
                    }}
                    className="bg-background border border-border shadow-md rounded-md p-1 flex gap-1 items-center"
                    pluginKey="linkBubbleMenu"
                >
                    <input
                        type="text"
                        defaultValue={editor.getAttributes('link').href || ''}
                        onBlur={(e) => {
                            const url = e.target.value;
                             if (url === '') {
                                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                            } else {
                                let finalUrl = url;
                                if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
                                finalUrl = `https://${url}`;
                                }
                                editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl, target: '_blank' }).run();
                            }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                        placeholder="https://example.com"
                        className="text-sm p-1 border rounded-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring flex-grow min-w-[200px]"
                    />
                    <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} tooltip="Remove Link" className="px-2 h-auto text-xs"><Unlink className='w-3 h-3'/></ToolbarButton>
                </BubbleMenu>
             )}

             {/* --- Bubble Menu for Image Editing --- */}
              {editor && isBubbleMenuMounted && editorContainerRef.current && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={shouldShowImageBubbleMenu}
                    tippyOptions={{
                        duration: 100,
                        appendTo: () => editorContainerRef.current || document.body, // Fallback to document.body
                        placement: 'bottom',
                        // Keep the bubble menu open while interacting with its elements
                        hideOnClick: false, // Add this to keep it open
                         interactive: true, // Allow interaction within the bubble
                    }}
                    className="bg-background border border-border shadow-md rounded-md p-2 flex gap-2 items-center flex-wrap"
                    pluginKey="imageBubbleMenu"
                 >
                    {/* Alignment Buttons */}
                    <div className='flex gap-1 items-center'>
                        <span className='text-xs text-muted-foreground mr-1'>Align:</span>
                        <ToolbarButton onClick={() => updateImageAttributes({ class: 'align-left' })} tooltip="Align Left" isActive={editor.getAttributes('image').class === 'align-left'}><AlignLeft className='w-4 h-4'/></ToolbarButton>
                        <ToolbarButton onClick={() => updateImageAttributes({ class: 'align-center' })} tooltip="Align Center" isActive={editor.getAttributes('image').class === 'align-center'}><AlignCenter className='w-4 h-4'/></ToolbarButton>
                        <ToolbarButton onClick={() => updateImageAttributes({ class: 'align-right' })} tooltip="Align Right" isActive={editor.getAttributes('image').class === 'align-right'}><AlignRight className='w-4 h-4'/></ToolbarButton>
                    </div>
                    <Separator orientation='vertical' className='h-6 mx-1'/>

                    {/* Width/Height & Aspect Ratio Lock */}
                    <div className='flex gap-1 items-center'>
                         <span className='text-xs text-muted-foreground mr-1'>Size (px):</span>
                        <Input
                            type="number" // Use number input
                            min="50" // Set minimum value
                            placeholder="Width"
                            // Display only the numeric part for editing, remove units
                             value={imageWidth.toString().replace(/px|%|auto/gi, '')}
                            onChange={handleWidthChange}
                            // Disable input if width is set to 'auto' or '100%' which are handled by button
                             disabled={imageWidth === 'auto' || imageWidth === '100%'}
                            className="w-16 h-7 text-xs px-1"
                        />
                        {/* Aspect Ratio Lock Button */}
                        <ToolbarButton onClick={() => setIsRatioLocked(!isRatioLocked)} tooltip={isRatioLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"} isActive={isRatioLocked}>
                            {isRatioLocked ? <Lock className='w-4 h-4'/> : <Unlock className='w-4 h-4'/>}
                        </ToolbarButton>
                        <Input
                            type="number" // Use number input
                             min="50" // Set minimum value
                            placeholder="Height"
                             // Display only the numeric part for editing, remove units
                             value={imageHeight.toString().replace(/px|%|auto/gi, '')}
                            onChange={handleHeightChange}
                            // Disable input if height is set to 'auto'
                             disabled={imageHeight === 'auto'}
                            className="w-16 h-7 text-xs px-1"
                        />
                    </div>
                     <Separator orientation='vertical' className='h-6 mx-1'/>
                     {/* 100% Width Button */}
                      <ToolbarButton onClick={setWidthTo100Percent} tooltip="Set Width to 100%" isActive={imageWidth === '100%'}>
                         <Expand className='w-4 h-4'/>
                     </ToolbarButton>
                </BubbleMenu>
              )}


            {/* Editor Content Area or Source Textarea */}
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

         {/* Media Selector Dialog for Tiptap (returns URL) */}
         <MediaSelectorDialog
             isOpen={isMediaSelectorOpen}
             onOpenChange={setIsMediaSelectorOpen}
             onMediaSelect={handleMediaSelect}
             returnType="url" // Specify return type as 'url'
         />
    </TooltipProvider>
  );
});
TipTapEditor.displayName = 'TipTapEditor'; // Add display name for memoized component


// Toolbar Button Component with Tooltip - Memoized
const ToolbarButton = memo(({ children, tooltip, isActive, disabled, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean; tooltip?: string }) => {
    const ButtonComponent = (
        <button
            type="button"
            disabled={disabled}
            className={cn(
                "p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                className
            )}
            {...props}
        >
            {/* Ensure children (icons) get consistent sizing */}
            {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement, { className: cn('w-4 h-4', (children as React.ReactElement).props.className) }) : children}
        </button>
    );

    if (!tooltip) return ButtonComponent;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {ButtonComponent}
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
});
ToolbarButton.displayName = 'ToolbarButton'; // Add display name for memoized component


export default TipTapEditor;
    