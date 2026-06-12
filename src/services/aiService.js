import { detectStoryStage } from "./detectStoryStage.js";

function getStageGuidance(stage, mode) {
  const guidance = {
    beginning: {
      generate: `This is still early in the story. Focus on world-building, introducing/developing characters, establishing relationships, and setting up situations. Do NOT introduce the story's central/major conflict yet, and do NOT move toward any resolution. Keep stakes relatively small and exploratory.`,
      brainstorm: `This is still early in the story. Suggest ideas that build the world, introduce or develop characters, plant small hints/foreshadowing, or create minor situations/tensions. Do NOT suggest the central/major conflict yet, and do NOT suggest anything related to the ending or final resolution.`
    },
    middle: {
      generate: `The story is in its middle part. You may escalate tension, deepen conflicts already established, add complications, or develop character relationships further. Avoid resolving the main conflict or moving toward the ending yet — keep things developing rather than concluding.`,
      brainstorm: `The story is in its middle part. Suggest ideas that escalate existing tension, add complications, deepen character conflicts, or introduce twists that raise the stakes. Avoid suggestions that resolve the main conflict or that read as an ending.`
    },
    ending: {
      generate: `The story is approaching its ending. You may build toward climax, resolve conflicts, and bring character arcs to a close. It is now appropriate to move toward resolution.`,
      brainstorm: `The story is approaching its ending. Suggest ideas for the climax, resolution of open plot threads, and closure for character arcs.`
    }
  };

  const stageKey = guidance[stage] ? stage : "middle";
  return guidance[stageKey][mode];
}

export async function generateContinuation(context) {
  // context = {
  //   mode: "generate" | "brainstorm",
  //   length: "short" | "medium",   // only relevant for "generate" mode
  //   synopsis: string,
  //   lastParagraphs: string,
  //   characters: [{ name, role, personality }],
  //   plotThreads: [{ description }],
  //   selectedIdea: string | null,
  //   storyStage: "beginning" | "middle" | "ending" | null,  // manual override, optional
  //   currentOrder: number | null,    // current chapter order, used for auto-detect
  //   totalChapters: number | null    // estimated total chapters, used for auto-detect
  // }

  // Use manual override if provided, otherwise auto-detect from chapter position
  const storyStage = context.storyStage || detectStoryStage(context.currentOrder, context.totalChapters);

  try {
    let systemPrompt = "";

    if (context.mode === "brainstorm") {
      systemPrompt = `You are a creative writing consultant.
Your task is to brainstorm ideas for what should happen next in the story based on the synopsis, characters, open plot threads, and the last paragraphs.

CRITICAL INSTRUCTIONS:
1. Provide 3 to 5 distinct, actionable plot recommendations or events.
2. Focus on plot twists, character actions, conflicts, or world-building elements that fit the current narrative.
3. Where relevant, reference the characters and open plot threads provided.
4. DO NOT just write dialogue. Give high-level ideas of WHAT should be added to the story.
5. Match the language of the prompt (if the context is in Indonesian, reply in Indonesian).
6. Format your output as a simple numbered list without meta-commentary.

STORY STAGE: ${storyStage}
${getStageGuidance(storyStage, "brainstorm")}`;
    } else {
      systemPrompt = `You are an expert creative writing co-author.
Your task is to seamlessly continue the story from the exact point where the user left off.

CRITICAL INSTRUCTIONS:
1. STRICTLY MATCH THE FORMAT: If the previous text uses a script/chat format (e.g., "Name : dialogue"), you MUST continue using that exact "Name : dialogue" format. If they use standard novel paragraphs, use standard paragraphs. If it's a Prologue or Description, match that specific narrative style.
2. STRICTLY MATCH THE LANGUAGE & TONE: You must continue in the exact same language and dialect. If the text uses casual Indonesian (Bahasa gaul, e.g., "lu", "gimana", "emang"), use casual Indonesian. If it uses formal Indonesian, use formal. If English, use English.
3. STAY CONSISTENT with the characters and open plot threads provided. Do not contradict established personality traits or resolve a plot thread unless it makes narrative sense to do so now.
4. If an "Idea to incorporate" is provided, weave it naturally into the continuation.
5. DO NOT repeat the last sentences. Pick up exactly where the story stopped and move it forward logically based on the synopsis.
6. DO NOT add any meta-commentary, greetings, or quotes around the output. Output ONLY the pure story continuation.
7. Length guidance: write approximately ${context.length === "medium" ? "2-3 paragraphs" : "1 paragraph"}.

STORY STAGE: ${storyStage}
${getStageGuidance(storyStage, "generate")}`;
    }

    const charactersText = context.characters?.length
      ? context.characters.map(c => `- ${c.name} (${c.role}): ${c.personality}`).join("\n")
      : "-";

    const plotThreadsText = context.plotThreads?.length
      ? context.plotThreads.map(p => `- ${p.description}`).join("\n")
      : "-";

    const ideaText = context.selectedIdea
      ? `\nIdea to incorporate: ${context.selectedIdea}\n`
      : "";

    const userContext = `Synopsis: ${context.synopsis}

Characters:
${charactersText}

Open plot threads:
${plotThreadsText}
${ideaText}
--- PREVIOUS TEXT TO CONTINUE FROM ---
${context.lastParagraphs}
---------------------------------------`;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemPrompt,
        userContext,
        mode: context.mode || "generate",
        length: context.length || "short"
      })
    });

    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data.result) {
      throw new Error("Backend response did not contain a result");
    }

    return data.result;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Gagal terhubung ke AI. Pastikan backend berjalan dan API key NVIDIA sudah diset.");
  }
}