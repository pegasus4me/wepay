import { Framework } from "./types";

export const FRAMEWORKS: Framework[] = [
    {
        id: "openclaw",
        name: "OpenClaw",
        description: "SKILL.md-based agent framework",
        envKey: "OPENCLAW_WEPPO_KEY",
        envAgentId: "OPENCLAW_WEPPO_AGENT_ID",
    },
    {
        id: "langchain",
        name: "LangChain",
        description: "Python & JS agent orchestration",
        envKey: "LANGCHAIN_WEPPO_KEY",
        envAgentId: "LANGCHAIN_WEPPO_AGENT_ID",
    },
    {
        id: "autogen",
        name: "AutoGen",
        description: "Multi-agent conversation framework",
        envKey: "AUTOGEN_WEPPO_KEY",
        envAgentId: "AUTOGEN_WEPPO_AGENT_ID",
    },
    {
        id: "custom",
        name: "Custom Agent",
        description: "Any agent using the Weppo SDK",
        envKey: "WEPPO_API_KEY",
        envAgentId: "WEPPO_AGENT_ID",
    },
];
