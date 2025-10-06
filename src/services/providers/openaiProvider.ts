import { AIProvider, AIProviderConfig, PDFFile, AIResponse, Citation } from '../../types/index.ts';

export const openaiConfig: AIProviderConfig = {
  name: 'OpenAI GPT',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini-2024-07-18', // Updated to a valid model name
  maxTokens: 120000,
  temperature: 1
};

/**
 * Constructs a detailed prompt for OpenAI to answer questions based on PDF content
 */
function constructOpenAIPrompt(question: string, pdfFiles: PDFFile[]): string {
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
 * OpenAI API implementation
 */
async function callOpenAIAPI(question: string, pdfFiles: PDFFile[], apiKey: string): Promise<AIResponse> {
  const prompt = constructOpenAIPrompt(question, pdfFiles);
  
  try {
    const response = await fetch(openaiConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: openaiConfig.model,
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
        max_tokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature
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

export const openaiProvider: AIProvider = {
  type: 'openai',
  config: openaiConfig,
  callAPI: callOpenAIAPI
};