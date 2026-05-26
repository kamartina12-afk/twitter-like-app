'use client';

import React, { createContext, useContext, useReducer } from 'react';

type ComposerState = {
  files: File[];
  imageUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
};

type ComposerAction =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'CLEAR_FILES' }
  | { type: 'SET_IMAGE_URL'; imageUrl?: string }
  | { type: 'SET_GIF_URL'; gifUrl?: string }
  | { type: 'SET_VIDEO_URL'; videoUrl?: string }
  | { type: 'REMOVE_FILE'; index: number }
  | { type: 'RESET' };

const initialState: ComposerState = {
  files: [],
  imageUrl: undefined,
  gifUrl: undefined,
  videoUrl: undefined,
};

function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.files] };
    case 'CLEAR_FILES':
      return { ...state, files: [] };
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter((_, i) => i !== action.index),
      };
    case 'SET_IMAGE_URL':
      return { ...state, imageUrl: action.imageUrl };
    case 'SET_GIF_URL':
      return { ...state, gifUrl: action.gifUrl };
    case 'SET_VIDEO_URL':
      return { ...state, videoUrl: action.videoUrl };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

type ComposerContextValue = {
  state: ComposerState;
  dispatch: React.Dispatch<ComposerAction>;
};

const ComposerContext = createContext<ComposerContextValue | undefined>(undefined);

export const ComposerProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(composerReducer, initialState);

  return (
    <ComposerContext.Provider value={{ state, dispatch }}>{children}</ComposerContext.Provider>
  );
};

export function useComposer() {
  const context = useContext(ComposerContext);
  if (!context) {
    throw new Error('useComposer must be used within a ComposerProvider');
  }
  return context;
}
