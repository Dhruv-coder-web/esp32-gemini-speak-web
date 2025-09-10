// This file would typically proxy to the Supabase edge function
// For now, it's a placeholder for the frontend to call

export const textToSpeech = async (message: string, esp32Ip: string) => {
  const response = await fetch('/api/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, esp32Ip })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to process audio');
  }

  return await response.json();
};