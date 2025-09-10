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

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type AudioStatus = "idle" | "converting" | "sending" | "playing" | "error";

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

      // Call Supabase edge function for TTS conversion and ESP32 upload
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          esp32Ip: esp32Ip.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process audio');
      }

      setAudioStatus("sending");
      toast.info("Sending audio to ESP32...");

      // Small delay to show sending status
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAudioStatus("playing");
      toast.success("Audio is now playing on ESP32!");

      // Reset status after "playback"
      setTimeout(() => {
        setAudioStatus("idle");
      }, 3000);

    } catch (error) {
      console.error('TTS Error:', error);
      setAudioStatus("error");
      toast.error(error instanceof Error ? error.message : "Failed to process audio");
      setTimeout(() => setAudioStatus("idle"), 2000);
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
      converting: { text: "Converting to speech...", color: "text-secondary" },
      sending: { text: "Sending to ESP32...", color: "text-primary" },
      playing: { text: "Playing audio...", color: "text-accent" },
      error: { text: "Audio error", color: "text-destructive" }
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
          Powered by Google Gemini TTS
        </div>
      </div>

      {/* Info Panel */}
      <InfoPanel />
    </div>
  );
};