# PDF Search Tool

A single-page web application that allows users to upload multiple PDF documents, view them within the application, and ask AI-powered questions about their content. The AI provides intelligent answers with clickable citations that navigate directly to the specific pages in the PDFs.

## ✨ Features

- **📚 Multiple PDF Support**: Upload and manage multiple PDF documents simultaneously
- **🔍 AI-Powered Search**: Ask natural language questions about your PDF content
- **📍 Precise Citations**: Get clickable citations that take you directly to the relevant page
- **👁️ High-Performance PDF Viewer**: Custom-built viewer with lazy loading and zoom controls
- **💬 Interactive Chat**: Intuitive chat interface with message history
- **🎨 Modern UI**: Beautiful, responsive design with TailwindCSS
- **⚡ Browser-Based**: No installation required - runs entirely in your browser

## 🚀 Quick Start

### Option 1: Run Locally

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd pdf-search-tool
   ```

2. **Serve the files**
   
   You can use any static file server. Here are a few options:
   
   **Using Python:**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Using Node.js (npx):**
   ```bash
   npx serve .
   ```
   
   **Using Live Server (VS Code extension):**
   - Install the "Live Server" extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

3. **Open in browser**
   
   Navigate to `http://localhost:8000` (or the port your server is using)

### Option 2: Direct File Access

For testing purposes, you can also open `index.html` directly in a modern browser, though some features may be limited due to CORS restrictions.

## 🏗️ Architecture

This application is built with:

- **React 18** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **PDF.js** - PDF rendering and text extraction
- **ES Modules** - Modern module system
- **CDN Dependencies** - No build step required

### Project Structure

```
pdf-search-tool/
├── index.html              # Main HTML file with CDN imports
├── src/
│   ├── main.tsx            # Application entry point
│   ├── App.tsx             # Main application component
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   ├── components/
│   │   ├── PDFManagerSidebar.tsx   # Sidebar with PDF list and upload
│   │   ├── PDFViewer.tsx          # High-performance PDF viewer
│   │   ├── ChatPanel.tsx          # Chat interface
│   │   └── WelcomeScreen.tsx      # Initial upload screen
│   └── services/
│       ├── aiService.ts           # AI integration and response parsing
│       └── pdfProcessor.ts        # PDF text extraction
└── README.md
```

## 🔧 Configuration

### AI Service Setup

The application currently uses mock AI responses for demonstration. To connect to a real AI service:

1. **Open `src/services/aiService.ts`**
2. **Set `shouldUseMock` to `false`** in the `queryAI` function
3. **Add your API credentials** (e.g., OpenAI API key)
4. **Configure the AI provider** in the `AI_CONFIG` object

Example for OpenAI:
```typescript
// Set environment variable or replace with your key
const API_KEY = 'your-openai-api-key-here';

// In callRealAIAPI function, replace:
'Authorization': `Bearer ${API_KEY}`
```

### Supported AI Providers

The architecture supports easy integration with various AI providers:
- OpenAI GPT models
- Anthropic Claude
- Google PaLM
- Other LLM APIs

## 💡 Usage

1. **Upload PDFs**: Drag and drop or click to upload one or more PDF files
2. **Wait for Processing**: The app will extract text from each PDF with page markers
3. **Ask Questions**: Type questions about your PDF content in the chat panel
4. **Get Answers**: Receive AI responses with clickable source citations
5. **Navigate**: Click citations to jump directly to the referenced page in the PDF viewer

## 🎯 Key Features in Detail

### PDF Viewer
- **Lazy Loading**: Pages render only when visible for optimal performance
- **Zoom Controls**: Zoom in/out with percentage display
- **Page Navigation**: Precise programmatic scrolling to specific pages
- **Canvas Rendering**: High-quality PDF rendering using HTML5 Canvas

### Chat Interface
- **Message History**: Persistent conversation with timestamps
- **Citation Buttons**: Clickable citations that navigate to PDF pages
- **Auto-resize Input**: Text area expands as you type
- **Thinking Animation**: Visual feedback during AI processing

### Sidebar Management
- **Collapsible**: Hide/show sidebar with smooth animations
- **Resizable**: Drag to adjust sidebar width
- **File Status**: Visual indicators for processing and error states
- **Drag & Drop**: Upload files by dragging anywhere in the sidebar

## 🔧 Development

### Adding New Features

The modular architecture makes it easy to extend:

1. **New Components**: Add React components in `src/components/`
2. **New Services**: Add service modules in `src/services/`
3. **Type Definitions**: Update types in `src/types/index.ts`
4. **Styling**: Use TailwindCSS classes throughout

### Performance Considerations

- **Lazy Loading**: PDF pages only render when visible
- **Aggressive Pre-loading**: Pages near viewport are pre-rendered
- **Canvas Optimization**: Efficient canvas management for memory usage
- **Text Extraction**: Processes PDFs incrementally with progress feedback

### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **ES Modules**: Requires browsers with ES2020 support
- **PDF.js**: Uses WebAssembly for optimal PDF processing
- **File API**: Requires modern File and ArrayBuffer support

## 🐛 Troubleshooting

### Common Issues

1. **PDFs Not Loading**
   - Ensure PDFs are not password-protected
   - Check browser console for specific error messages
   - Try with a different PDF file

2. **Text Extraction Issues**
   - Some PDFs (especially scanned images) may have limited text
   - The app will show warnings for image-based PDFs
   - Consider using OCR-enabled PDFs

3. **AI Responses Not Working**
   - Check if you've configured the AI service correctly
   - Verify API keys and network connectivity
   - Mock responses work without any configuration

4. **Performance Issues**
   - Try with smaller PDF files first
   - Close other browser tabs to free memory
   - Check if lazy loading is working correctly

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 🙏 Acknowledgments

- **PDF.js** - Mozilla's excellent PDF rendering library
- **React** - The foundation of our UI
- **TailwindCSS** - For beautiful, responsive styling
- **TypeScript** - For robust type safety