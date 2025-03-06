const { ChatOpenAI } = require("@langchain/openai");
const { z } = require("zod");
const { RunnableSequence } = require("@langchain/core/runnables");
const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
require('dotenv').config()
const OPENAI_API_KEY= process.env.KEY;


async function openAI(message) {
    console.log(("came"));
    
    
    const model = createOpenAIConnection()
    const zodSchema = z.object({
      answer: z.string().describe("answer to the user's question"),
      source: z
        .string()
        .describe(
          "source used to answer the user's question, should be a website."
        ),
    });
    
    const parser = StructuredOutputParser.fromZodSchema(zodSchema);
    
    const chain = RunnableSequence.from([
      ChatPromptTemplate.fromTemplate(
        "You are a helpful assistant that you need to provide a chatname in maximum of 4 words and minimum of 1 for the user content below.\n{format_instructions}\n{question}"
      ),
      model,
      parser,
    ]);
    
    console.log(parser.getFormatInstructions());
    
    const response = await chain.invoke({
      question: message,
      format_instructions: parser.getFormatInstructions(),
    });
    
    console.log(response);
    return response.answer
  }
  

  
function createOpenAIConnection() {
    return new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
      apiKey: OPENAI_API_KEY,
    });
  }

  
module.exports={openAI}