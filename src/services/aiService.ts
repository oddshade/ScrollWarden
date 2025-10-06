import { PDFFile, AIResponse, Citation } from '../types/index.ts';

// Configuration for the AI service
const AI_CONFIG = {
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini', // Using GPT-4o-mini for better performance and cost
  maxTokens: 1500,
  temperature: 0.1
};

/**
 * Constructs a detailed prompt for the AI to answer questions based on PDF content
 */
function constructPrompt(question: string, pdfFiles: PDFFile[]): string {
  const documentTexts = pdfFiles.map(pdf => {
    return `START OF DOCUMENT: ${pdf.name}\n${pdf.extractedText}\nEND OF DOCUMENT: ${pdf.name}\n\n`;
  }).join('');

  const prompt = `You are an expert document analyst. Analyze the provided PDF documents and answer the user's question based strictly on the content.

IMPORTANT RULES:
1. ONLY use information from the provided documents
2. If information is not in the documents, clearly state "I cannot find information about [topic] in the provided documents"
3. ALWAYS end your response with a citation in this EXACT format: "Source: [Document Name], Page X"
4. Use the most relevant page number for your citation
5. Be concise but comprehensive in your answer
6. If information spans multiple pages, cite the page with the most relevant details

DOCUMENTS:
${documentTexts}

QUESTION: ${question}

Provide your answer followed by the required citation format.`;

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

    // Check if we have an API key
    const rawApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    // Clean the API key of any null characters or whitespace
    const apiKey = rawApiKey ? rawApiKey.replace(/\u0000/g, '').trim() : '';
    const shouldUseMock = !apiKey || apiKey === 'your_openai_api_key_here' || !apiKey.startsWith('sk-');
    
    if (shouldUseMock) {
      console.warn('Using mock AI responses. Set VITE_OPENAI_API_KEY in .env file to use real OpenAI API.');
      return createMockAIResponse(question, validPDFs);
    }

    // Use real AI API
    return await callRealAIAPI(question, validPDFs, apiKey);

  } catch (error) {
    console.error('Error querying AI:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get AI response');
  }
}

/**
 * Real AI API implementation using OpenAI
 */
async function callRealAIAPI(question: string, pdfFiles: PDFFile[], apiKey: string): Promise<AIResponse> {
  const prompt = constructPrompt(question, pdfFiles);
  
  try {
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful document analyst. You analyze PDF documents and answer questions based strictly on their content. Always provide citations in the exact format: "Source: [Document Name], Page X"'
          },
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    const aiResponseText = data.choices?.[0]?.message?.content;

    if (!aiResponseText) {
      throw new Error('No response content from OpenAI API');
    }

    return parseAIResponse(aiResponseText);
  } catch (error) {
    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('401')) {
        throw new Error('Invalid OpenAI API key. Please check your VITE_OPENAI_API_KEY in the .env file.');
      } else if (error.message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your account billing.');
      }
    }
    throw error;
  }
}

/**
 * Alternative AI providers can be easily added here
 * For example, Anthropic's Claude, Google's PaLM, etc.
 */

export { AI_CONFIG };