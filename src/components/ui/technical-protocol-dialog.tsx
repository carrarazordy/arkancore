import { useState, useEffect } from "react";
import { useDialogStore } from "@/store/useDialogStore";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { Terminal } from "lucide-react";

export function TechnicalProtocolDialog() {
    const { isOpen, options, closeDialog } = useDialogStore();
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (isOpen) {
            setInputValue("");
            ArkanAudio.playFast('system_engage');
        }
    }, [isOpen]);

    if (!isOpen || !options) return null;

    const handleConfirm = async () => {
        ArkanAudio.playFast('confirm');
        await options.onConfirm(inputValue);
        closeDialog();
    };

    const handleCancel = () => {
        ArkanAudio.playFast('clack');
        closeDialog();
    };

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0a0a05] border-2 border-primary/40 shadow-[0_0_40px_rgba(249,249,6,0.15)] max-w-md w-full p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
                    <div className="h-full bg-primary animate-pulse w-1/3"></div>
                </div>
                
                <div className="flex items-center gap-3 mb-2 border-b border-primary/20 pb-4">
                    <Terminal className="h-5 w-5 text-primary" />
                    <h2 className="text-primary font-mono font-bold tracking-widest uppercase text-sm">
                        {options.title}
                    </h2>
                </div>

                {options.description && (
                    <p className="text-[10px] text-primary/40 font-mono uppercase tracking-widest mb-6">
                        {options.description}
                    </p>
                )}

                {!options.hideInput && (
                    <div className="mb-6">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={options.placeholder || "INPUT_DATA..."}
                            className="w-full bg-black border border-primary/30 p-3 text-primary font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-primary/20"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                                if (e.key === 'Escape') handleCancel();
                            }}
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 border border-primary/20 text-primary/60 hover:text-primary hover:border-primary/50 font-mono text-xs uppercase tracking-widest transition-all"
                    >
                        ABORT
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-black font-mono text-xs font-bold uppercase tracking-widest transition-all"
                    >
                        {options.confirmLabel || "EXECUTE"}
                    </button>
                </div>
            </div>
        </div>
    );
}
