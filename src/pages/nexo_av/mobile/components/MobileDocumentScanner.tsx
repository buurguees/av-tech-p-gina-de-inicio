import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, X, Loader2 } from 'lucide-react';
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
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Initialize jscanify scanner
  useEffect(() => {
    const initScanner = async () => {
      try {
        const JScanify = (await import('jscanify')).default;
        scannerRef.current = new JScanify();
        setScannerReady(true);
      } catch (err) {
        console.error("Error initializing jscanify:", err);
        setScannerReady(true); // Continue without scanner
      }
    };
    initScanner();
  }, []);

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

  // Real-time document detection
  const detectDocument = useCallback(() => {
    if (!videoRef.current || !overlayCanvasRef.current || !scannerRef.current || capturedImage) {
      return;
    }

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) {
      animationFrameRef.current = requestAnimationFrame(detectDocument);
      return;
    }

    // Match overlay canvas to video dimensions
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    try {
      // Draw video frame to detect corners
      ctx.drawImage(video, 0, 0);
      
      // Try to find document corners
      const corners = scannerRef.current.findPaperContour(ctx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height));
      
      // Clear canvas
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      
      if (corners && corners.length === 4) {
        setDocumentDetected(true);
        
        // Draw detected document outline
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw corner points
        ctx.fillStyle = '#22c55e';
        corners.forEach((corner: { x: number; y: number }) => {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 12, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        setDocumentDetected(false);
      }
    } catch (err) {
      // Silent fail for detection
    }

    animationFrameRef.current = requestAnimationFrame(detectDocument);
  }, [capturedImage]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Start detection loop when video is ready
  useEffect(() => {
    if (stream && scannerReady && !capturedImage) {
      const video = videoRef.current;
      if (video) {
        video.onloadedmetadata = () => {
          detectDocument();
        };
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream, scannerReady, capturedImage, detectDocument]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    
    // Stop detection loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

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
      if (scannerRef.current) {
        // Extract and crop the document using jscanify
        const resultCanvas = scannerRef.current.extractPaper(canvas, canvas.width, canvas.height);
        setCapturedImage(resultCanvas.toDataURL('image/jpeg', 0.9));
        toast({
          title: "Documento escaneado",
          description: "Confirma para guardar. Es obligatorio para el control de gastos.",
        });
      } else {
        throw new Error("Scanner not available");
      }
    } catch (err) {
      console.error("Error processing document:", err);
      // Fallback: use raw canvas if detection fails
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
      toast({
        title: "Info",
        description: "No se detectaron bordes, usando imagen completa.",
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
            const pdfWidth = 595; // A4 width in points
            const pdfHeight = 842; // A4 height in points
            
            let imgWidth = img.width;
            let imgHeight = img.height;
            
            // Scale to fit A4 while maintaining aspect ratio
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            imgWidth = imgWidth * ratio;
            imgHeight = imgHeight * ratio;
            
            // Create PDF (portrait for documents)
            const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'pt',
              format: 'a4'
            });
            
            // Add image to PDF (centered)
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;
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
        description: "Error al convertir a PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    // Restart detection
    setTimeout(() => {
      detectDocument();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-semibold text-sm">{title}</h2>
          {!capturedImage && documentDetected && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              Documento detectado
            </span>
          )}
        </div>
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
              muted
              className="w-full h-full object-cover"
            />
            {/* Overlay canvas for document detection */}
            <canvas 
              ref={overlayCanvasRef} 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            {/* Guide when no document detected */}
            {!documentDetected && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-full max-w-sm aspect-[1/1.4] border-2 border-dashed border-white/30 rounded-lg relative">
                  <div className="absolute inset-0 bg-white/5" />
                  <div className="absolute -top-10 left-0 right-0 text-center">
                    <span className="text-[10px] font-medium text-white/70 uppercase tracking-wide bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                      Coloca el documento dentro del marco
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
      <div className="flex-shrink-0 px-6 py-6 bg-black/80 backdrop-blur-md flex flex-col items-center gap-4">
        {!capturedImage ? (
          <>
            <Button
              onClick={capture}
              disabled={isProcessing}
              className={cn(
                "h-20 w-20 rounded-full bg-white text-black hover:bg-zinc-200",
                "shadow-xl shadow-white/10 flex items-center justify-center",
                "transition-all duration-200",
                isProcessing && "animate-pulse",
                documentDetected && "ring-4 ring-green-500/50"
              )}
            >
              <div className={cn(
                "h-16 w-16 rounded-full border-4 border-black/5 flex items-center justify-center",
                !isProcessing && "active:scale-90"
              )}>
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Camera className="h-8 w-8" />
                )}
              </div>
            </Button>
            <p className="text-white/60 text-xs text-center">
              {documentDetected 
                ? "Documento detectado. Pulsa para escanear."
                : "Alinea el documento y pulsa para escanear"}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-6">
            <Button
              onClick={handleRetry}
              variant="outline"
              disabled={isProcessing}
              className="h-16 w-16 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-6 w-6" />
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="h-20 w-20 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
            >
              {isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Check className="h-8 w-8" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDocumentScanner;
