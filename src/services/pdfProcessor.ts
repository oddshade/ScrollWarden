import { PDFDocumentProxy, PDFPageProxy } from '../types/index.ts';

export interface ProcessedPDFData {
  totalPages: number;
  extractedText: string;
}

/**
 * Extracts text from a single PDF page
 */
async function extractPageText(page: PDFPageProxy, pageNumber: number): Promise<string> {
  try {
    const textContent = await page.getTextContent();
    const textItems = textContent.items;
    
    // Combine all text items on the page
    const pageText = textItems
      .map((item: any) => item.str || '')
      .join(' ')
      .trim();
    
    // Add page marker at the beginning of each page's content
    return `[Page ${pageNumber}]\n${pageText}\n\n`;
  } catch (error) {
    console.error(`Error extracting text from page ${pageNumber}:`, error);
    return `[Page ${pageNumber}]\n[Error: Could not extract text from this page]\n\n`;
  }
}

/**
 * Processes a PDF file and extracts all text content with page markers
 */
export async function processPDFFile(file: File): Promise<ProcessedPDFData> {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Please provide a PDF file.');
  }

  try {
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load the PDF document using pdf.js
    const pdfDocument = await window.pdfjsLib.getDocument(uint8Array).promise;
    const totalPages = pdfDocument.numPages;

    if (totalPages === 0) {
      throw new Error('PDF file appears to be empty or corrupted.');
    }

    let extractedText = '';

    // Process each page sequentially to maintain order
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const pageText = await extractPageText(page, pageNumber);
        extractedText += pageText;
      } catch (error) {
        console.error(`Error processing page ${pageNumber}:`, error);
        // Continue with other pages even if one fails
        extractedText += `[Page ${pageNumber}]\n[Error: Could not process this page]\n\n`;
      }
    }

    // Clean up the extracted text
    extractedText = cleanExtractedText(extractedText);

    return {
      totalPages,
      extractedText
    };

  } catch (error) {
    console.error('Error processing PDF file:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid PDF file format.');
      } else if (error.message.includes('password')) {
        throw new Error('Password-protected PDFs are not supported.');
      } else {
        throw new Error(`Failed to process PDF: ${error.message}`);
      }
    } else {
      throw new Error('An unknown error occurred while processing the PDF.');
    }
  }
}

/**
 * Cleans and normalizes the extracted text
 */
function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove excessive line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Validates if the extracted text seems reasonable
 */
function validateExtractedText(text: string, totalPages: number): boolean {
  // Basic validation checks
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Check if we have page markers
  const pageMarkerCount = (text.match(/\[Page \d+\]/g) || []).length;
  if (pageMarkerCount !== totalPages) {
    console.warn(`Expected ${totalPages} page markers, found ${pageMarkerCount}`);
  }

  // Check for minimum text per page ratio (very lenient)
  const averageTextPerPage = text.length / totalPages;
  if (averageTextPerPage < 10) {
    console.warn('Very little text extracted per page, PDF might be image-based');
  }

  return true;
}

/**
 * Extracts metadata from the PDF (optional utility function)
 */
export async function extractPDFMetadata(file: File): Promise<{
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdfDocument = await window.pdfjsLib.getDocument(uint8Array).promise;
    
    const metadata = await pdfDocument.getMetadata();
    return {
      title: metadata.info?.Title,
      author: metadata.info?.Author,
      subject: metadata.info?.Subject,
      creator: metadata.info?.Creator,
      producer: metadata.info?.Producer,
      creationDate: metadata.info?.CreationDate,
      modificationDate: metadata.info?.ModDate
    };
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    return {};
  }
}

/**
 * Utility function to estimate reading time based on extracted text
 */
export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Utility function to search for specific text within the extracted content
 */
export function searchInPDFText(text: string, query: string): Array<{
  pageNumber: number;
  context: string;
  matchIndex: number;
}> {
  const results: Array<{ pageNumber: number; context: string; matchIndex: number }> = [];
  const pageRegex = /\[Page (\d+)\]\n(.*?)(?=\[Page \d+\]|\n\n|$)/gs;
  
  let match;
  while ((match = pageRegex.exec(text)) !== null) {
    const pageNumber = parseInt(match[1], 10);
    const pageContent = match[2];
    
    const queryIndex = pageContent.toLowerCase().indexOf(query.toLowerCase());
    if (queryIndex !== -1) {
      // Extract context around the match (50 characters before and after)
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(pageContent.length, queryIndex + query.length + 50);
      const context = pageContent.substring(start, end);
      
      results.push({
        pageNumber,
        context: start > 0 ? '...' + context : context,
        matchIndex: queryIndex
      });
    }
  }
  
  return results;
}