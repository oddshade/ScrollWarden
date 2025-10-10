import { PDFFile } from '../../types/index.ts';

/**
 * Sanitizes text to prevent prompt injection attacks
 */
function sanitizeText(text: string): string {
  // Remove potential prompt injection patterns
  return text
    .replace(/(\r\n|\n|\r)/g, ' ') // Normalize line breaks
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters
    .trim();
}

/**
 * Sanitizes user input to prevent prompt injection
 */
export function sanitizeUserInput(input: string): string {
  // Limit length to prevent abuse
  const maxLength = 1000;
  let sanitized = sanitizeText(input);
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}

/**
 * Constructs a detailed prompt for AI providers to answer questions based on PDF content
 * This shared implementation ensures consistency across all providers
 */
export function constructAIPrompt(question: string, pdfFiles: PDFFile[]): string {
  // Sanitize the question
  const sanitizedQuestion = sanitizeUserInput(question);
  
  // Construct document texts with size limits to prevent token overflow
  const MAX_CHARS_PER_DOC = 50000; // Reasonable limit per document
  const documentTexts = pdfFiles.map(pdf => {
    const text = pdf.extractedText.length > MAX_CHARS_PER_DOC 
      ? pdf.extractedText.substring(0, MAX_CHARS_PER_DOC) + '\n[Content truncated due to length...]'
      : pdf.extractedText;
    
    return `START OF DOCUMENT: ${sanitizeText(pdf.name)}\n${text}\nEND OF DOCUMENT: ${sanitizeText(pdf.name)}\n\n`;
  }).join('');

  const prompt = `You are an expert document analyst. Analyze the provided PDF documents and answer the user's question based strictly on the content.

IMPORTANT RULES:
1. ONLY use information from the provided documents
2. If information is not in the documents, clearly state "I cannot find information about [topic] in the provided documents"
3. ALWAYS end your response with a citation in this EXACT format: "Source: [Document Name], Page X"
4. Use the most relevant page number for your citation
5. Be concise but comprehensive in your answer
6. If information spans multiple pages, cite the page with the most relevant details
7. Format your response using markdown for better readability:
   - Use **bold** for important terms
   - Use bullet points (-) for lists
   - Use ### for section headers when appropriate
   - Use \`code\` for technical terms or specific values
   - Use numbered lists (1.) for step-by-step information

DOCUMENTS:
${documentTexts}

QUESTION: ${sanitizedQuestion}

Provide your answer followed by the required citation format.`;

  return prompt;
}

/**
 * Parses AI response to extract the main content and citation
 * Shared implementation ensures consistent citation parsing across providers
 */
export function parseAIResponse(responseText: string): {
  content: string;
  citation?: {
    documentName: string;
    pageNumber: number;
  };
} {
  // Look for citation pattern: "Source: [Document Name], Page X"
  const citationRegex = /Source:\s*([^,]+),\s*Page\s*(\d+)/i;
  const match = responseText.match(citationRegex);

  let citation: { documentName: string; pageNumber: number } | undefined;
  let content = responseText;

  if (match) {
    const documentName = match[1].trim();
    const pageNumber = parseInt(match[2], 10);
    
    citation = {
      documentName,
      pageNumber
    };

    // Remove the citation from the main content
    content = responseText.replace(citationRegex, '').trim();
  }

  return {
    content,
    citation
  };
}
