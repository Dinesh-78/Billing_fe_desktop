import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
} from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream";

const REGION = import.meta.env.VITE_AWS_REGION || "ap-south-1";
const ACCESS_KEY = import.meta.env.VITE_AWS_ACCESS_KEY_ID || "";
const SECRET_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "";

// Native AudioContext approach that handles sample rate conversion automatically
export async function* getAudioStream(mediaStream: MediaStream, onStop: (cb: () => void) => void) {
  // Creating an AudioContext at 16kHz forces the browser to do native high-quality resampling!
  const context = new window.AudioContext({ sampleRate: 16000 });
  const source = context.createMediaStreamSource(mediaStream);
  const processor = context.createScriptProcessor(4096, 1, 1);

  let queue: Int16Array[] = [];
  let resolve: ((val: any) => void) | null = null;
  let isStopped = false;

  onStop(() => {
    isStopped = true;
    if (resolve) resolve(null);
  });

  let chunkCount = 0;
  processor.onaudioprocess = (e) => {
    if (isStopped) return;
    const float32 = e.inputBuffer.getChannelData(0);
    const pcm16 = new Int16Array(float32.length);
    
    let sum = 0;
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (i < 100) sum += Math.abs(float32[i]);
    }
    
    chunkCount++;
    if (chunkCount % 10 === 0) {
      console.log(`AudioStream: Active (Volume avg: ${(sum / 100).toFixed(4)})`);
    }

    queue.push(pcm16);
    if (resolve) {
      resolve(true);
      resolve = null;
    }
  };

  source.connect(processor);
  // Required in many browsers to keep the loop running
  processor.connect(context.destination);

  console.log("AudioStream: Native generator started at 16000Hz.");
  try {
    while (!isStopped) {
      if (queue.length > 0) {
        const pcm16 = queue.shift()!;
        if (pcm16.length > 0) {
          yield {
            AudioEvent: {
              AudioChunk: new Uint8Array(pcm16.buffer),
            },
          };
        }
      } else {
        await new Promise((r) => { resolve = r; });
      }
    }
  } catch (err) {
    console.error("AudioStream generator error:", err);
  } finally {
    console.log("AudioStream: Generator closed. Cleaning up AudioContext.");
    processor.disconnect();
    source.disconnect();
    if (context.state !== 'closed') {
      context.close();
    }
  }
}

export async function streamTranscribe(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (err: any) => void
): Promise<() => void> {
  if (!ACCESS_KEY || !SECRET_KEY) {
    throw new Error("AWS Credentials not configured in .env");
  }

  const client = new TranscribeStreamingClient({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
  });

  // Remove microphone-stream dependency entirely and rely on native APIs.
  // const micStream = new MicrophoneStream();
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  console.log("Mic: MediaStream acquired.");

  let audioStreamStopCb: (() => void) | null = null;
  const onStop = (cb: () => void) => {
    audioStreamStopCb = cb;
  };

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: "en-US",
    MediaEncoding: "pcm",
    MediaSampleRateHertz: 16000, 
    AudioStream: getAudioStream(mediaStream, onStop),
  });

  let isStopped = false;

  const run = async () => {
    console.log("AWS: Starting transcription loop...");
    try {
      const response = await client.send(command);
      console.log("AWS: Connection established, listening for results...");
      
      if (response.TranscriptResultStream) {
        for await (const event of response.TranscriptResultStream) {
          if (isStopped) break;
          
          if (event.TranscriptEvent?.Transcript?.Results) {
            const results = event.TranscriptEvent.Transcript.Results;
            if (results.length > 0) {
              const result = results[0];
              const transcript = result.Alternatives?.[0]?.Transcript || "";
              const isFinal = !result.IsPartial;
              console.log("AWS Transcript:", transcript, "Final:", isFinal);
              onTranscript(transcript, isFinal);
            }
          }
        }
      }
    } catch (err: any) {
      if (!isStopped) {
        let rawError = err.message;
        
        // Attempt to extract the raw AWS response if it's a deserialization error
        if (err.$response) {
          try {
            // Depending on the Node/Browser HTTP implementation, body might be standard text or a stream.
            let bodyStr = "";
            if (typeof err.$response.body === 'string') {
              bodyStr = err.$response.body;
            } else if (err.$response.body && typeof err.$response.body.toString === 'function') {
              bodyStr = err.$response.body.toString();
            } else {
              bodyStr = JSON.stringify(err.$response);
            }
            console.error("Transcribe HIDDEN response:", bodyStr);
            rawError += ` | AWS Response: ${bodyStr}`;
          } catch (e) {
            console.error("Could not parse $response", e);
          }
        }

        console.error("Transcribe error details:", {
          message: err.message,
          code: err.code,
          name: err.name,
          $metadata: err.$metadata
        });
        
        // Pass the raw error back to the UI so we can see what AWS is actually saying
        onError(new Error(rawError));
      }
    }
  };

  run();

  return () => {
    isStopped = true;
    if (audioStreamStopCb) audioStreamStopCb();
    mediaStream.getTracks().forEach((track) => track.stop());
    client.destroy();
  };
}
