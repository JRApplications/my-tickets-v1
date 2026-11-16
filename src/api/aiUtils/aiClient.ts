import { createOpenAI, openai as wixOpenai } from "@wix/ai";
import type { LanguageModel } from "ai";
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { requireServerEnv } from '../../config/server-env';
const MY_TICKETS_ACCOUNT_AI_API_KEY = requireServerEnv('MY_TICKETS_ACCOUNT_AI_API_KEY');
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
                apiKey: MY_TICKETS_ACCOUNT_AI_API_KEY,
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
    }
    throw new Error(`Unsupported client type: ${use}`);

};
