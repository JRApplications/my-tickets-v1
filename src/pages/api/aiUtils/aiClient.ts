import { createOpenAI, openai as wixOpenai } from "@wix/ai";
import type { LanguageModel } from "ai";
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { createOpenAI as createOpenAIProvider } from "@ai-sdk/openai";
 
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
                apiKey: "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImExNDc3MjkwLTU3N2ItNDVkNS04YmMyLWFmNjNkOTIwYmU0NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjYzZTg1ODMyLTdjMGUtNDhiNS04ZTgyLTI5NWZiMTJkY2IyN1wifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI1NGU2NDMxNi1iMTU5LTQwY2MtYjk4Ni0wMWYxYmUxN2Y3YzNcIn19IiwiaWF0IjoxNzg5OTk5NjkxfQ.TDf53kd_uxOorLOQ2hEB0_NJ74fTA9Pf0odu7O5Mt_rpMxV9JR910h1f42_n-jkEX_DlHfCygCqfQtCRPMKzw67pd08SVN0lDScYnOp_tYuA6wK4X2bAe6gPRg6Mad2GOsMOXq4p5YSLTK9JdHnT_0e_yMgJtficCR_rQ4CP4D25gX7hi-nDswk1C39B7oxcFPVhoi4viCiSp60QULkdmaP8aE4D-nURTNFPsb6CV0CIVUJHKjCikL_Koc-e_BLXDq1UE9bf8C7Ka4LhCeANxU6SefKRa66MKXAJDPIvxnDyvXG225QltQDMXjWh7mfts5AZ9sXeezNMWgjlh7-HTw",
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
