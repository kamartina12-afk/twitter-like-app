import type { MediaType } from 'expo-image-picker';

/** Images only — avoids deprecated `MediaTypeOptions` (use string `MediaType` values). */
export const IMAGE_MEDIA_TYPES: MediaType[] = ['images'];
