import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const ENABLE_LOCAL_FALLBACK = process.env.ENABLE_LOCAL_FALLBACK !== "false";
const hasApiKey = Boolean(
  process.env.OPENAI_API_KEY &&
  !process.env.OPENAI_API_KEY.includes("把你的") &&
  !process.env.OPENAI_API_KEY.includes("your_")
);

const openai = hasApiKey
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    })
  : null;

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("模型返回的不是 JSON");
  }
}

function withDelta(stats, key, delta) {
  const value = Number(stats?.[key] ?? 0);
  return value + delta;
}

function createChapter1LocalStory(payload, choice) {
  const key = choice.key || "A";
  const customText = choice.customText || "";
  const customAction = customText
    ? `我照着自己的判断行动：${customText}。`
    : "我没有照着既定选项走，而是选择了更贴合当下局势的做法。";
  const stories = {
    ch1_03_old_water_map_choice: {
      A: "我让利奥把现行图也摊开，两张图在幽蓝灯下并排展开。利奥嘴上抱怨，手却比任何时候都稳，他逐一核对那些被抹去的节点。南七回流井的位置在两张图之间形成一块刺眼的空白，越比对，越能看出有人故意让它从官图上消失。",
      B: "我没有继续扩大动静，而是先把旧图收进防水油纸里。利奥很快明白我的意思，把无关税档重新堆回原位。我们没有得到更多线索，却保住了这张图本身。真正危险的不是找到证据，而是带着证据活到王都。",
      C: "我压低声音追问利奥是否见过这类涂改方式。他一开始想否认，视线却落到图纸边缘那些发黑的潮痕上。片刻后，他判断这种药水不像地方档案室能拿到的东西，更像祭司院封存旧图时使用的洗墨剂。",
      D: `${customAction}利奥被我的决定惊了一下，却没有拆台，只把灯芯拨得更暗。旧图在微光里显得脆弱而危险，我把行动控制在不惊动守夜人的范围内。无论这个做法多冒险，结论都无法回避：南七回流井被人从现行记录中抹掉了。`,
    },
    ch1_07_submit_report_choice: {
      A: "我继续用废井册的流程追问，没有提高声音，也没有让自己显得愤怒。规则被我摆回长案中央，他们一时不能用一句“删掉”把漏洞盖过去。可我也看见祭司兜帽下的下颌绷紧，明白这份谨慎已经让他们记住了我。",
      B: "我低头应下，指尖按住报告边缘，像一个被教条说服的地方官。余光里，艾瑞克翻页的动作慢了一瞬，那一瞬短得几乎无法被旁人察觉，却足够让我确认他听见了“南七回流井”。",
      C: "我示弱地承认可能是地方旧档误录，语气放得平稳而恭顺。祭司没有立刻放松，反而审视着我递过去的报告，像是在判断这份退让是否太过及时。我用最普通的官员礼节承接他的目光。",
      D: `${customAction}长案边的空气骤然收紧，记录官停笔，祭司的视线也随之转向我。我把这个动作收束在官员礼仪能够容纳的范围内。报告上的“南七回流井”仍被迫删去，但艾瑞克与祭司院同时被触动的事实已经留下。`,
    },
    ch1_09_tide_map_choice: {
      A: "我借整理衣袖向前半步，目光从图轴边缘的阴影扫过去。几抹古旧铜色在新金漆下短暂显形，像被仓促盖住的旧伤。祭司杖很快横到我面前，我顺从退回安全距离，却已经确认《平潮图》的边缘近年被人动过。",
      B: "我没有靠近图轴，而是借誊写席的位置远远判断。灯火每一次晃动，右下角的金漆都会露出不自然的厚薄差。这个距离看不清底层纹路，却能避开祭司正面警惕。",
      C: "我转向旁边一位正低声议论的贵族，用最无害的语气提起《平潮图》的修补工艺。对方说到近年王庭曾秘密召工匠入宫时忽然收住话头。那一截被掐断的话，已经把“秘密修补”四个字送到了我手里。",
      D: `${customAction}这个举动让周围的礼节节奏轻微错开，祭司的注意力也随之压来。我没有强行触碰圣物，只把能观察到的细节留在脑中：新漆过亮，旧痕未净，南部水系的终点被处理得过分干净。`,
    },
    ch1_12_blue_note_choice: {
      A: "我没有立刻把纸片内容告诉利奥，只说有人已经盯上了我。利奥听出了我有所保留，却没有逼问。他开始检查门锁与窗缝。我把蓝蜡纸片贴身收好，知道这份隐瞒能暂时把他挡在危险外，也会在我们之间留下新的裂隙。",
      B: "我把纸片递给利奥，让他看清那行古水文。短暂沉默后，他要求明天留在外围接应，又把旧潮门周围的街巷在桌上画出来。告诉他意味着把他拖近危险，但也让我们第一次不再各自承担恐惧。",
      C: "我先检查蓝蜡边缘残留的封印痕迹。银光在指腹下迅速熄灭，没有留下可追踪的方向，只剩一种极细的潮湿冷意。它不像普通贵族能用的传讯术，却也无法直接证明来自艾瑞克。",
      D: `${customAction}纸片上的银光随我的处理渐渐暗下去，房间里只剩利奥压低的呼吸声。我没有得到送信人的名字，却让这条线索以更适合自己的方式留下。真正无法改变的是那行古水文：明日晨钟第三响，旧潮门。`,
    },
  };
  return stories[payload.sceneId]?.[key] || `${customAction}这个选择改变了现场的节奏，也让旁人的反应露出短暂缝隙。我没有急着把线索说破，而是顺着当前局势把风险收束回自己能控制的范围。`;
}

function createLocalChoiceResponse(payload, reason = "local_fallback") {
  const stats = payload.playerStats || {};
  const choice = payload.choice || {};
  const cautious = choice.key === "A" || choice.key === "B";
  const risky = choice.key === "C" || choice.key === "D";

  return {
    story: createChapter1LocalStory(payload, choice),
    newStats: {
      ...stats,
      "证据值": withDelta(stats, "证据值", cautious ? 1 : 2),
      "祭司警惕值": withDelta(stats, "祭司警惕值", risky ? 1 : 0),
      "艾瑞克注意度": withDelta(stats, "艾瑞克注意度", choice.key === "B" ? 1 : 0),
      "女主暴露风险": withDelta(stats, "女主暴露风险", risky ? 1 : 0),
    },
    styleTag: risky ? ["试探", "冒险"] : ["谨慎", "保护同伴"],
    nextHint: reason === "missing_api_key"
      ? "线上接口正在使用本地备用剧情；配置 API key 后可切换为 AI 生成。"
      : "这次选择留下的余波很轻，却足够指向下一处裂缝。",
    fallback: true,
    fallbackReason: reason,
  };
}

function buildPrompts(payload) {
  const statSchema = payload.outputRules?.statSchema || null;
  const statOutputExample = statSchema
    ? JSON.stringify(statSchema, null, 2)
    : `{
    "证据值": 数字,
    "祭司警惕值": 数字,
    "艾瑞克注意度": 数字,
    "女主暴露风险": 数字
  }`;
  const statUpdateRules = statSchema
    ? `【后台状态更新规则】
- newStats 只能包含上面后台状态结构里的字段，不得新增额外字段。
- 字段值必须从对应候选阶段中选择或保持原值。
- 不要把后台状态、关系阶段或玩家风格写进正文。`
    : `【数值更新规则】
- 可以在原数值基础上小幅调整，通常每项 -1 到 +2。
- 如果玩家行动冒险，女主暴露风险或祭司警惕值应提高。
- 如果玩家保护同伴，相关人物信任可提高。`;

  const systemPrompt = `
你是一个西方奇幻互动视觉小说的剧情引擎。
你只负责根据"当前剧情节点 + 玩家选择 + 隐藏数值"生成一小段后续剧情。
必须遵守：
1. 第一视角，"我"是艾莉丝·柯林斯。
2. 以对话和动作推进为主，少用空泛心理总结。
3. 严格遵守 hardLocks，不能提前揭露后续章节。
4. A/B/C 是固定方向，D 是玩家自定义行动；都要根据隐藏数值写出差异。
5. 不要展示数值给玩家。
6. 避免这些表达习惯：不是……而是……；没有……也没有……；他只是/她只是……；像……又像……；连续排比；"眼神复杂/深沉/温柔"等直白词。
7. 如果提供了本地读档上下文，只能用它微调人物态度、玩家风格、线索承接和对话余波；不能因此提前揭露后续章节或改写 hardLocks。
8. 如果玩家选择 D 并提供了自定义输入，story 第一段必须具体承接这个动作的细节或措辞，不能只用"继续观察"、"顺势行动"、"这个选择"等泛称带过。
9. 不要使用"我把某某压成/压进/压下某个动作"这类固定模板，要按 A/B/C 的选项意图或 D 的自定义指令生成具体行为与后果。
10. 输出必须是 JSON，不能有 Markdown，不能有代码块。
`;

  const userPrompt = `
【章节】
${payload.chapterTitle || ""}

【主角】
${payload.protagonist || "艾莉丝·柯林斯"}

【当前场景】
${payload.sceneTitle || ""}
${payload.sceneSummary || ""}

【剧情停止点】
${payload.stopAt || ""}

【选择】
${payload.choice?.key || ""}
${payload.choice?.label || ""}
选择影响说明：${payload.choice?.effect || ""}
玩家自定义输入：${payload.choice?.customText || ""}

【隐藏数值】
${JSON.stringify(payload.playerStats || {}, null, 2)}

【后台状态结构】
${statSchema ? JSON.stringify(statSchema, null, 2) : "使用 Chapter 1 数值。"}

【近期选择】
${JSON.stringify(payload.recentChoices || [], null, 2)}

【本地读档上下文】
${JSON.stringify(payload.saveContext || {previousChapters: []}, null, 2)}

【本节点 AI 上下文】
${JSON.stringify(payload.aiContext || {}, null, 2)}

【输出要求】
返回一个 JSON：
{
  "story": "180-350字剧情正文。要承接当前场景，并把剧情自然收束回主线。",
  "newStats": ${statOutputExample},
  "styleTag": ["谨慎/试探/冒险/借势/保护同伴等，1-3个"],
  "nextHint": "一句轻微余波或线索提示，不要剧透。"
}

${statUpdateRules}
- 当玩家输入**"超出合理边界的行动"（如强行质问NPC、直接夺取证据、跳过线索、强推好感度等）时，严禁直接拒绝玩家（不说"不行"），严禁显示任何系统标签（如"合理/越界"），且必须维持主线结局不崩。请遵循以下"顺应-拦截-补偿-代价-收拢"**的五步法输出纯剧情：
顺应发生（不拒绝）：允许玩家的动作在现场发生，并描写周围人（NPC或贵族）的第一反应（如：谈话慢了半拍、视线投来）。
物理/社交拦截（不给终极答案）：由现场NPC或环境用合乎礼仪、逻辑的方式进行拦截（如：侍从突然挡住、NPC避重就轻），使玩家无法直接达到目的。
隐性细节补偿（给微小线索）：由于对方防御过急，让玩家敏锐地捕捉到一个因防御而暴露的侧面细节（如：虽然被侍从挡住，但看清了他们想藏起的阵法破绽）。
支付隐性代价（增添危机）：描写该冒险举动带来的负面后果（如：暴露了形迹、引起了警惕）。
自然收拢节点（回归主线）：通过NPC一句得体的逐客令或环境的变化，将玩家自然、强制地带回本章既定节点（如：暂时退回宴会原位）。
- 如果玩家行动过界，不要让过界行动成功，要用规则、场景压力或人物反应把它拉回 hardLocks。
`;

  return { systemPrompt, userPrompt };
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = parseBody(req);

    if (!openai) {
      res.status(200).json(createLocalChoiceResponse(payload, "missing_api_key"));
      return;
    }

    const { systemPrompt, userPrompt } = buildPrompts(payload);
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0].message.content || "{}";
    const parsed = safeJsonParse(raw);

    res.status(200).json({
      story: parsed.story || "",
      newStats: parsed.newStats || payload.playerStats || {},
      styleTag: parsed.styleTag || [],
      nextHint: parsed.nextHint || "",
    });
  } catch (error) {
    if (ENABLE_LOCAL_FALLBACK) {
      try {
        res.status(200).json(createLocalChoiceResponse(parseBody(req), "api_error"));
        return;
      } catch {
        // Fall through to the explicit error response.
      }
    }
    res.status(500).json({
      error: "AI generation failed",
      message: error.message,
    });
  }
}
