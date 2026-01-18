import React, { useRef, useEffect, useState, useCallback } from 'react';
import JScanify from 'jscanify';
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentScannerProps {
    onCapture: (blob: Blob) => void;
    onCancel: () => void;
    title?: string;
}

const scanner = new JScanify();

const DocumentScanner: React.FC<DocumentScannerProps> = ({ onCapture, onCancel, title = "Escanear Documento" }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showGuide, setShowGuide] = useState(true);

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
            toast.error("No se pudo acceder a la cámara. Revisa los permisos.");
            onCancel();
        }
    };

    useEffect(() => {
        startCamera();
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const capture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || isProcessing) return;

        setIsProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas dimensions to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            // Use jscanify to detect and extract paper
            const resultCanvas = scanner.extractPaper(canvas, canvas.width, canvas.height);
            setCapturedImage(resultCanvas.toDataURL('image/jpeg', 0.8));
        } catch (err) {
            console.error("Error processing document:", err);
            // Fallback: use raw canvas if detection fails
            setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
            toast.info("No se detectaron bordes claros, usando imagen completa.");
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing]);

    const handleConfirm = () => {
        if (!capturedImage) return;

        // Convert base64 to blob
        fetch(capturedImage)
            .then(res => res.blob())
            .then(blob => onCapture(blob));
    };

    const handleRetry = () => {
        setCapturedImage(null);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="p-6 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-white/10">
                <h2 className="text-white font-black uppercase tracking-widest text-xs">{title}</h2>
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-white" onClick={onCancel}>
                    <X className="h-6 w-6" />
                </Button>
            </div>

            <div className="flex-1 relative overflow-hidden bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {showGuide && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                                <div className="w-full aspect-[1/1.4] border-2 border-dashed border-blue-500/50 rounded-lg relative">
                                    <div className="absolute inset-0 bg-blue-500/5" />
                                    <div className="absolute -top-12 left-0 right-0 text-center">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">Alinea el documento</span>
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
                        className="max-w-full max-h-full object-contain p-4 shadow-2xl"
                    />
                )}
            </div>

            <div className="p-8 bg-black/80 backdrop-blur-md flex items-center justify-center gap-6">
                {!capturedImage ? (
                    <Button
                        onClick={capture}
                        disabled={isProcessing}
                        className="h-20 w-20 rounded-full bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/10 flex items-center justify-center group"
                    >
                        <div className={cn(
                            "h-16 w-16 rounded-full border-4 border-black/5 flex items-center justify-center transition-all",
                            isProcessing ? "animate-pulse" : "group-active:scale-90"
                        )}>
                            <Camera className="h-8 w-8" />
                        </div>
                    </Button>
                ) : (
                    <div className="flex items-center gap-8">
                        <Button
                            onClick={handleRetry}
                            variant="outline"
                            className="h-16 w-16 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
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

export default DocumentScanner;
