import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import lamejs from "https://esm.sh/lamejs@1.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Gemini API key from Supabase secrets
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Get the TTS model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });

    console.log('Converting text to speech:', message);

    // Generate speech from text using correct Gemini TTS API
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: message
        }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore"
            }
          }
        }
      }
    });

    // Get the audio data from the correct path (base64 PCM LINEAR16)
    const audioData = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data as string | undefined;
    
    if (!audioData) {
      throw new Error('No audio data received from Gemini TTS');
    }

    // Convert base64 PCM16 to MP3 using lamejs
    const sampleRate = 24000;
    const channels = 1;

    const base64ToInt16 = (b64: string) => {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const view = new DataView(bytes.buffer);
      const samples = new Int16Array(bytes.length / 2);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = view.getInt16(i * 2, true); // little-endian
      }
      return samples;
    };

    const samples = base64ToInt16(audioData);
    const mp3encoder = new (lamejs as any).Mp3Encoder(channels, sampleRate, 128);
    const maxSamples = 1152;
    const mp3Data: Uint8Array[] = [];

    for (let i = 0; i < samples.length; i += maxSamples) {
      const chunk = samples.subarray(i, i + maxSamples);
      const mp3buf: Uint8Array = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length) mp3Data.push(mp3buf);
    }
    const end = mp3encoder.flush();
    if (end.length) mp3Data.push(end);

    // Concatenate MP3 chunks
    const totalLen = mp3Data.reduce((acc, b) => acc + b.length, 0);
    const mp3Bytes = new Uint8Array(totalLen);
    let offset = 0;
    for (const b of mp3Data) { mp3Bytes.set(b, offset); offset += b.length; }

    // Encode to base64
    let binaryStr = '';
    for (let i = 0; i < mp3Bytes.length; i++) binaryStr += String.fromCharCode(mp3Bytes[i]);
    const mp3Base64 = btoa(binaryStr);

    console.log('Audio generated and encoded to MP3');

    return new Response(
      JSON.stringify({ 
        success: true,
        audio: mp3Base64, // base64-encoded MP3
        encoding: 'MP3',
        sampleRate,
        channels,
        voice: 'Kore'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});