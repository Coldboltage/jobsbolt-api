export interface PdfParseResult {
  text: string;
  numpages: number;
  numrender: number;
  info: {
    [key: string]: any;
  };
  metadata?: {
    [key: string]: any;
  };
  version?: string;
}
