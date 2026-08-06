export interface VisualReference {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  sourceUrl: string;
  source: string;
  alt: string;
}

export interface VisualReferencesState {
  status: 'loading' | 'ready' | 'unavailable';
  references: VisualReference[];
  message?: string;
  query?: string;
  category?: string;
}