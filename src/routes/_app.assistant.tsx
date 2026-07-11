import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Image as ImageIcon, Sparkles, Languages, StopCircle, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant · Monsoon Copilot" }] }),
  component: Assistant,
});

type Msg = { id: string; role: "user" | "ai"; text: string };

const suggestions = [
  "Is it safe to travel to Andheri tonight?",
  "Build my monsoon emergency kit",
  "Nearest shelter to my location?",
  "What to do during waterlogging?",
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "0", role: "ai", text: "Hi! I'm your Monsoon Copilot. Ask me anything — weather, safety, routes, or SOS. I speak 12 Indian languages." },
  ]);
  const [input, setInput] = useState("");
  const [lang, setLang] = useState("English");
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    
    const userMsgId = crypto.randomUUID();
    const currentMessages = [...messages, { id: userMsgId, role: "user" as const, text }];
    setMessages(currentMessages);
    setInput("");
    setSending(true);

    try {
      // Map message history payload for LangChain/Groq endpoint
      const historyPayload = currentMessages.map(m => ({
        role: m.role === "ai" ? "assistant" as const : "user" as const,
        text: m.text
      }));

      const res = await api.chat.send(historyPayload, lang);
      
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", text: res.text }
      ]);
    } catch (err: any) {
      toast.error("Could not communicate with AI Copilot.");
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", text: "I'm having trouble connecting to my models right now. Please check your internet or retry later." }
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col p-6 lg:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="gradient-hero flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Groq Llama · RAG · Voice · Vision</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="glass border-white/60"
          onClick={() => setLang(lang === "English" ? "Hindi" : "English")}>
          <Languages className="mr-1.5 h-3.5 w-3.5" /> {lang}
        </Button>
      </div>

      <div className="glass flex-1 space-y-4 overflow-y-auto rounded-3xl p-6">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${
                  m.role === "user" ? "gradient-hero text-white shadow-elegant" : "bg-white/70"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-white/70 flex items-center gap-2">
                <CloudRain className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Llama is thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Badge key={s} variant="outline" onClick={() => send(s)}
            className="cursor-pointer glass border-white/60 py-1.5 text-xs hover:shadow-elegant">
            {s}
          </Badge>
        ))}
      </div>

      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <Button type="button" size="icon" variant="outline" className="glass border-white/60 shrink-0"
          onClick={() => toast.info("Vision Upload: Attach a hazard photo in the Community Tab to analyze with Gemini Vision!")}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="outline"
          className={`shrink-0 ${listening ? "gradient-hero border-0 text-white" : "glass border-white/60"}`}
          onClick={() => { setListening(!listening); toast.info(listening ? "Voice stopped" : "Listening… (AssemblyAI / ElevenLabs SDK stubs initialized)"); }}>
          {listening ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask in ${lang}…`}
          className="glass h-11 border-white/60"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()} className="gradient-hero h-11 w-11 border-0 text-white shadow-elegant shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
