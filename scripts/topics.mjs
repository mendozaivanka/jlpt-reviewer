// Groups words into the six course themes, following Sou Matome's vocabulary order.
// Words are matched by keywords in their English meaning. Words that match nothing are grouped by part of speech,
// like Sou Matome's last week (adverbs, compound words, verbs with many meanings).
// To move a word by hand, add it to content/topic-overrides.json as { "<written form>": "<subtopic name>" }.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const kw = (s) => new RegExp(`\\b(${s.trim().split(/\s+/).join("|")})\\b`, "gi");

export const themes = [
  {
    id: 1, name: "Home life", ja: "家の生活",
    subs: ["Kitchen and cooking", "Cleaning and laundry", "House and things", "Family and pets"],
  },
  {
    id: 2, name: "Going out", ja: "出かける",
    subs: ["Trains and travel", "Cars and roads", "Town and errands", "Plans and time"],
  },
  {
    id: 3, name: "Days off", ja: "休みの日",
    subs: ["Shopping and money", "Eating out", "Leisure and fun", "Clothes and looks"],
  },
  {
    id: 4, name: "Study and work", ja: "勉強と仕事",
    subs: ["School and study", "Work and company", "Phones, mail and news", "Society and nature"],
  },
  {
    id: 5, name: "Expressing yourself", ja: "いろいろな表現",
    subs: ["People and relations", "Body and health", "Feelings and character", "Describing things"],
  },
  {
    id: 6, name: "Learning together", ja: "まとめて覚える",
    subs: ["Adverbs and degree", "Connecting words", "Everyday verbs", "Useful words"],
  },
];

const rules = [
  ["Kitchen and cooking", kw("cook cooking boil bake fry roast kitchen dish dishes plate bowl pot pan knife slice taste salt sugar oil vegetable vegetables meat fish egg rice bread soup fruit meal breakfast lunch dinner recipe ingredient refrigerator fridge stove chopsticks cup glass bottle sauce flavor flavour sweet bitter spicy sour peel")],
  ["Cleaning and laundry", kw("clean cleaning wash washing laundry dirt dirty dust sweep wipe tidy garbage trash rubbish towel soap iron fold stain mess")],
  ["House and things", kw("house home room door window floor ceiling wall roof stairs furniture table desk chair shelf drawer bed curtain lamp light switch key lock box bag tool apartment garden yard bath bathroom toilet")],
  ["Family and pets", kw("family parent parents father mother child children baby son daughter husband wife brother sister grandfather grandmother grandchild relative relatives married marry marriage wedding pet dog cat bird raise")],
  ["Trains and travel", kw("train station platform ticket fare subway railway transfer express seat passenger travel trip tour journey hotel luggage airport plane flight ship boat abroad overseas passport departure depart arrival arrive")],
  ["Cars and roads", kw("car drive driving driver road street traffic signal crossing bridge corner parking bicycle bike bus taxi speed direction map route distance")],
  ["Town and errands", kw("town city village building shop store bank post hospital library police address neighborhood neighbourhood area district place errand queue crowd crowded")],
  ["Plans and time", kw("plan plans schedule appointment reservation reserve promise meet wait late early delay time hour minute week month year morning evening night today tomorrow yesterday weekend holiday date calendar deadline period season")],
  ["Shopping and money", kw("buy sell shopping price cheap expensive money yen pay payment cost receipt discount sale cash wallet purse spend save savings order deliver delivery goods product item")],
  ["Eating out", kw("restaurant eat drink alcohol beer sake wine coffee tea juice menu serve waiter delicious tasty hungry thirsty party feast treat")],
  ["Leisure and fun", kw("play game sport sports hobby music song sing dance movie film photo photograph camera novel concert festival event swim ski team match win lose ball fun enjoy")],
  ["Clothes and looks", kw("clothes clothing wear shirt skirt trousers pants shoes hat coat dress button pocket size fashion style colour color pattern ring glasses makeup hair")],
  ["School and study", kw("school study student teacher class lesson lecture university college exam examination test grade score homework report research subject science mathematics history language word sentence grammar meaning question answer explain explanation learn knowledge textbook notebook pencil pen paper graduate graduation")],
  ["Work and company", kw("work job company office business employ employee employment boss staff colleague salary wage conference project document contract customer client manager president industry factory production trade economy interview career retire retirement")],
  ["Phones, mail and news", kw("computer internet email mail letter message phone telephone call send receive print copy data file screen program machine electric electricity information news newspaper magazine broadcast")],
  ["Society and nature", kw("society social rule law government politics political nation national country public citizen vote election tax problem crime safety danger dangerous environment nature weather rain snow wind temperature earthquake fire disaster sky sea mountain river tree flower")],
  ["People and relations", kw("friend person people man woman human relationship acquaintance partner lover guest visitor member group introduce introduction greet greeting thank thanks apologize apology polite rude")],
  ["Body and health", kw("body head face eye eyes ear nose mouth tooth teeth hand arm leg foot feet back stomach heart blood bone skin health healthy sick ill illness disease fever pain hurt injury injure medicine doctor nurse tired sleep breath breathe cough")],
  ["Feelings and character", kw("feel feeling happy sad angry anger afraid fear scared surprise surprised worry worried anxious lonely glad pleased shy embarrassed proud jealous envy love hate dislike kind gentle strict serious honest lazy cheerful calm nervous mood emotion character personality tears cry laugh smile")],
  ["Describing things", kw("big small large wide narrow long short high low heavy hard soft thick thin bright dark quiet noisy loud beautiful pretty ugly strange odd unusual ordinary usual simple complicated easy difficult convenient inconvenient important necessary enough same different similar new old young fresh round square sharp")],
];

const subToTheme = new Map(themes.flatMap((t) => t.subs.map((s) => [s, t.id])));

const overridesPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "content", "topic-overrides.json");
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};

export function classify(word) {
  let topic = overrides[word.w];
  if (!topic) {
    let best = null, bestScore = 0;
    for (const [sub, re] of rules) {
      const score = (word.m.match(re) ?? []).length * 2 + ((word.gl ?? "").match(re) ?? []).length;
      if (score > bestScore) { best = sub; bestScore = score; }
    }
    topic = best;
  }
  if (!topic) {
    const pos = word.pos.join(" ");
    if (/\badv\b|adv-to/.test(pos)) topic = "Adverbs and degree";
    else if (/\bconj\b|\bexp\b|\bprt\b/.test(pos)) topic = "Connecting words";
    else if (/\bv[15]|\bvs|\bvk|\bvz/.test(pos)) topic = "Everyday verbs";
    else if (/adj/.test(pos)) topic = "Describing things";
    else topic = "Useful words";
  }
  return { topic, theme: subToTheme.get(topic) ?? 6 };
}
