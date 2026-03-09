import { useState } from "react";

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);

    const handleNext = () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            localStorage.setItem('sys_init', 'true');
            onComplete();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-[#0a0a05] border border-primary/40 p-8 max-w-md w-full text-center">
                <h2 className="text-primary font-mono text-xl mb-4 font-bold tracking-widest">
                    {step === 0 ? "SYSTEM_CALIBRATION" : step === 1 ? "NEURAL_LINK_ESTABLISHED" : "READY_FOR_DEPLOYMENT"}
                </h2>
                <p className="text-primary/60 font-mono text-sm mb-8">
                    {step === 0 ? "Welcome to Arkan Core. Please stand by while we calibrate your workspace." : 
                     step === 1 ? "Your neural pathways have been successfully mapped to the system." : 
                     "All systems nominal. You are cleared for operation."}
                </p>
                <button 
                    onClick={handleNext}
                    className="px-6 py-2 bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-black transition-colors font-mono uppercase text-sm tracking-widest"
                >
                    {step < 2 ? "Acknowledge" : "Enter_System"}
                </button>
            </div>
        </div>
    );
}
