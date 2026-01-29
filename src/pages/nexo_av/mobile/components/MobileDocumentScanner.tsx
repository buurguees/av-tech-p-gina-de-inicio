import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, X } from 'lucide-react';
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MobileDocumentScannerProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
  title?: string;
}

const MobileDocumentScanner: React.FC<MobileDocumentScannerProps> = ({ 
  onCapture, 
  onCancel, 
  title = "Escanear Documento" 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara. Revisa los permisos.",
        variant: "destructive",
      });
      onCancel();
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Try to use jscanify dynamically if available
      const JScanify = (await import('jscanify')).default;
      const scanner = new JScanify();
      const resultCanvas = scanner.extractPaper(canvas, canvas.width, canvas.height);
      setCapturedImage(resultCanvas.toDataURL('image/jpeg', 0.8));
    } catch (err) {
      console.error("Error processing document:", err);
      // Fallback: use raw canvas if detection fails
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
      toast({
        title: "Info",
        description: "No se detectaron bordes claros, usando imagen completa.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  const handleConfirm = async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);
      
      // Convert image to PDF
      const { default: jsPDF } = await import('jspdf');
      
      // Create image element to get dimensions
      const img = new Image();
      img.src = capturedImage;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Calculate PDF dimensions maintaining aspect ratio
            const maxWidth = 595; // A4 width in points
            const maxHeight = 842; // A4 height in points
            let imgWidth = img.width;
            let imgHeight = img.height;
            
            // Scale to fit A4 while maintaining aspect ratio
            const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
            imgWidth = imgWidth * ratio;
            imgHeight = imgHeight * ratio;
            
            // Create PDF
            const pdf = new jsPDF({
              orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
              unit: 'pt',
              format: 'a4'
            });
            
            // Add image to PDF (centered)
            const x = (maxWidth - imgWidth) / 2;
            const y = (maxHeight - imgHeight) / 2;
            pdf.addImage(capturedImage, 'JPEG', x, y, imgWidth, imgHeight);
            
            // Convert PDF to blob
            const pdfData = pdf.output('arraybuffer');
            const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
            onCapture(pdfBlob);
            resolve();
          } catch (error) {
            console.error('Error converting to PDF:', error);
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Error loading image'));
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Error",
        description: "Error al convertir a PDF. Intentando con imagen...",
        variant: "destructive",
      });
      // Fallback: convert to blob as is
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => onCapture(blob));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/60 hover:text-white h-8 w-8" 
          onClick={onCancel}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {showGuide && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-full max-w-sm aspect-[1/1.4] border-2 border-dashed border-blue-500/50 rounded-lg relative">
                  <div className="absolute inset-0 bg-blue-500/5" />
                  <div className="absolute -top-10 left-0 right-0 text-center">
                    <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wide bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                      Alinea el documento
                    </span>
                  </div>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </>
        ) : (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={capturedImage}
            className="max-w-full max-h-full object-contain p-4"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 px-6 py-6 bg-black/80 backdrop-blur-md flex items-center justify-center gap-6">
        {!capturedImage ? (
          <Button
            onClick={capture}
            disabled={isProcessing}
            className={cn(
              "h-20 w-20 rounded-full bg-white text-black hover:bg-zinc-200",
              "shadow-xl shadow-white/10 flex items-center justify-center",
              "transition-all duration-200",
              isProcessing && "animate-pulse"
            )}
          >
            <div className={cn(
              "h-16 w-16 rounded-full border-4 border-black/5 flex items-center justify-center",
              !isProcessing && "active:scale-90"
            )}>
              <Camera className="h-8 w-8" />
            </div>
          </Button>
        ) : (
          <div className="flex items-center gap-6">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="h-16 w-16 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-6 w-6" />
            </Button>
            <Button
              onClick={handleConfirm}
              className="h-20 w-20 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
            >
              <Check className="h-8 w-8" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDocumentScanner;
