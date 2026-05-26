/* Reusable create-post dialog that can be opened from any tab */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, BarChart2, X, Smile } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';
import { feedServices } from './services/feedServices';
import { feedLabels } from './utils/labels';
import {
  CreatePostForm,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
  PostButton,
  PostButtonContainer,
  PostTextarea,
} from './FeedTab.styles';
import { readFileAsDataURL } from './utils/utils';

type CreatePostDialogProps = {
  open: boolean;
  onClose: () => void;
  initialContent?: string;
};

type CreatePostFormValues = {
  content: string;
  pollQuestion: string;
  pollOption1: string;
  pollOption2: string;
  pollOption3?: string;
  pollOption4?: string;
  pollDurationMinutes: number;
};

export function CreatePostDialog({ open, onClose, initialContent }: CreatePostDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dialogImageUrl, setDialogImageUrl] = useState<string | undefined>(undefined);
  const [dialogGifUrl, setDialogGifUrl] = useState<string | undefined>(undefined);
  const [dialogVideoUrl, setDialogVideoUrl] = useState<string | undefined>(undefined);
  const [isPollEnabled, setIsPollEnabled] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [gifResults, setGifResults] = useState<
    { id: string; title: string; previewUrl: string; originalUrl: string }[]
  >([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm<CreatePostFormValues>({
    defaultValues: {
      content: initialContent ?? '',
      pollQuestion: '',
      pollOption1: '',
      pollOption2: '',
      pollOption3: '',
      pollOption4: '',
      pollDurationMinutes: 1440, // 1 day
    },
  });

  useEffect(() => {
    if (initialContent !== undefined) {
      setValue('content', initialContent);
    }
  }, [initialContent, setValue]);

  useEffect(() => {
    if (!open) {
      setDialogImageUrl(undefined);
      setDialogGifUrl(undefined);
      setDialogVideoUrl(undefined);
    }
  }, [open]);

  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostFormValues) => {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      let pollPayload:
        | {
            question?: string;
            options: string[];
            expiresAt: string;
          }
        | undefined;

      if (isPollEnabled) {
        const options = [
          data.pollOption1?.trim(),
          data.pollOption2?.trim(),
          data.pollOption3?.trim(),
          data.pollOption4?.trim(),
        ].filter(Boolean) as string[];

        if (options.length >= 2) {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + data.pollDurationMinutes * 60 * 1000);
          pollPayload = {
            question: data.pollQuestion?.trim() || undefined,
            options,
            expiresAt: expiresAt.toISOString(),
          };
        }
      }

      return feedServices.createPost(
        token,
        data.content,
        dialogImageUrl || undefined,
        dialogGifUrl || undefined,
        dialogVideoUrl || undefined,
        pollPayload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      reset({ content: '' });
      setDialogImageUrl(undefined);
      setDialogGifUrl(undefined);
      setDialogVideoUrl(undefined);
      setIsPollEnabled(false);
      onClose();
    },
  });

  const onSubmit = (data: CreatePostFormValues) => {
    const hasPoll =
      isPollEnabled &&
      (data.pollOption1?.trim() ||
        data.pollOption2?.trim() ||
        data.pollOption3?.trim() ||
        data.pollOption4?.trim());
    const hasContent =
      data.content.trim() || dialogImageUrl || dialogGifUrl || dialogVideoUrl || hasPoll;
    if (!hasContent) return;
    createPostMutation.mutate(data);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        if (file.type.startsWith('video/')) {
          setDialogVideoUrl(dataUrl);
          setDialogImageUrl(undefined);
          setDialogGifUrl(undefined);
        } else {
          setDialogImageUrl(dataUrl);
          setDialogVideoUrl(undefined);
          setDialogGifUrl(undefined);
        }
      } catch (error) {
        alert('Please select a valid image or video file');
      }
    }
  };

  if (!open) {
    return null;
  }

  const handleGifSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = gifSearchTerm.trim();
    if (!term) return;

    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!apiKey) {
      console.error('GIPHY API key is not configured');
      return;
    }

    try {
      setIsSearchingGifs(true);
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
          term,
        )}&limit=24&rating=pg-13`,
      );
      const json = await response.json();
      const items =
        json?.data?.map((item: any) => ({
          id: item.id as string,
          title: (item.title as string) || 'GIF',
          previewUrl:
            (item.images?.fixed_height_small_still?.url as string) ||
            (item.images?.fixed_height_small?.url as string) ||
            (item.images?.downsized_still?.url as string) ||
            (item.images?.downsized?.url as string),
          originalUrl:
            (item.images?.original?.url as string) ||
            (item.images?.downsized_large?.url as string) ||
            (item.images?.downsized?.url as string),
        })) ?? [];
      setGifResults(items.filter((g: any) => g.previewUrl && g.originalUrl));
    } catch (error) {
      console.error('Failed to search GIFs', error);
    } finally {
      setIsSearchingGifs(false);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{feedLabels.createPostPlaceholder}</ModalTitle>
          <ModalCloseButton onClick={onClose}>
            <X size={24} />
          </ModalCloseButton>
        </ModalHeader>

        <CreatePostForm onSubmit={handleSubmit(onSubmit)}>
          <PostTextarea
            placeholder={feedLabels.createPostPlaceholder}
            rows={3}
            {...register('content', { required: true })}
          />

          {isPollEnabled && (
            <div
              style={{
                marginTop: '12px',
                borderTop: '1px solid rgba(148, 163, 184, 0.3)',
                paddingTop: '12px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Poll question (optional)"
                  {...register('pollQuestion')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  placeholder="Option 1"
                  {...register('pollOption1')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  placeholder="Option 2"
                  {...register('pollOption2')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  placeholder="Option 3 (optional)"
                  {...register('pollOption3')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  placeholder="Option 4 (optional)"
                  {...register('pollOption4')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}
                >
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Poll duration
                  </span>
                  <select
                    {...register('pollDurationMinutes', { valueAsNumber: true })}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      fontSize: '12px',
                    }}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={60 * 24}>1 day</option>
                    <option value={60 * 24 * 3}>3 days</option>
                    <option value={60 * 24 * 7}>7 days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {dialogImageUrl && (
            <div style={{ position: 'relative', margin: '10px 0' }}>
              <img
                src={dialogImageUrl}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                }}
              />
              <button
                type="button"
                onClick={() => setDialogImageUrl(undefined)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <X size={20} />
              </button>
            </div>
          )}

          {dialogGifUrl && (
            <div style={{ position: 'relative', margin: '10px 0' }}>
              <img
                src={dialogGifUrl}
                alt="Selected GIF"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                }}
              />
              <button
                type="button"
                onClick={() => setDialogGifUrl(undefined)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <X size={20} />
              </button>
            </div>
          )}
          {dialogVideoUrl && (
            <div style={{ position: 'relative', margin: '10px 0' }}>
              <video
                src={dialogVideoUrl}
                controls
                playsInline
                preload="metadata"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '12px',
                  objectFit: 'contain',
                  backgroundColor: 'rgb(var(--card))',
                  display: 'block',
                }}
              />
              <button
                type="button"
                onClick={() => setDialogVideoUrl(undefined)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <X size={20} />
              </button>
            </div>
          )}

          <PostButtonContainer>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-color, #1d9bf0)',
                }}
                title={feedLabels.addImage}
              >
                <ImageIcon size={20} />
              </button>
              <Popover key="create-post-dialog-emoji">
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-describedby="create-post-dialog-emoji-content"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-color, #1d9bf0)',
                    }}
                    title="Add emoji"
                  >
                    <Smile size={20} />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  id="create-post-dialog-emoji-content"
                  className="!z-[1500] w-auto p-0 border border-border bg-white shadow-xl rounded-2xl"
                >
                  <EmojiPicker
                    onEmojiClick={(emoji) => {
                      const current = getValues('content') || '';
                      setValue('content', `${current}${emoji.emoji}`);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={() => setIsGifPickerOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 10px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-color, #1d9bf0)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title="Add GIF"
              >
                GIF
              </button>
              <button
                type="button"
                onClick={() => setIsPollEnabled((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(var(--accent), 0.55)',
                  background: isPollEnabled
                    ? 'rgba(var(--accent), 0.16)'
                    : 'rgba(var(--accent), 0.04)',
                  color: 'rgb(var(--accent-foreground))',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <BarChart2 size={16} />
                <span>{isPollEnabled ? 'Poll enabled' : 'Add poll'}</span>
              </button>
            </div>
            <PostButton type="submit" disabled={isSubmitting || createPostMutation.isPending}>
              {feedLabels.postButton}
            </PostButton>
          </PostButtonContainer>
        </CreatePostForm>
      </ModalContent>
    </ModalOverlay>
  );
}
