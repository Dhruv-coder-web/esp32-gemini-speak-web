import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mic, Settings, Wifi, Volume2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InfoPanel } from "@/components/InfoPanel";
import esp32HeroImage from "@/assets/esp32-hero.jpg";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type AudioStatus = "idle" | "converting" | "converted" | "sending" | "playing" | "error";

export const VoiceApp = () => {
  const [message, setMessage] = useState("");
  const [esp32Ip, setEsp32Ip] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const handleConnect = async () => {
    if (!esp32Ip.trim()) {
      toast.error("Please enter ESP32 IP address");
      return;
    }

    setConnectionStatus("connecting");
    
    // Simulate connection attempt
    setTimeout(() => {
      // For demo purposes, we'll simulate a successful connection
      setConnectionStatus("connected");
      toast.success("Connected to ESP32");
      setIsSetupOpen(false);
    }, 2000);
  };

  const handleSpeak = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message to speak");
      return;
    }

    if (connectionStatus !== "connected") {
      toast.error("Please connect to ESP32 first");
      return;
    }

    try {
      setAudioStatus("converting");
      toast.info("Converting text to speech...");

      // Helpers: base64 -> bytes
      const base64ToUint8Array = (base64: string) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      };
      // 1) Get audio bytes from Edge Function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { message: message.trim() }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process audio');
      }

      if (!data?.audio) {
        throw new Error(data?.error || 'No audio returned from TTS');
      }

      setAudioStatus("converted");
      toast.success("Audio generated successfully");

      // 2) Build MP3 and upload to ESP32 from the browser (LAN-reachable)
      const mp3Bytes = base64ToUint8Array(data.audio);
      const mp3Blob = new Blob([mp3Bytes], { type: 'audio/mpeg' });

      setAudioStatus("sending");
      toast.info("Sending audio to ESP32...");

      const formData = new FormData();
      formData.append('audio', mp3Blob, 'speech.mp3');

      const uploadResp = await fetch(`http://${esp32Ip.trim()}/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': '*/*' }
      });

      if (!uploadResp.ok) {
        const txt = await uploadResp.text().catch(() => '');
        throw new Error(`ESP32 upload failed: ${uploadResp.status} ${uploadResp.statusText} ${txt}`);
      }

      setAudioStatus("playing");
      toast.success("Audio is now playing on ESP32!");

      setTimeout(() => {
        setAudioStatus("idle");
      }, 3000);

    } catch (error) {
      console.error('TTS Error:', error);
      setAudioStatus("error");
      
      // Provide specific error messages based on the error type
      const errorMessage = error instanceof Error ? error.message : "Failed to process audio";
      
      if (errorMessage.includes('ESP32') || errorMessage.includes('upload')) {
        toast.error("❌ MP3 created but failed to send to ESP32. Check ESP32 IP address.");
      } else if (errorMessage.includes('Gemini') || errorMessage.includes('TTS')) {
        toast.error("❌ Failed to convert text to MP3. Check TTS service.");
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
      
      setTimeout(() => setAudioStatus("idle"), 3000);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      disconnected: { text: "Disconnected", variant: "secondary" as const, icon: Wifi },
      connecting: { text: "Connecting...", variant: "outline" as const, icon: Loader2 },
      connected: { text: "Connected", variant: "success" as const, icon: CheckCircle },
      error: { text: "Connection Error", variant: "destructive" as const, icon: AlertCircle }
    };

    const config = statusConfig[connectionStatus];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${connectionStatus === "connecting" ? "animate-spin" : ""}`} />
        {config.text}
      </Badge>
    );
  };

  const getAudioStatusElement = () => {
    if (audioStatus === "idle") return null;

    const statusConfig = {
      converting: { text: "🔄 Converting to MP3...", color: "text-secondary" },
      converted: { text: "✅ MP3 file ready!", color: "text-accent" },
      sending: { text: "📤 Sending to ESP32...", color: "text-primary" },
      playing: { text: "🔊 Playing audio...", color: "text-accent" },
      error: { text: "❌ Audio error", color: "text-destructive" }
    };

    const config = statusConfig[audioStatus];

    return (
      <div className="flex items-center gap-3 p-4 bg-card/50 rounded-lg border">
        <div className="audio-wave">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center space-y-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-glow animate-pulse-glow">
            <Volume2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            ESP32 Voice Assistant
          </h1>
          <p className="text-muted-foreground mt-2">
            Powered by EchoGlove • Connect your ESP32 device
          </p>
        </div>

        {/* Status & Setup */}
        <div className="flex items-center justify-between mb-6">
          {getStatusBadge()}
          <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">ESP32 Setup</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground mb-2 block">
                    ESP32 IP Address
                  </label>
                  <Input
                    placeholder="192.168.1.100"
                    value={esp32Ip}
                    onChange={(e) => setEsp32Ip(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <Button 
                  onClick={handleConnect} 
                  disabled={connectionStatus === "connecting"}
                  className="w-full bg-gradient-primary hover:bg-gradient-primary/90"
                >
                  {connectionStatus === "connecting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wifi className="mr-2 h-4 w-4" />
                      Connect to ESP32
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Audio Status */}
        {getAudioStatusElement()}

        {/* Main Input */}
        <Card className="p-6 bg-card shadow-card border-border">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 block">
                Message to Speak
              </label>
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-muted border-border resize-none"
                rows={8}
              />
            </div>
            
            <Button 
              onClick={handleSpeak}
              disabled={audioStatus !== "idle" || connectionStatus !== "connected"}
              variant="audio"
              size="lg"
              className="w-full transition-all duration-300 transform hover:scale-105"
            >
              {audioStatus === "idle" ? (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Speak Message
                </>
              ) : (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          Powered by EchoGlove
        </div>
      </div>

      {/* Info Panel */}
      <InfoPanel />
    </div>
  );
};