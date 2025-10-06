# Setup Instructions

## OpenAI API Configuration

To use the AI features with real OpenAI integration, follow these steps:

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the generated API key (starts with `sk-`)

### 2. Configure Environment Variables

1. Open the `.env` file in the root directory
2. Replace `your_openai_api_key_here` with your actual API key:

```env
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Restart the Development Server

After updating the `.env` file, restart the dev server:

```bash
npm run dev
```

### 4. Test the AI Integration

1. Upload a PDF file
2. Ask a question about the PDF content
3. You should now get real AI responses instead of mock responses

## Cost Considerations

- The app uses GPT-5-mini-2025-08-07 model
- Each query costs approximately $0.0015 - $0.006 depending on document length
- This is GPT-5-mini with advanced capabilities
- Monitor your usage on the [OpenAI Usage Dashboard](https://platform.openai.com/usage)

## Troubleshooting

### "Using mock AI responses" warning
- Check that your `.env` file has the correct API key
- Ensure the key starts with `sk-`
- Restart the dev server after changing the `.env` file

### "Invalid OpenAI API key" error
- Verify the API key is correct and active
- Check your OpenAI account billing status
- Make sure the key has not expired

### "API quota exceeded" error
- Check your OpenAI account billing
- Add payment method if needed
- Review usage limits on your account

## Security Notes

- Never commit your API key to version control
- The `.env` file is already in `.gitignore`
- API keys are only used client-side (consider server-side implementation for production)