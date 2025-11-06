import { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Undo,
  Redo,
  Trash,
  Youtube,
} from 'lucide-react';
import { useUploadFile } from '@/hooks/useUploadFile';
import { NostrEvent } from '@nostrify/nostrify';
import { getTagValue } from '@/lib/nostrHelpers';

interface ArticleEditorProps {
  onChange: (html: string) => void;
  initialContent?: string;
  className?: string;
  placeholder?: string;
  draft?: NostrEvent;
}

export function ArticleEditor({
  onChange,
  initialContent = '',
  className = '',
  placeholder = 'Start writing your paranormal article...',
  draft
}: ArticleEditorProps) {
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubePopover, setShowYoutubePopover] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-lime-400 underline decoration-dotted hover:text-lime-300 transition-colors',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-md max-w-full h-auto border border-lime-500/20',
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-md overflow-hidden my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none prose-headings:text-lime-300
        prose-p:text-lime-100 prose-a:text-lime-400 prose-blockquote:text-lime-200/80
        prose-blockquote:border-lime-500 prose-img:rounded-lg ${className}`,
      },
    },
  });

  useEffect(() => {
    if (draft && editor) {
      const content = draft.content;
      if (content) {
        editor.commands.setContent(content);
      }
    }
  }, [draft, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // If no protocol is specified, add https://
    const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`;

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();

    setShowLinkPopover(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const addImage = useCallback(async (file: File) => {
    if (!editor || !file) return;

    try {
      const [[_, url]] = await uploadFile(file);

      editor
        .chain()
        .focus()
        .setImage({ src: url })
        .run();
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  }, [editor, uploadFile]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      addImage(file);
    }
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  }, [addImage]);

  const addYoutubeVideo = useCallback(() => {
    if (!editor || !youtubeUrl) return;

    editor
      .chain()
      .focus()
      .setYoutubeVideo({ src: youtubeUrl })
      .run();

    setShowYoutubePopover(false);
    setYoutubeUrl('');
  }, [editor, youtubeUrl]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-wrap items-center gap-2 p-2 bg-black/40 border border-lime-500/20 rounded-md">
        {/* Text Formatting */}
        <Toggle
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          size="sm"
          aria-label="Bold"
          className="data-[state=on]:bg-lime-500/20 data-[state=on]:text-lime-400"
        >
          <Bold className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          size="sm"
          aria-label="Italic"
          className="data-[state=on]:bg-lime-500/20 data-[state=on]:text-lime-400"
        >
          <Italic className="h-4 w-4" />
        </Toggle>

        {/* Headings */}
        <Toggle
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          size="sm"
          aria-label="Heading 2"
          className="data-[state=on]:bg-lime-500/20 data-[state=on]:text-lime-400"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>

        {/* Lists */}
        <Toggle
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          size="sm"
          aria-label="Bullet List"
          className="data-[state=on]:bg-lime-500/20 data-[state=on]:text-lime-400"
        >
          <List className="h-4 w-4" />
        </Toggle>

        <Toggle
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          size="sm"
          aria-label="Ordered List"
          className="data-[state=on]:bg-lime-500/20 data-[state=on]:text-lime-400"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        {/* Blockquote */}
        <Toggle
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          size="sm"
          aria-label="Blockquote"
          className="data-[state=on]:bg-lime-500/20 data-[state=on]:text-lime-400"
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        {/* Link */}
        <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
          <PopoverTrigger asChild>
            <Toggle
              pressed={editor.isActive('link')}
              size="sm"
              aria-label="Link"
              className="data-[state=on]:bg-lime-500/20 data-[state=on]:text-lime-400"
            >
              <LinkIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-black border border-lime-500/20 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkUrl" className="text-lime-200">
                  URL
                </Label>
                <Input
                  id="linkUrl"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setLink()}
                  className="bg-black/60 border-lime-500/40 text-lime-100"
                />
              </div>
              <div className="flex justify-between">
                {editor.isActive('link') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().extendMarkRange('link').unsetLink().run();
                      setShowLinkPopover(false);
                    }}
                  >
                    Remove Link
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setLink}
                  className="ml-auto border-lime-500/40 text-lime-300 hover:bg-lime-500/20"
                >
                  {editor.isActive('link') ? 'Update Link' : 'Add Link'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image Upload */}
        <div className="relative">
          <label htmlFor="imageUpload">
            <Toggle
              pressed={false}
              size="sm"
              aria-label="Upload Image"
              className="cursor-pointer"
              disabled={isUploading}
            >
              <ImageIcon className="h-4 w-4" />
              {isUploading && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-lime-500 rounded-full animate-pulse"></span>
              )}
            </Toggle>
          </label>
          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="sr-only"
            disabled={isUploading}
          />
        </div>

        {/* YouTube */}
        <Popover open={showYoutubePopover} onOpenChange={setShowYoutubePopover}>
          <PopoverTrigger asChild>
            <Toggle
              pressed={false}
              size="sm"
              aria-label="YouTube Video"
              className="cursor-pointer"
            >
              <YoutubeIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-black border border-lime-500/20 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl" className="text-lime-200">
                  YouTube URL
                </Label>
                <Input
                  id="youtubeUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addYoutubeVideo()}
                  className="bg-black/60 border-lime-500/40 text-lime-100"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addYoutubeVideo}
                className="ml-auto border-lime-500/40 text-lime-300 hover:bg-lime-500/20"
              >
                Insert Video
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          {/* Undo/Redo */}
          <Toggle
            pressed={false}
            onPressedChange={() => editor.chain().focus().undo().run()}
            size="sm"
            aria-label="Undo"
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Toggle>

          <Toggle
            pressed={false}
            onPressedChange={() => editor.chain().focus().redo().run()}
            size="sm"
            aria-label="Redo"
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Toggle>

          {/* Clear Editor */}
          <Toggle
            pressed={false}
            onPressedChange={() => {
              if (window.confirm('Are you sure you want to clear the editor? This cannot be undone.')) {
                editor.chain().focus().clearContent().run();
              }
            }}
            size="sm"
            aria-label="Clear Editor"
          >
            <Trash className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      <div className="min-h-[300px] border border-lime-500/20 rounded-md overflow-hidden bg-black/20 focus-within:border-lime-500/40 transition-colors">
        <EditorContent
          editor={editor}
          className="min-h-[300px] px-4 py-3 focus:outline-none"
        />
      </div>

      <style jsx global>{`
        .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(163, 230, 53, 0.4);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}