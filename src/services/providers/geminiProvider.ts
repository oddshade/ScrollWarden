import { AIProvider, AIProviderConfig, PDFFile, AIResponse, Citation } from '../../types/index.ts';

export const geminiConfig: AIProviderConfig = {
  name: 'Google Gemini',
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  model: 'gemini-2.5-flash',
  maxTokens: 8192,
  temperature: 1
};

/**
 * Constructs a detailed prompt for Gemini to answer questions based on PDF content
 */
function constructGeminiPrompt(question: string, pdfFiles: PDFFile[]): string {
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
7. Format your response using markdown for better readability:
   - Use **bold** for important terms
   - Use bullet points (-) for lists
   - Use ### for section headers when appropriate
   - Use \`code\` for technical terms or specific values
   - Use numbered lists (1.) for step-by-step information

DOCUMENTS:
${documentTexts}

QUESTION: ${question}

Provide your answer followed by the required citation format.`;

  return prompt;
}

/**
 * Parses the Gemini AI response to extract the main content and citation
 */
function parseGeminiResponse(responseText: string): AIResponse {
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
 * Google Gemini API implementation
 */
async function callGeminiAPI(question: string, pdfFiles: PDFFile[], apiKey: string): Promise<AIResponse> {
  const prompt = constructGeminiPrompt(question, pdfFiles);
  
  try {
    const response = await fetch(`${geminiConfig.apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: geminiConfig.temperature,
          maxOutputTokens: geminiConfig.maxTokens,
          topP: 0.8,
          topK: 10
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseText) {
      // Handle potential safety filter blocks
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Response was blocked by Gemini safety filters. Please try rephrasing your question.');
      }
      throw new Error('No response content from Gemini API');
    }

    return parseGeminiResponse(aiResponseText);
  } catch (error) {
    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('403')) {
        throw new Error('Invalid Gemini API key or insufficient permissions. Please check your VITE_GEMINI_API_KEY.');
      } else if (error.message.includes('429')) {
        throw new Error('Gemini API rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('400')) {
        throw new Error('Invalid request to Gemini API. Please check your input.');
      }
    }
    throw error;
  }
}

export const geminiProvider: AIProvider = {
  type: 'gemini',
  config: geminiConfig,
  callAPI: callGeminiAPI
};