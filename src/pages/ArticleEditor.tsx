import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useUploadFile } from '@/hooks/useUploadFile';
import {
  Save,
  Send,
  FileEdit,
  Eye,
  Image as ImageIcon,
  Film,
  Music,
  X,
  Plus,
  Loader2,
  BookOpen,
  Tag
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

export default function ArticleEditor() {
  const navigate = useNavigate();
  const { draftId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { mutate: createEvent, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('write');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Media state
  const [mediaFiles, setMediaFiles] = useState<Array<{ type: string; url: string; name: string }>>([]);

  // Load existing draft if draftId is provided
  const { data: existingDraft, isLoading: isLoadingDraft } = useQuery({
    queryKey: ['draft', draftId, user?.pubkey],
    queryFn: async () => {
      if (!draftId || !user) return null;

      const signal = AbortSignal.timeout(3000);
      const events = await nostr.query(
        [{
          kinds: [30024],
          authors: [user.pubkey],
          '#d': [draftId],
          limit: 1
        }],
        { signal }
      );

      return events[0] || null;
    },
    enabled: !!draftId && !!user,
  });

  // Load draft data into form
  useEffect(() => {
    if (existingDraft) {
      const draftTitle = existingDraft.tags.find(([name]) => name === 'title')?.[1] || '';
      const draftSummary = existingDraft.tags.find(([name]) => name === 'summary')?.[1] || '';
      const draftImage = existingDraft.tags.find(([name]) => name === 'image')?.[1] || '';
      const draftTags = existingDraft.tags.filter(([name]) => name === 't').map(([, tag]) => tag);

      setTitle(draftTitle);
      setSummary(draftSummary);
      setContent(existingDraft.content);
      setImage(draftImage);
      setTags(draftTags);
    }
  }, [existingDraft]);

  // Check if coming from published article (to create new version)
  useEffect(() => {
    const publishedId = searchParams.get('from');
    if (publishedId && user) {
      // Load published article to edit
      const loadPublishedArticle = async () => {
        const signal = AbortSignal.timeout(3000);
        const events = await nostr.query(
          [{
            kinds: [30023],
            '#d': [publishedId],
            limit: 1
          }],
          { signal }
        );

        const article = events[0];
        if (article) {
          const articleTitle = article.tags.find(([name]) => name === 'title')?.[1] || '';
          const articleSummary = article.tags.find(([name]) => name === 'summary')?.[1] || '';
          const articleImage = article.tags.find(([name]) => name === 'image')?.[1] || '';
          const articleTags = article.tags.filter(([name]) => name === 't').map(([, tag]) => tag);

          setTitle(articleTitle);
          setSummary(articleSummary);
          setContent(article.content);
          setImage(articleImage);
          setTags(articleTags);
        }
      };

      loadPublishedArticle();
    }
  }, [searchParams, user, nostr]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const [[_, url]] = await uploadFile(file);
      setImage(url);
      toast({
        title: 'Image uploaded',
        description: 'Header image has been uploaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const [[_, url]] = await uploadFile(file);

      let mediaType = 'file';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      setMediaFiles([...mediaFiles, { type: mediaType, url, name: file.name }]);

      // Insert media reference into content
      let mediaMarkdown = '';
      if (mediaType === 'image') {
        mediaMarkdown = `\n\n![${file.name}](${url})\n\n`;
      } else if (mediaType === 'video') {
        mediaMarkdown = `\n\n[📹 ${file.name}](${url})\n\n`;
      } else if (mediaType === 'audio') {
        mediaMarkdown = `\n\n[🎵 ${file.name}](${url})\n\n`;
      } else {
        mediaMarkdown = `\n\n[${file.name}](${url})\n\n`;
      }

      setContent(content + mediaMarkdown);

      toast({
        title: 'Media uploaded',
        description: `${file.name} has been uploaded and inserted into the article`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload media. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDraft = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to save drafts',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please add a title before saving',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    // Generate a unique draft ID if this is a new draft
    const d = draftId || `draft-${Date.now()}`;

    const draftTags: string[][] = [
      ['d', d],
      ['title', title],
      ['alt', 'Paranormal article draft - Long-form content draft']
    ];

    if (summary.trim()) {
      draftTags.push(['summary', summary]);
    }

    if (image.trim()) {
      draftTags.push(['image', image]);
    }

    tags.forEach(tag => {
      draftTags.push(['t', tag]);
    });

    // Always add paranormal tag
    if (!tags.includes('paranormal')) {
      draftTags.push(['t', 'paranormal']);
    }

    createEvent(
      {
        event: {
          kind: 30024,
          content,
          tags: draftTags
        }
      },
      {
        onSuccess: () => {
          setIsSaving(false);
          setLastSaved(new Date());
          toast({
            title: 'Draft saved',
            description: 'Your article draft has been saved successfully',
          });

          // Navigate to the draft editor with the draft ID
          if (!draftId) {
            navigate(`/articles/draft/${d}`, { replace: true });
          }
        },
        onError: () => {
          setIsSaving(false);
          toast({
            title: 'Save failed',
            description: 'Failed to save draft. Please try again.',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handlePublish = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to publish articles',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please add a title before publishing',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please add content before publishing',
        variant: 'destructive',
      });
      return;
    }

    // Use the same identifier for the published article
    const d = draftId || `article-${Date.now()}`;

    const articleTags: string[][] = [
      ['d', d],
      ['title', title],
      ['published_at', Math.floor(Date.now() / 1000).toString()],
      ['alt', 'Paranormal article - Long-form content']
    ];

    if (summary.trim()) {
      articleTags.push(['summary', summary]);
    }

    if (image.trim()) {
      articleTags.push(['image', image]);
    }

    tags.forEach(tag => {
      articleTags.push(['t', tag]);
    });

    // Always add paranormal tag
    if (!tags.includes('paranormal')) {
      articleTags.push(['t', 'paranormal']);
    }

    createEvent(
      {
        event: {
          kind: 30023,
          content,
          tags: articleTags
        }
      },
      {
        onSuccess: () => {
          toast({
            title: 'Article published!',
            description: 'Your paranormal article has been published to Nostr',
          });

          // Navigate to the published article
          const naddr = nip19.naddrEncode({
            identifier: d,
            pubkey: user.pubkey,
            kind: 30023
          });
          navigate(`/${naddr}`);
        },
        onError: () => {
          toast({
            title: 'Publish failed',
            description: 'Failed to publish article. Please try again.',
            variant: 'destructive',
          });
        }
      }
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <SpookstrHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <FileEdit className="h-16 w-16 mx-auto mb-4 text-lime-400/60" />
              <h2 className="text-2xl font-bold text-lime-300 mb-2">Login Required</h2>
              <p className="text-lime-400/70 mb-6">
                Please log in to create and publish paranormal articles on Spookstr
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-black">
        <SpookstrHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-lime-400 animate-spin" />
              <p className="text-lime-400/70">Loading draft...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SpookstrHeader />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Editor Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FileEdit className="h-8 w-8 text-lime-400" />
              <div>
                <h1 className="text-2xl font-bold text-lime-300">
                  {draftId ? 'Edit Article' : 'New Paranormal Article'}
                </h1>
                <p className="text-sm text-lime-400/70">
                  Share your paranormal investigations, encounters, and research
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-lime-400/60">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button
                onClick={handleSaveDraft}
                disabled={isSaving || isPublishing}
                variant="outline"
                className="border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || isSaving}
                className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish Article
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2">
            <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="text-lime-300">Article Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter your article title..."
                      className="mt-2 bg-black/60 border-lime-500/30 text-lime-100 text-xl font-bold"
                    />
                  </div>

                  {/* Summary */}
                  <div>
                    <Label htmlFor="summary" className="text-lime-300">Summary (Optional)</Label>
                    <Textarea
                      id="summary"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="A brief summary of your article..."
                      className="mt-2 bg-black/60 border-lime-500/30 text-lime-100 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="write" className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4" />
                      Write
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="write" className="mt-0">
                    <div data-color-mode="dark" className="w-full">
                      <MDEditor
                        value={content}
                        onChange={(val) => setContent(val || '')}
                        preview="edit"
                        height={500}
                        visibleDragbar={false}
                        textareaProps={{
                          placeholder: 'Write your paranormal article here... Supports Markdown formatting.',
                        }}
                        commands={[
                          {
                            name: 'bold',
                            keyCommand: 'bold',
                            buttonProps: { 'aria-label': 'Add bold text' },
                            icon: <span style={{ fontWeight: 'bold' }}>B</span>,
                          },
                          {
                            name: 'italic',
                            keyCommand: 'italic',
                            buttonProps: { 'aria-label': 'Add italic text' },
                            icon: <span style={{ fontStyle: 'italic' }}>I</span>,
                          },
                          {
                            name: 'strikethrough',
                            keyCommand: 'strikethrough',
                            buttonProps: { 'aria-label': 'Add strikethrough text' },
                            icon: <span style={{ textDecoration: 'line-through' }}>S</span>,
                          },
                          {
                            name: 'title1',
                            keyCommand: 'title1',
                            buttonProps: { 'aria-label': 'Insert title 1' },
                            icon: <span style={{ fontWeight: 'bold' }}>H1</span>,
                          },
                          {
                            name: 'title2',
                            keyCommand: 'title2',
                            buttonProps: { 'aria-label': 'Insert title 2' },
                            icon: <span style={{ fontWeight: 'bold' }}>H2</span>,
                          },
                          {
                            name: 'title3',
                            keyCommand: 'title3',
                            buttonProps: { 'aria-label': 'Insert title 3' },
                            icon: <span style={{ fontWeight: 'bold' }}>H3</span>,
                          },
                          {
                            name: 'title4',
                            keyCommand: 'title4',
                            buttonProps: { 'aria-label': 'Insert title 4' },
                            icon: <span style={{ fontWeight: 'bold' }}>H4</span>,
                          },
                          {
                            name: 'title5',
                            keyCommand: 'title5',
                            buttonProps: { 'aria-label': 'Insert title 5' },
                            icon: <span style={{ fontWeight: 'bold' }}>H5</span>,
                          },
                          {
                            name: 'title6',
                            keyCommand: 'title6',
                            buttonProps: { 'aria-label': 'Insert title 6' },
                            icon: <span style={{ fontWeight: 'bold' }}>H6</span>,
                          },
                        ]}
                        extraCommands={[
                          {
                            name: 'unorderedListCommand',
                            keyCommand: 'unordered-list',
                            buttonProps: { 'aria-label': 'Add unordered list' },
                            icon: <span>•</span>,
                          },
                          {
                            name: 'orderedListCommand',
                            keyCommand: 'ordered-list',
                            buttonProps: { 'aria-label': 'Add ordered list' },
                            icon: <span>1.</span>,
                          },
                          {
                            name: 'checkedListCommand',
                            keyCommand: 'checked-list',
                            buttonProps: { 'aria-label': 'Add checked list' },
                            icon: <span>☑</span>,
                          },
                          {
                            name: 'quote',
                            keyCommand: 'quote',
                            buttonProps: { 'aria-label': 'Add quote' },
                            icon: <span>"</span>,
                          },
                          {
                            name: 'code',
                            keyCommand: 'code',
                            buttonProps: { 'aria-label': 'Add code' },
                            icon: <span style={{ fontFamily: 'monospace' }}>{'</>'}</span>,
                          },
                          {
                            name: 'codeBlock',
                            keyCommand: 'code-block',
                            buttonProps: { 'aria-label': 'Add code block' },
                            icon: <span style={{ fontFamily: 'monospace' }}>{ '```' }</span>,
                          },
                          {
                            name: 'link',
                            keyCommand: 'link',
                            buttonProps: { 'aria-label': 'Add link' },
                            icon: <span>🔗</span>,
                          },
                          {
                            name: 'image',
                            keyCommand: 'image',
                            buttonProps: { 'aria-label': 'Add image' },
                            icon: <span>🖼️</span>,
                          },
                          {
                            name: 'table',
                            keyCommand: 'table',
                            buttonProps: { 'aria-label': 'Add table' },
                            icon: <span>⊞</span>,
                          },
                          {
                            name: 'hr',
                            keyCommand: 'hr',
                            buttonProps: { 'aria-label': 'Add horizontal rule' },
                            icon: <span>―</span>,
                          },
                        ]}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-0">
                    <div className="min-h-[500px] p-6 bg-black/60 border border-lime-500/30 rounded-lg">
                      {content ? (
                        <div className="prose prose-lime prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-lime-400/40" />
                          <p className="text-lime-400/60">No content to preview yet</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Header Image */}
            <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-lime-300">Header Image</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {image && (
                  <div className="relative">
                    <img
                      src={image}
                      alt="Header"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setImage('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="header-image-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="header-image-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
                      disabled={isUploading}
                      onClick={() => document.getElementById('header-image-upload')?.click()}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {image ? 'Change Image' : 'Upload Image'}
                        </>
                      )}
                    </Button>
                  </label>
                </div>

                {!image && (
                  <div>
                    <Label htmlFor="image-url" className="text-lime-300 text-xs">Or paste URL</Label>
                    <Input
                      id="image-url"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 bg-black/60 border-lime-500/30 text-lime-100 text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media Uploads */}
            <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-lime-300">Media</h3>
                <p className="text-xs text-lime-400/70">
                  Upload EVPs, videos, photos, and more
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                    id="media-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="media-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
                      disabled={isUploading}
                      onClick={() => document.getElementById('media-upload')?.click()}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Media
                        </>
                      )}
                    </Button>
                  </label>
                </div>

                {mediaFiles.length > 0 && (
                  <div className="space-y-2">
                    {mediaFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-lime-500/10 rounded border border-lime-500/20"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {file.type === 'image' && <ImageIcon className="h-4 w-4 text-lime-400 flex-shrink-0" />}
                          {file.type === 'video' && <Film className="h-4 w-4 text-lime-400 flex-shrink-0" />}
                          {file.type === 'audio' && <Music className="h-4 w-4 text-lime-400 flex-shrink-0" />}
                          <span className="text-xs text-lime-300 truncate">{file.name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => setMediaFiles(mediaFiles.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-lime-300">Tags</h3>
                <p className="text-xs text-lime-400/70">
                  Add tags to help readers discover your article
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Enter tag..."
                    className="bg-black/60 border-lime-500/30 text-lime-100"
                  />
                  <Button
                    onClick={handleAddTag}
                    variant="outline"
                    className="border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
                  >
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-lime-500/30 text-lime-300 pr-1"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-lime-500/20">
                  <p className="text-xs text-lime-400/60 mb-2">Suggested tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {['ghost', 'ufo', 'cryptid', 'haunted', 'investigation', 'evidence'].map((suggestedTag) => (
                      !tags.includes(suggestedTag) && (
                        <Badge
                          key={suggestedTag}
                          variant="outline"
                          className="text-xs border-lime-500/20 text-lime-400/70 hover:bg-lime-500/10 cursor-pointer"
                          onClick={() => setTags([...tags, suggestedTag])}
                        >
                          #{suggestedTag}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
