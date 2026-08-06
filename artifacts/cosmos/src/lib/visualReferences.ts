export interface VisualReference {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  sourceUrl: string;
  source: string;
  alt: string;
  confidence?: number;
  sourceTier?: 1 | 2 | 3;
  width?: number;
  height?: number;
}

export interface VisualReferencesState {
  status: 'loading' | 'ready' | 'unavailable';
  references: VisualReference[];
  message?: string;
  query?: string;
  category?: string;
  confidence?: number;
}