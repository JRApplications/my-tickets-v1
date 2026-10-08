import { createOpenAI, openai as wixOpenai } from "@wix/ai";
import type { LanguageModel } from "ai";
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { createOpenAI as createOpenAIProvider } from "@ai-sdk/openai";
import { MY_TICKETS_ACCOUNT_AI_API_KEY} from 'astro:env/server'
 
type Provider = "wix" | "account" | "chatgpt";
const use: Provider = "wix" as Provider;

export const openAiClient = async (model: string): Promise<LanguageModel> => {


    if (!model) {
        throw new Error("Model is required");
    }

    if (use === "wix") {
        const client = wixOpenai(model);

        if (!client) {
            throw new Error(`Unable to initialize Wix OpenAI model: ${model}`);
        }

        return client;
    }

    if (use === "account") {
        const wixClient = createClient({
            auth: ApiKeyStrategy({
                apiKey: MY_TICKETS_AI_ACCOUNT_API_KEY,
                siteId: "a309b26b-b488-4417-a8e6-56ed6a4e45af"

            }),
        });

        const openai = createOpenAI({
            client: wixClient,
        });

        const client = openai(model);

        if (!client) {
            throw new Error(`Unable to initialize OpenAI model: ${model}`);
        }

        return client;
    } else if (use === "chatgpt") {
        const openai = createOpenAIProvider({
            apiKey: "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",
        });

        return openai(model);
    }
    throw new Error(`Unsupported client type: ${use}`);

};
