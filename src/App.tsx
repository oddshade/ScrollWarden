import React, { useState, useCallback, useRef } from 'react';
import { 
  PDFFile, 
  ChatMessage, 
  Citation, 
  AppState, 
  OnPDFUpload, 
  OnChatSubmit, 
  OnCitationClick, 
  OnPDFSelect,
  OnPDFRemove,
  OnClearAllPDFs,
  OnSidebarResize,
  OnSidebarToggle 
} from './types/index.ts';
import { PDFManagerSidebar } from './components/PDFManagerSidebar.tsx';
import { PDFViewer } from './components/PDFViewer.tsx';
import { ChatPanel } from './components/ChatPanel.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import { processPDFFile } from './services/pdfProcessor.ts';
import { queryAI } from './services/aiService.ts';

const INITIAL_SIDEBAR_WIDTH = 320;

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    pdfFiles: [],
    activePdfId: null,
    chatHistory: [],
    isAiThinking: false,
    sidebarCollapsed: false,
    sidebarWidth: INITIAL_SIDEBAR_WIDTH,
    error: null
  });

  const nextMessageId = useRef(1);
  const nextPdfId = useRef(1);

  const generateMessageId = (): string => {
    return `msg_${nextMessageId.current++}`;
  };

  const generatePdfId = (): string => {
    return `pdf_${nextPdfId.current++}`;
  };

  // Handle PDF file uploads
  const handlePDFUpload: OnPDFUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Create initial PDF file objects
    const newPDFs: PDFFile[] = fileArray.map(file => ({
      id: generatePdfId(),
      name: file.name,
      file,
      pages: 0,
      extractedText: '',
      isProcessing: true,
      error: undefined
    }));

    // Add PDFs to state immediately to show loading state
    setAppState(prev => ({
      ...prev,
      pdfFiles: [...prev.pdfFiles, ...newPDFs],
      activePdfId: prev.activePdfId || newPDFs[0]?.id || null,
      error: null
    }));

    // Process each PDF file
    for (const pdfFile of newPDFs) {
      try {
        const processedData = await processPDFFile(pdfFile.file);
        
        setAppState(prev => ({
          ...prev,
          pdfFiles: prev.pdfFiles.map(pdf => 
            pdf.id === pdfFile.id 
              ? {
                  ...pdf,
                  pages: processedData.totalPages,
                  extractedText: processedData.extractedText,
                  isProcessing: false
                }
              : pdf
          )
        }));
      } catch (error) {
        console.error('Error processing PDF:', error);
        setAppState(prev => ({
          ...prev,
          pdfFiles: prev.pdfFiles.map(pdf => 
            pdf.id === pdfFile.id 
              ? {
                  ...pdf,
                  isProcessing: false,
                  error: error instanceof Error ? error.message : 'Failed to process PDF'
                }
              : pdf
          )
        }));
      }
    }
  }, []);

  // Handle chat message submission
  const handleChatSubmit: OnChatSubmit = useCallback(async (message: string) => {
    if (!message.trim() || appState.isAiThinking) return;

    // Check if we have any processed PDFs
    const processedPDFs = appState.pdfFiles.filter(pdf => !pdf.isProcessing && !pdf.error);
    if (processedPDFs.length === 0) {
      setAppState(prev => ({
        ...prev,
        error: 'Please upload and wait for PDFs to be processed before asking questions.'
      }));
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    setAppState(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory, userMessage],
      isAiThinking: true,
      error: null
    }));

    try {
      // Query AI with all processed PDFs
      const aiResponse = await queryAI(message.trim(), processedPDFs);
      
      // Add AI response
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        citation: aiResponse.citation
      };

      setAppState(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, assistantMessage],
        isAiThinking: false
      }));
    } catch (error) {
      console.error('Error querying AI:', error);
      
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };

      setAppState(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, errorMessage],
        isAiThinking: false,
        error: error instanceof Error ? error.message : 'AI service error'
      }));
    }
  }, [appState.pdfFiles, appState.isAiThinking]);

  // Handle citation clicks
  const handleCitationClick: OnCitationClick = useCallback((citation: Citation) => {
    // Find the PDF file that matches the citation
    const targetPdf = appState.pdfFiles.find(pdf => pdf.name === citation.documentName);
    
    if (targetPdf) {
      setAppState(prev => ({
        ...prev,
        activePdfId: targetPdf.id
      }));
      
      // The PDF viewer will handle scrolling to the specific page
      // We'll pass the page number through a callback or ref
    }
  }, [appState.pdfFiles]);

  // Handle PDF selection in sidebar
  const handlePDFSelect: OnPDFSelect = useCallback((pdfId: string) => {
    setAppState(prev => ({
      ...prev,
      activePdfId: pdfId
    }));
  }, []);

  // Handle PDF removal from sidebar
  const handlePDFRemove: OnPDFRemove = useCallback((pdfId: string) => {
    setAppState(prev => {
      const updatedPdfFiles = prev.pdfFiles.filter(pdf => pdf.id !== pdfId);
      let newActivePdfId = prev.activePdfId;
      
      // If we're removing the currently active PDF, select another one or set to null
      if (prev.activePdfId === pdfId) {
        newActivePdfId = updatedPdfFiles.length > 0 ? updatedPdfFiles[0].id : null;
      }
      
      return {
        ...prev,
        pdfFiles: updatedPdfFiles,
        activePdfId: newActivePdfId
      };
    });
  }, []);

  // Handle clearing all PDFs
  const handleClearAllPDFs = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      pdfFiles: [],
      activePdfId: null,
      chatHistory: [] // Also clear chat history when clearing all PDFs
    }));
  }, []);

  // Handle sidebar resizing
  const handleSidebarResize: OnSidebarResize = useCallback((width: number) => {
    setAppState(prev => ({
      ...prev,
      sidebarWidth: Math.max(200, Math.min(600, width))
    }));
  }, []);

  // Handle sidebar toggle
  const handleSidebarToggle: OnSidebarToggle = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed
    }));
  }, []);

  // Get active PDF
  const activePdf = appState.pdfFiles.find(pdf => pdf.id === appState.activePdfId);

  // Check if we have any PDFs
  const hasPDFs = appState.pdfFiles.length > 0;
  const hasProcessedPDFs = appState.pdfFiles.some(pdf => !pdf.isProcessing && !pdf.error);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <PDFManagerSidebar
        pdfFiles={appState.pdfFiles}
        activePdfId={appState.activePdfId}
        collapsed={appState.sidebarCollapsed}
        width={appState.sidebarWidth}
        onPDFUpload={handlePDFUpload}
        onPDFSelect={handlePDFSelect}
        onPDFRemove={handlePDFRemove}
        onClearAll={handleClearAllPDFs}
        onResize={handleSidebarResize}
        onToggle={handleSidebarToggle}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {!hasPDFs ? (
          /* Welcome Screen */
          <WelcomeScreen onPDFUpload={handlePDFUpload} />
        ) : (
          <div className="flex-1 flex h-full min-h-0">
            {/* PDF Viewer */}
            <div className="flex-1 bg-white border-r border-gray-200 h-full min-h-0">
              {activePdf ? (
                <PDFViewer 
                  pdfFile={activePdf}
                  targetPage={
                    // Find the most recent citation page to scroll to
                    appState.chatHistory
                      .slice()
                      .reverse()
                      .find(msg => msg.citation?.documentName === activePdf.name)
                      ?.citation?.pageNumber
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-lg">Select a PDF from the sidebar to view</p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <div className="w-96 bg-white h-full min-h-0">
              <ChatPanel
                messages={appState.chatHistory}
                isAiThinking={appState.isAiThinking}
                canSubmit={hasProcessedPDFs}
                onSubmit={handleChatSubmit}
                onCitationClick={handleCitationClick}
              />
            </div>
          </div>
        )}

        {/* Error Toast */}
        {appState.error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <span>{appState.error}</span>
              <button
                onClick={() => setAppState(prev => ({ ...prev, error: null }))}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;