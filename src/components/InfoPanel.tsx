import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, Zap, Volume2, Cpu } from "lucide-react";

export const InfoPanel = () => {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 px-4">
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border">
        <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          How It Works
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 mt-1">
              1
            </Badge>
            <div>
              <h4 className="font-medium text-card-foreground mb-1">Connect ESP32</h4>
              <p className="text-xs text-muted-foreground">
                Enter your ESP32's WiFi IP address to establish connection
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30 mt-1">
              2
            </Badge>
            <div>
              <h4 className="font-medium text-card-foreground mb-1">Generate Speech</h4>
              <p className="text-xs text-muted-foreground">
                Text is converted to MP3 using Google Gemini TTS API
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 mt-1">
              3
            </Badge>
            <div>
              <h4 className="font-medium text-card-foreground mb-1">Play Audio</h4>
              <p className="text-xs text-muted-foreground">
                MP3 file is sent to ESP32 and played via DFPlayer Mini
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              WiFi Connection Required
            </div>
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              MP3 Audio Format
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Real-time Processing
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};