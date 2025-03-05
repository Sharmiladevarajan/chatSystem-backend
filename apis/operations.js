const { ChatOpenAI } = require("@langchain/openai");
const { executeQuery } = require("../database/queryExecutor");
const { z } = require("zod");
const { RunnableSequence } = require("@langchain/core/runnables");
const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

async function createOrUpdate(req, res) {
  try {
    const { userId, chatId, messages } = req.body;
    const hasFileAttachment=0
    let chatName;

    if (!userId || !messages || messages.length === 0) {
      return res.status(400).send({ message: "UserId and Messages are required" });
    }

    let newChatId = chatId;

    // Chat Creation if chatId not provided
    if (!chatId) {
       chatName = await openAI(messages[messages.length - 1].content)

      console.log("Chat Name Generated:", chatName);

      const chatResult = await executeQuery(
        `INSERT INTO chats (userId, content, chatName, createdAt, isActive) VALUES (UUID_TO_BIN(?), ?, ?, NOW(), TRUE)`,
        [userId, messages[messages.length - 1].content, chatName]
      );

      if (chatResult.affectedRows === 0) {
        throw new Error("Chat insertion failed");
      }

      const [chatRow] = await executeQuery(
        `SELECT BIN_TO_UUID(chatId) as chatId FROM chats WHERE userId = UUID_TO_BIN(?) ORDER BY createdAt DESC LIMIT 1`,
        [userId]
      );

      if (!chatRow) {
        throw new Error("Chat not found after insertion");
      }

      newChatId = chatRow.chatId;
      console.log("New Chat Created with ID:", newChatId);
    }

    // User Message Insertion
    const messageResult = await executeQuery(
      `INSERT INTO messages (chatId, role, content, hasFileAttachment, createdAt, isActive) VALUES (UUID_TO_BIN(?), ?, ?, ?, NOW(), TRUE)`,
      [newChatId, "user", messages[messages.length - 1].content, hasFileAttachment]
    );

    if (messageResult.affectedRows === 0) {
      throw new Error("Message insertion failed");
    }

    // Bot Response Generation
    const botResponse = await openAiLlm(messages);

    console.log("AI Response:", botResponse);

    const insertMessage=await executeQuery(
      `INSERT INTO messages (chatId, role, content, hasFileAttachment, createdAt, isActive) VALUES (UUID_TO_BIN(?), ?, ?, ?, NOW(), TRUE)`,
      [newChatId, "assistant", botResponse, hasFileAttachment]
    );
    console.log(insertMessage,"a58fee86-f8eb-11ef-b3ac-3c0af3902f08");
    

    if(insertMessage){
      res.status(201).send({
        chatId: newChatId,
        message: "Success",
        data: botResponse,
        newChat:chatName
      });
    }
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({
      message: "Database Error",
      error: error.message,
    });
  }
}

async function openAiLlm(messages) {
  try {
    console.log("Invoking AI with Messages:", messages);

    const llm = createOpenAIConnection();
    const aiMsg = await llm.invoke(messages);
    

    if (!aiMsg || !aiMsg.content) {
      throw new Error("Invalid AI response");
    }
console.log(typeof(aiMsg.content));

    return aiMsg.content;
  } catch (error) {
    console.error("AI Error:", error);
    return "I'm unable to process your request at the moment.";
  }
}

function createOpenAIConnection() {
  return new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
    apiKey: OPENAI_API_KEY,
  });
}


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

module.exports = { createOrUpdate, openAiLlm,openAI };