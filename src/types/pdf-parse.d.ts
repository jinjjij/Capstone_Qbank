declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(buffer: Buffer): Promise<PDFData>;

  export = pdfParse;
}