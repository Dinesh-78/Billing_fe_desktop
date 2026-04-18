import { OpenRouter } from '@openrouter/sdk';

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

const openRouter = new OpenRouter({
  apiKey: API_KEY,
});

export async function transcribeAudio(blob: Blob): Promise<string> {
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    throw new Error('OpenRouter API Key is not configured. Please set VITE_OPENROUTER_API_KEY in .env file.');
  }

  // Convert blob to base64
  const base64Audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  try {
    const result = await openRouter.chat.send({
      chatRequest: {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please transcribe this audio file. Just give me the transcription, nothing else. If it's a product name, just give the name.",
              },
              {
                type: "input_audio",
                inputAudio: {
                  data: base64Audio,
                  format: "webm", // MediaRecorder in Chrome/Electron uses webm
                },
              },
            ],
          },
        ],
        stream: false,
      }
    });

    // The SDK returns a ChatResult object for non-streaming calls
    const transcript = result.choices?.[0]?.message?.content;
    return transcript || "";
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio. Please check your API key and connection.');
  }
}
