// Every claim here was checked against the project's own README on GitHub
// (github.com/antonyjasfer/<repo>, 2026-11-10). Unfinished work is described
// as status, not as a result. Fields:
//   id, t (title), w (where/when), repo, d (description), s (status),
//   k (skills; these become the light nodes of the graph), live?, featured?
export const PROJECTS = [
  {
    id: "arbiter", t: "Arbiter", w: "PayPal AI Hackathon, Nov 2026", repo: "arbiter", featured: true,
    d: "Freelance work gets paid when evidence shows it was delivered. AI turns a client's brief into milestones with testable acceptance criteria, both parties approve and lock the exact version, and the AI can never move money. Checks will run on a fresh GitHub Actions runner with no secrets.",
    s: "Agreements phase working with a two-click demo. Verification and payments are in progress. PayPal sandbox only.",
    k: ["TypeScript", "React", "PayPal API", "GitHub Actions", "Playwright", "LLM agents"],
  },
  {
    id: "bp", t: "Robust Belief Propagation", w: "Research with Dr. S. Raja, 2026",
    repo: "Budget-Coupled-Robust-Belief-Propagation-for-Visual-Hallucination-Detection",
    d: "Probability intervals for vision-language model claims, from exact belief propagation and an adversary with a limited budget over tree graphical models.",
    s: "Inference engine built and tested. No empirical findings yet; evaluation on human-labelled claims is next.",
    k: ["Python", "Probabilistic models", "PyTorch", "VLMs"],
  },
  {
    id: "visca", t: "VISCA BARCA", w: "More Than a Hack 2027, Barça Innovation Hub", repo: "VISCA-BARCA-mtah2027", featured: true,
    d: "A possession label for every frame of FC Barcelona vs Athletic Club from automatic tracking, with no training and no hand labels: control events from player and ball co-movement, decoded with a three-state Viterbi.",
    s: "Phase 1 entry with a technical report.",
    k: ["Python", "Sports analytics", "Probabilistic models"],
  },
  {
    id: "ledgerguard", t: "LedgerGuard", w: "Amazon Developer Hackathon, Alexa+ track", repo: "ledgerguard", featured: true,
    d: "A voice accounts-payable agent for Alexa+ and Amazon Bedrock that checks invoice maths and duplicate payments, with an Argon2 audit vault and a streamable HTTP MCP server.",
    s: "Hackathon build.",
    k: ["Python", "AWS Bedrock", "MCP", "LLM agents"],
  },
  {
    id: "preflight", t: "strands-bedrock-preflight", w: "Open-source Python package", repo: "strands-bedrock-preflight",
    d: "A small MIT-licensed utility that catches Bedrock model-access errors before a Strands agent fails at runtime.",
    s: "Open source with unit tests.",
    k: ["Python", "AWS Bedrock", "Open source"],
  },
  {
    id: "papertrail", t: "PaperTrail AI", w: "All Things Agentic Hackathon 2026", repo: "papertrail",
    d: "An agent that extracts, forensically checks and seals financial documents, giving deterministic answers instead of guessed invoice numbers.",
    s: "Hackathon build.",
    k: ["Python", "FastAPI", "Gemini", "LLM agents"],
  },
  {
    id: "legallens", t: "LegalLens", w: "AI for Legal Assistance challenge", repo: "legallens", featured: true,
    d: "Reads contracts and links every claim to the page and clause it came from. With no evidence, it says so instead of answering confidently, and it points out what the document leaves out.",
    s: "Challenge build.",
    k: ["Python", "RAG", "Gemini"],
  },
  {
    id: "clairs", t: "CLAIRS", w: "OpenEnv reinforcement learning environment", repo: "CLAIRS-Autonomous-Defense",
    d: "An environment where an LLM agent defends an IoT network from DDoS attacks, with a traffic simulator that reacts to each block or rate-limit decision.",
    s: "Hackathon build.",
    k: ["Python", "Reinforcement learning", "LLM agents"],
  },
  {
    id: "nexus", t: "NEXUS", w: "AMD Developer Hackathon 2026", repo: "nexus-ct-match", featured: true,
    d: "Three LangGraph agents match patients to clinical trials with explainable reasoning, running Llama 3.1 70B on vLLM on an AMD MI300X.",
    s: "Hackathon build.",
    k: ["Python", "LangGraph", "vLLM", "LLM agents"],
  },
  {
    id: "stadiumiq", t: "StadiumIQ", w: "FIFA World Cup 2026 fan assistant", repo: "StadiumIQ",
    d: "Chat, navigation and crowd alerts for fans at MetLife Stadium, built on Next.js and Cloud Run with NVIDIA NIM and Firestore.",
    s: "Hackathon build.",
    k: ["TypeScript", "Next.js", "Cloud Run", "Firestore"],
  },
  {
    id: "lumina", t: "Lumina", w: "Stadium concierge for Chepauk", repo: "lumina-chepauk", featured: true,
    live: "https://lumina-chepauk.vercel.app",
    d: "Simulates crowd telemetry for 23 stands at M.A. Chidambaram Stadium and has Gemini route IPL fans away from crowded stalls.",
    s: "Live demo online.",
    k: ["JavaScript", "React", "Gemini"],
  },
  {
    id: "vote", t: "VOTE", w: "PromptWars Challenge 2", repo: "vote-assistant",
    d: "Walks Indian voters through the election process with a seven-phase timeline and Gemini answers. 203 tests, and it targets WCAG 2.1 AA.",
    s: "Challenge build.",
    k: ["React", "Gemini", "Cloud Run"],
  },
  {
    id: "gsoc", t: "Quantum circuits with LLMs", w: "GSoC 2026 evaluation tasks, ML4SCI", repo: "GSOC-2026-ML4SCI-Tasks",
    d: "A PyTorch CNN baseline, PennyLane quantum circuits and Gemini working together in one evaluation notebook.",
    s: "Application tasks completed.",
    k: ["Python", "PyTorch", "PennyLane", "Gemini"],
  },
  {
    id: "f1", t: "F1-Strategy-Net", w: "Personal project", repo: "F1-Strategy-Net",
    d: "LSTM and gradient boosting on Formula 1 telemetry to estimate tyre life and pit-stop windows.",
    s: "Notebook project.",
    k: ["Python", "TensorFlow", "Sports analytics"],
  },
  {
    id: "nba", t: "NBA Accreditation Assistant", w: "IBM watsonx.ai", repo: "NBA-Accreditation-Assistant-RAG",
    d: "A retrieval-augmented assistant that answers faculty questions from official NBA accreditation documents, with sources.",
    s: "Course project.",
    k: ["RAG", "watsonx"],
  },
  {
    id: "swynex", t: "SWYNEX cloud internship", w: "SWYNEX Technologies, 2026", repo: "SWYNEX-Final-Cloud-Deployment",
    live: "https://antonyjasfer.github.io/SWYNEX-Final-Cloud-Deployment/",
    d: "Four tasks: a cloud architecture outline, a GitHub Pages deployment, monitoring and cost notes, and a final case study tying them together.",
    s: "Internship tasks submitted.",
    k: ["Cloud", "GitHub Actions"],
  },
  {
    id: "arenapulse", t: "ArenaPulse", w: "Real-time sports media platform", repo: "arenapulse",
    d: "Live tactical data over Socket.io with an Express and Prisma API and a React front end animated with GSAP.",
    s: "Side project.",
    k: ["TypeScript", "React", "Node.js"],
  },
  {
    id: "ecotrack", t: "EcoTrack", w: "Carbon footprint tracker", repo: "Carbon-Footprint-Awareness-Platform",
    d: "Tracks daily CO₂ with Chart.js dashboards and a canvas world that grows or wilts with your score.",
    s: "Side project.",
    k: ["JavaScript"],
  },
];

export const FEATURED = PROJECTS.filter((p) => p.featured);
export const repoUrl = (p) => `https://github.com/antonyjasfer/${p.repo}`;
