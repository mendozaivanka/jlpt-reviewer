// Japanese audio through the browser's speech synthesis. Quality depends on the system's Japanese voice.
let voice: SpeechSynthesisVoice | null | undefined;

function pickVoice() {
  if (typeof speechSynthesis === "undefined") return null;
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").startsWith("ja"));
  return vs.find((v) => /premium|enhanced|kyoko|o-ren|google/i.test(v.name)) ?? vs[0] ?? null;
}

export function canSpeak() {
  return typeof speechSynthesis !== "undefined";
}

export function speak(text: string, rate = 0.95) {
  if (!canSpeak()) return;
  if (voice === undefined || voice === null) voice = pickVoice();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = rate;
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

if (canSpeak()) speechSynthesis.addEventListener?.("voiceschanged", () => (voice = pickVoice()));
