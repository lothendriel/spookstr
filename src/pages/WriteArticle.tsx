import { useState, useEffect, useCallback }

export default WriteArticlePage; from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArticleEditor } from '@/components/ArticleEditor';
import { CategoriesSelector } from '@/components/RichTextEditor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent } from '@nostrify/nostrify';
import { generateUniqueIdentifier, getTagValue } from '@/lib/nostrHelpers';
import {
  PenSquare,
  Save,
  Send,
  Eye,
  ChevronLeft,
  AlertCircle,
  Ghost as GhostIcon,
  Image as ImageIcon,
  Mic as MicIcon,
  Video as VideoIcon,
  Info as InfoIcon
} from 'lucide-react';

// Define article categories
const ARTICLE_CATEGORIES = [
  { value: 'ghosts', label: 'Ghosts & Hauntings' },
  { value: 'ufos', label: 'UFOs & Aliens' },
  { value: 'cryptids', label: 'Cryptids' },
  { value: 'supernatural', label: 'Supernatural' },
  { value: 'paranormal', label: 'Paranormal' },
  { value: 'unexplained', label: 'Unexplained Phenomena' },
  { value: 'mythology', label: 'Mythology & Folklore' },
  { value: 'conspiracy', label: 'Conspiracy' },
  { value: 'history', label: 'Paranormal History' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'science', label: 'Paranormal Science' },
  { value: 'testimony', label: 'Personal Experience' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'religion', label: 'Religious Phenomena' },
  { value: 'divination', label: 'Divination & Fortune Telling' },
];

function useDraft(draftId?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['draft', draftId],
    queryFn: async () => {
      if (!draftId) return null;

      const events = await nostr.query([
        {
          ids: [draftId],
          kinds: [30024], // Draft article kind
        }
      ]);

      return events.length > 0 ? events[0] : null;
    },
    enabled: !!draftId,
  });
}

export function WriteArticlePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();

  // Parse draft ID from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const draftId = queryParams.get('draft') || undefined;
  const { data: draftEvent } = useDraft(draftId);

  // Article state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [image, setImage] = useState('');
  const [publishAs, setPublishAs] = useState<'published' | 'draft'>('draft');
  const [allowComments, setAllowComments] = useState(true);
  const [tab, setTab] = useState('write');

  // Set initial state from draft if available
  useEffect(() => {
    if (draftEvent) {
      setTitle(getTagValue(draftEvent, 'title', ''));
      setSummary(getTagValue(draftEvent, 'summary', ''));
      setContent(draftEvent.content || '');
      setIdentifier(getTagValue(draftEvent, 'd', ''));

      // Extract categories from 't' tags
      const draftCategories = draftEvent.tags
        .filter(tag => tag[0] === 't')
        .map(tag => tag[1]);
      setCategories(draftCategories);

      // Extract image URL
      const imageTag = draftEvent.tags.find(tag => tag[0] === 'image');
      setImage(imageTag ? imageTag[1] : '');

      // Check comments setting
      const commentsDisabled = draftEvent.tags.some(tag => tag[0] === 'comments_disabled');
      setAllowComments(!commentsDisabled);
    }
  }, [draftEvent]);

  // Generate a unique identifier if not editing a draft
  useEffect(() => {
    if (!draftEvent && !identifier) {
      setIdentifier(generateUniqueIdentifier('article'));
    }
  }, [draftEvent, identifier]);

  const validateArticle = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your article",
        variant: "destructive",
      });
      return false;
    }

    if (title.length < 5) {
      toast({
        title: "Title too short",
        description: "Title should be at least 5 characters long",
        variant: "destructive",
      });
      return false;
    }

    if (!summary.trim()) {
      toast({
        title: "Summary required",
        description: "Please enter a summary for your article",
        variant: "destructive",
      });
      return false;
    }

    if (!content.trim() || content === '<p></p>') {
      toast({
        title: "Content required",
        description: "Please write some content for your article",
        variant: "destructive",
      });
      return false;
    }

    if (categories.length === 0) {
      toast({
        title: "Categories required",
        description: "Please select at least one category for your article",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const saveArticle = async (asDraft: boolean) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to save articles",
        variant: "destructive",
      });
      return;
    }

    if (!validateArticle()) {
      return;
    }

    try {
      const kind = asDraft ? 30024 : 30023; // 30024 for drafts, 30023 for published articles

      // Build tags array
      const tags: string[][] = [
        ['d', identifier],
        ['title', title],
        ['summary', summary],
        ...categories.map(category => ['t', category]),
      ];

      if (image) {
        tags.push(['image', image]);
      }

      // If comments are disabled, add a tag
      if (!allowComments) {
        tags.push(['comments_disabled', '1']);
      }

      // Add client tag
      tags.push(['client', 'spookstr']);

      // Publish event
      await publishEvent({
        kind,
        content,
        tags,
      });

      toast({
        title: asDraft ? "Draft saved" : "Article published",
        description: asDraft
          ? "Your draft has been saved successfully"
          : "Your article has been published successfully",
      });

      // Navigate to the articles page or the published article
      if (!asDraft) {
        navigate('/articles');
      }
    } catch (error) {
      console.error('Error saving article:', error);
      toast({
        title: "Error saving article",
        description: "There was an error saving your article. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = useCallback(() => {
    saveArticle(true);
  }, [title, summary, content, identifier, categories, image, allowComments]);

  const handlePublish = useCallback(() => {
    if (publishAs === 'draft') {
      saveArticle(true);
    } else {
      saveArticle(false);
    }
  }, [publishAs, title, summary, content, identifier, categories, image, allowComments]);

  const handlePreview = useCallback(() => {
    setTab('preview');
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 text-lime-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-lime-400 mb-2">Login Required</h1>
              <p className="text-lime-100 mb-6">
                Please log in to create or edit articles
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </Button>

            <div>
              <h1 className="text-2xl font-bold text-lime-400">
                {draftEvent ? 'Edit Article' : 'Write New Article'}
              </h1>
              <p className="text-lime-500/60">
                {publishAs === 'draft' ? 'Working Draft' : 'Ready to Publish'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleSave}
              className="border-lime-500/40 text-lime-300 hover:bg-lime-500/10"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>

            <Button
              onClick={handlePublish}
              className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
            >
              <Send className="h-4 w-4 mr-2" />
              {publishAs === 'draft' ? 'Save Draft' : 'Publish Article'}
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 bg-lime-500/10 border border-lime-500/20">
            <TabsTrigger
              value="write"
              className="data-[state=active]:bg-lime-500 data-[state=active]:text-black"
            >
              <PenSquare className="h-4 w-4 mr-2" />
              Write
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-lime-500 data-[state=active]:text-black"
              disabled={!content}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Editor Column */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                  <CardHeader>
                    <h2 className="text-xl font-semibold text-lime-400">Article Content</h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-lime-200">
                        Title <span className="text-lime-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a captivating title..."
                        className="bg-black/60 border-lime-500/40 text-lime-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="summary" className="text-lime-200">
                        Summary <span className="text-lime-500">*</span>
                      </Label>
                      <Textarea
                        id="summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Write a brief summary of your article..."
                        rows={3}
                        className="bg-black/60 border-lime-500/40 text-lime-100 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editor" className="text-lime-200">
                        Article Content <span className="text-lime-500">*</span>
                      </Label>
                      <ArticleEditor
                        onChange={setContent}
                        initialContent={content}
                        draft={draftEvent}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                  <CardHeader>
                    <h2 className="text-xl font-semibold text-lime-400">Publication Settings</h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-lime-200">Publish Status</div>
                        <p className="text-sm text-lime-500/60">
                          Choose whether to save as a draft or publish immediately
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${publishAs === 'draft' ? 'text-lime-400' : 'text-lime-500/60'}`}>
                          Draft
                        </span>
                        <Switch
                          checked={publishAs === 'published'}
                          onCheckedChange={(checked) => setPublishAs(checked ? 'published' : 'draft')}
                          className="data-[state=checked]:bg-lime-500"
                        />
                        <span className={`text-sm ${publishAs === 'published' ? 'text-lime-400' : 'text-lime-500/60'}`}>
                          Published
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-lime-200">Comments</div>
                        <p className="text-sm text-lime-500/60">
                          Allow readers to leave comments on your article
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={allowComments}
                          onCheckedChange={setAllowComments}
                          className="data-[state=checked]:bg-lime-500"
                        />
                        <span className="text-sm text-lime-500/60">
                          {allowComments ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Column */}
              <div className="md:col-span-1 space-y-6">
                <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                  <CardHeader>
                    <h2 className="text-xl font-semibold text-lime-400">Categories</h2>
                  </CardHeader>
                  <CardContent>
                    <CategoriesSelector
                      selected={categories}
                      onChange={setCategories}
                      options={ARTICLE_CATEGORIES}
                      maxSelection={5}
                    />
                  </CardContent>
                </Card>

                <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                  <CardHeader>
                    <h2 className="text-xl font-semibold text-lime-400">Featured Image</h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="image" className="text-lime-200">
                        Image URL
                      </Label>
                      <Input
                        id="image"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="bg-black/60 border-lime-500/40 text-lime-100"
                      />
                      <p className="text-xs text-lime-500/60">
                        Add the URL of an image to represent your article
                      </p>
                    </div>

                    {image && (
                      <div className="relative aspect-video rounded-md overflow-hidden border border-lime-500/20">
                        <img
                          src={image}
                          alt="Featured"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {!image && (
                      <div className="border border-dashed border-lime-500/30 rounded-md p-8 text-center bg-black/20">
                        <ImageIcon className="h-8 w-8 text-lime-500/40 mx-auto mb-2" />
                        <p className="text-sm text-lime-500/60">
                          No featured image added
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                  <CardHeader>
                    <h2 className="text-xl font-semibold text-lime-400">Tips</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <GhostIcon className="h-5 w-5 text-lime-400 mt-0.5" />
                        <p className="text-sm text-lime-100">
                          Be authentic and specific when describing paranormal experiences.
                        </p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <ImageIcon className="h-5 w-5 text-lime-400 mt-0.5" />
                        <p className="text-sm text-lime-100">
                          Include images of evidence when possible (UFOs, orbs, cryptids).
                        </p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MicIcon className="h-5 w-5 text-lime-400 mt-0.5" />
                        <p className="text-sm text-lime-100">
                          Add audio recordings of EVPs or unusual sounds to enhance credibility.
                        </p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <VideoIcon className="h-5 w-5 text-lime-400 mt-0.5" />
                        <p className="text-sm text-lime-100">
                          Embed videos of paranormal activity or investigations when available.
                        </p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <InfoIcon className="h-5 w-5 text-lime-400 mt-0.5" />
                        <p className="text-sm text-lime-100">
                          Include details like location, date, time, and environmental conditions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-8">
            <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm overflow-hidden">
              {image && (
                <div className="relative h-64 sm:h-80 md:h-96 w-full">
                  <img
                    src={image}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {categories.map(cat => {
                        const category = ARTICLE_CATEGORIES.find(c => c.value === cat);
                        return (
                          <span key={cat} className="text-xs bg-lime-500/20 text-lime-300 px-2 py-1 rounded-full">
                            {category?.label || cat}
                          </span>
                        );
                      })}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {title || 'Untitled Article'}
                    </h1>
                    <p className="text-lg text-lime-100/80">
                      {summary || 'No summary provided'}
                    </p>
                  </div>
                </div>
              )}

              {!image && (
                <CardHeader>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map(cat => {
                      const category = ARTICLE_CATEGORIES.find(c => c.value === cat);
                      return (
                        <span key={cat} className="text-xs bg-lime-500/20 text-lime-300 px-2 py-1 rounded-full">
                          {category?.label || cat}
                        </span>
                      );
                    })}
                  </div>
                  <h1 className="text-3xl font-bold text-lime-400 mb-2">
                    {title || 'Untitled Article'}
                  </h1>
                  <p className="text-lg text-lime-100/80">
                    {summary || 'No summary provided'}
                  </p>
                </CardHeader>
              )}

              <CardContent className={!image ? 'pt-0' : ''}>
                <div className="prose prose-invert max-w-none prose-headings:text-lime-300 prose-p:text-lime-100 prose-a:text-lime-400 prose-blockquote:text-lime-200/80 prose-blockquote:border-lime-500 prose-img:rounded-lg my-8">
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>

                <div className="mt-8 pt-8 border-t border-lime-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-lime-500/60">
                      {allowComments ? 'Comments are enabled' : 'Comments are disabled'}
                    </span>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setTab('write')}
                        size="sm"
                        className="border-lime-500/40 text-lime-300 hover:bg-lime-500/10"
                      >
                        <PenSquare className="h-4 w-4 mr-2" />
                        Edit
                      </Button>

                      <Button
                        onClick={handlePublish}
                        size="sm"
                        className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {publishAs === 'draft' ? 'Save Draft' : 'Publish Article'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}