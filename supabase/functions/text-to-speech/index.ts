import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

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
    const { message, esp32Ip } = await req.json();
    
    if (!message || !esp32Ip) {
      return new Response(
        JSON.stringify({ error: 'Message and ESP32 IP are required' }),
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

    // Get the audio data from the correct path
    const audioData = result.response.candidates[0].content.parts[0].inlineData.data;
    
    if (!audioData) {
      throw new Error('No audio data received from Gemini TTS');
    }

    console.log('Audio generated successfully, sending to ESP32:', esp32Ip);

    // Send MP3 file to ESP32
    const formData = new FormData();
    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
    formData.append('audio', audioBlob, 'speech.mp3');

    const esp32Response = await fetch(`http://${esp32Ip}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': '*/*',
      }
    });

    if (!esp32Response.ok) {
      throw new Error(`ESP32 upload failed: ${esp32Response.status} ${esp32Response.statusText}`);
    }

    console.log('Audio successfully sent to ESP32');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Audio converted and sent to ESP32 successfully' 
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