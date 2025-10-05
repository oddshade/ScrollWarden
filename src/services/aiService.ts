import { PDFFile, AIResponse, Citation } from '../types/index.js';

// Configuration for the AI service
const AI_CONFIG = {
  // You can modify this to use different AI providers
  // For now, we'll create a simple structure that can be easily extended
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-3.5-turbo',
  maxTokens: 1000,
  temperature: 0.1
};

/**
 * Constructs a detailed prompt for the AI to answer questions based on PDF content
 */
function constructPrompt(question: string, pdfFiles: PDFFile[]): string {
  const documentTexts = pdfFiles.map(pdf => {
    return `START OF DOCUMENT: ${pdf.name}\n${pdf.extractedText}\nEND OF DOCUMENT: ${pdf.name}\n\n`;
  }).join('');

  const prompt = `You are an expert document analyst. Your role is to answer questions based ONLY on the provided document content. You must follow these rules strictly:

1. Only answer based on the information contained in the provided documents
2. If you cannot find relevant information in the documents, say so clearly
3. Always provide a citation for your answer using the exact format: "Source: [Document Name], Page X"
4. Be precise and accurate in your citations
5. If information spans multiple pages, cite the most relevant page

Here are the documents to analyze:

${documentTexts}

Question: ${question}

Please provide a clear, accurate answer based on the document content, followed by a citation in the format "Source: [Document Name], Page X". If you cannot answer based on the provided documents, explain why.`;

  return prompt;
}

/**
 * Parses the AI response to extract the main content and citation
 */
function parseAIResponse(responseText: string): AIResponse {
  // Look for citation pattern: "Source: [Document Name], Page X"
  const citationRegex = /Source:\s*([^,]+),\s*Page\s*(\d+)/i;
  const match = responseText.match(citationRegex);

  let citation: Citation | undefined;
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

/**
 * Mock AI response for development/demo purposes
 * In a real implementation, replace this with actual AI API calls
 */
function createMockAIResponse(question: string, pdfFiles: PDFFile[]): AIResponse {
  // Simulate processing time
  const responses = [
    {
      content: "Based on the documents provided, I can see that this relates to the content you're asking about. The information suggests that the key points are outlined in the document structure.",
      citation: {
        documentName: pdfFiles[0]?.name || 'document.pdf',
        pageNumber: Math.floor(Math.random() * 10) + 1
      }
    },
    {
      content: "The document indicates that this topic is discussed in detail. The relevant section covers the main aspects of your question with supporting information.",
      citation: {
        documentName: pdfFiles[Math.floor(Math.random() * pdfFiles.length)]?.name || 'document.pdf',
        pageNumber: Math.floor(Math.random() * 20) + 1
      }
    },
    {
      content: "According to the provided documents, the information you're looking for can be found in the specified section. The document provides comprehensive coverage of this topic.",
      citation: {
        documentName: pdfFiles[0]?.name || 'document.pdf',
        pageNumber: Math.floor(Math.random() * 15) + 1
      }
    }
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Main function to query the AI with a question and PDF content
 */
export async function queryAI(question: string, pdfFiles: PDFFile[]): Promise<AIResponse> {
  // Validate inputs
  if (!question.trim()) {
    throw new Error('Question cannot be empty');
  }

  if (pdfFiles.length === 0) {
    throw new Error('No PDF files provided');
  }

  // Filter out PDFs that are still processing or have errors
  const validPDFs = pdfFiles.filter(pdf => !pdf.isProcessing && !pdf.error && pdf.extractedText);

  if (validPDFs.length === 0) {
    throw new Error('No processed PDF files available');
  }

  try {
    // For development purposes, we'll use a mock response
    // In production, you would replace this with actual AI API calls
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    // Check if we should return a mock response or make a real API call
    const shouldUseMock = true; // Set to false when you have API credentials
    
    if (shouldUseMock) {
      return createMockAIResponse(question, validPDFs);
    }

    // Real AI API implementation would go here:
    return await callRealAIAPI(question, validPDFs);

  } catch (error) {
    console.error('Error querying AI:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get AI response');
  }
}

/**
 * Real AI API implementation (currently commented out for demo purposes)
 * Uncomment and configure when you have API credentials
 */
async function callRealAIAPI(question: string, pdfFiles: PDFFile[]): Promise<AIResponse> {
  const prompt = constructPrompt(question, pdfFiles);
  
  const response = await fetch(AI_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // You'll need to set this
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const aiResponseText = data.choices?.[0]?.message?.content;

  if (!aiResponseText) {
    throw new Error('No response from AI');
  }

  return parseAIResponse(aiResponseText);
}

/**
 * Alternative AI providers can be easily added here
 * For example, Anthropic's Claude, Google's PaLM, etc.
 */

export { AI_CONFIG };