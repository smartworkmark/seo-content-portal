import React from 'react';

// Named React components for feature icons — uppercase names required for Next.js Fast Refresh
export function HyperlocalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ReviewsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5l1.85 3.75L14 5.9l-3 2.92.71 4.13L8 10.94l-3.71 2.01.71-4.13-3-2.92 4.15-.65L8 1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export interface FeatureConfig {
  label: string;
  color: string;
  bgColor: string;
  bgMuted: string;
  borderColor: string;
  Icon: () => React.ReactElement;
}

export const FEATURE_CONFIG: Record<string, FeatureConfig> = {
  hyperlocal: {
    label: 'Hyperlocal',
    color: '#0d9488',
    bgColor: '#ccfbf1',
    bgMuted: '#f0fdfa',
    borderColor: '#99f6e4',
    Icon: HyperlocalIcon,
  },
  reviews: {
    label: 'EEAT',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    bgMuted: '#f5f3ff',
    borderColor: '#c4b5fd',
    Icon: ReviewsIcon,
  },
};
