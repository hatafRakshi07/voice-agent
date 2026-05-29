import WhisperTraining from "@/components/WhisperTraining";

export const metadata = {
  title: "Training — VoiceAgent",
  description: "Fine-tune Whisper for custom language or accent support",
};

export default function TrainingPage() {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
      <div className="max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl font-bold text-white">Whisper Fine-tuning</h1>
        <p className="text-sm text-slate-500 mb-6">
          Adapt the built-in Whisper STT model to your language, accent, or domain vocabulary.
          Training runs entirely on your hardware — no data is sent externally.
        </p>
        <WhisperTraining />
      </div>
    </main>
  );
}
