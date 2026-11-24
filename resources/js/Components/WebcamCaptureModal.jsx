import React, { useState, useRef, useEffect } from 'react';

export default function WebcamCaptureModal({ isOpen, onClose, onCapture }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [isStartingCamera, setIsStartingCamera] = useState(false);

    // Default to 'environment' (rear camera) on mobile devices so user can photograph the patient
    const isMobileDevice = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const [facingMode, setFacingMode] = useState(isMobileDevice ? 'environment' : 'user');

    useEffect(() => {
        if (isOpen) {
            startCamera(facingMode);
        } else {
            stopCamera();
            setCapturedImage(null);
            setCameraError(null);
        }

        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async (requestedFacingMode = facingMode) => {
        setIsStartingCamera(true);
        setCameraError(null);
        setCapturedImage(null);

        // Check for secure context: WebRTC getUserMedia requires HTTPS or localhost
        const isSecure = typeof window !== 'undefined' && (
            window.isSecureContext ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
        );

        if (!isSecure) {
            setIsStartingCamera(false);
            setCameraError('insecure_context');
            return;
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setIsStartingCamera(false);
            setCameraError('unsupported');
            return;
        }

        try {
            // First attempt with preferred facingMode and resolution
            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: requestedFacingMode },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });
            } catch (strictErr) {
                // Fallback to basic video constraint if strict parameters fail
                console.warn('Strict constraints failed, falling back to basic video:', strictErr);
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
            }

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch((playErr) => console.warn('Video play error:', playErr));
            }
        } catch (err) {
            console.error('Camera access error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraError('permission_denied');
            } else {
                setCameraError('device_error');
            }
        } finally {
            setIsStartingCamera(false);
        }
    };

    const toggleCamera = () => {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        stopCamera();
        startCamera(nextMode);
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const takeSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedImage(dataUrl);
        stopCamera();
    };

    const handleRetake = () => {
        setCapturedImage(null);
        startCamera(facingMode);
    };

    const handleConfirm = () => {
        if (capturedImage) {
            onCapture(capturedImage);
            onClose();
        }
    };

    const handleFileUploadFallback = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    onCapture(event.target.result);
                    onClose();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white font-semibold">
                        <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Patient Photo Capture</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Viewport Area */}
                <div className="p-5">
                    {cameraError ? (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center">
                            <svg className="w-10 h-10 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                                {cameraError === 'insecure_context'
                                    ? 'HTTPS Connection Required for Live Stream'
                                    : (cameraError === 'permission_denied'
                                        ? 'Camera Permission Denied'
                                        : 'Camera Unavailable')}
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mb-4 max-w-sm mx-auto">
                                {cameraError === 'insecure_context'
                                    ? 'Mobile browsers require a secure HTTPS connection for live streaming. Tap the button below to take a photo directly using your phone camera:'
                                    : (cameraError === 'permission_denied'
                                        ? 'Camera permission was denied in browser settings. You can still snap a photo with your mobile camera or upload an image file:'
                                        : 'Unable to connect to camera device. Please snap using your mobile camera or choose an image file:')}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2.5 justify-center items-center">
                                {/* Direct Native Mobile Camera Capture */}
                                <label className="w-full sm:w-auto cursor-pointer px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg inline-flex items-center justify-center transition shadow-xs">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Snap with Mobile Camera
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleFileUploadFallback}
                                    />
                                </label>

                                <label className="w-full sm:w-auto cursor-pointer px-3.5 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg inline-flex items-center justify-center transition">
                                    <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Choose Photo File
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handleFileUploadFallback}
                                    />
                                </label>

                                {cameraError !== 'insecure_context' && (
                                    <button
                                        type="button"
                                        onClick={() => startCamera(facingMode)}
                                        className="w-full sm:w-auto px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                            {capturedImage ? (
                                <img
                                    src={capturedImage}
                                    alt="Captured Snapshot"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    {isStartingCamera && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs">
                                            <svg className="w-5 h-5 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Initializing camera...
                                        </div>
                                    )}

                                    {/* Camera Switch / Flip Button for multi-camera devices */}
                                    {!isStartingCamera && (
                                        <div className="absolute top-3 right-3 z-10">
                                            <button
                                                type="button"
                                                onClick={toggleCamera}
                                                className="px-2.5 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-[11px] font-semibold backdrop-blur-xs flex items-center gap-1 shadow-xs transition"
                                                title={`Switch to ${facingMode === 'environment' ? 'front (selfie)' : 'rear (patient)'} camera`}
                                            >
                                                <span>🔄</span>
                                                <span>{facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Capture Guide Overlay */}
                                    <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                                        <span className="text-[10px] text-white/70 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs">
                                            Align Patient Face Inside Frame
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Hidden Canvas for rasterization */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center space-x-2">
                        {capturedImage ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleRetake}
                                    className="inline-flex items-center px-3.5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition"
                                >
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Retake
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                                >
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Use Photo
                                </button>
                            </>
                        ) : (
                            !cameraError && (
                                <button
                                    type="button"
                                    onClick={takeSnapshot}
                                    disabled={isStartingCamera}
                                    className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                                >
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Take Snapshot
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
