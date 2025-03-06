const { ChatOpenAI } = require("@langchain/openai");
const { executeQuery } = require("../database/queryExecutor");
const { z } = require("zod");
const { RunnableSequence } = require("@langchain/core/runnables");
const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const dbConnection = require('../database/dbConnection');
require('dotenv').config()
const OPENAI_API_KEY= process.env.KEY;

async function createOrUpdateChat(req, res) {
  try {
    const { userId, chatId, messages, modelId } = req.body;
    const hasFileAttachment = 0;
    let chatName;
    let newChatId = chatId;

    if (!userId || !messages || messages.length === 0 || (chatId === undefined && !modelId)) {
      return res.status(400).send({ message: "UserId, Messages, and ModelId are required for new chats" });
    }

    if (!chatId) {
      // Create New Chat
      chatName = await openAI(messages[messages.length - 1].content);
      console.log("Chat Name Generated:", chatName);

      const chatResult = await executeQuery(
        `INSERT INTO chats (userId, content, chatName, modelId, createdAt, isActive) VALUES (UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), NOW(), TRUE)`,
        [userId, messages[messages.length - 1].content, chatName, modelId]
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

    // Insert User Message
    const messageResult = await executeQuery(
      `INSERT INTO messages (chatId, role, content, hasFileAttachment, createdAt, isActive) VALUES (UUID_TO_BIN(?), ?, ?, ?, NOW(), TRUE)`,
      [newChatId, "user", messages[messages.length - 1].content, hasFileAttachment]
    );

    if (messageResult.affectedRows === 0) {
      throw new Error("Message insertion failed");
    }

    res.status(201).send({
      chatId: newChatId,
      message: chatId ? "Chat Updated Successfully" : "Chat Created Successfully",
      newChat: chatName || undefined,
    });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send({
      message: "Database Error",
      error: error.message,
    });
  }
}

// OpenAI LLM API
async function generateBotResponse(req, res) {
  try {
    const { messages } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).send({ message: "Messages are required" });
    }

    const botResponse = await openAiLlm(messages);
    console.log("AI Response:", botResponse);

    res.status(200).send({
      message: "AI Response Generated Successfully",
      data: botResponse,
    });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).send({
      message: "OpenAI API Error",
      error: error.message,
    });
  }
}


// async function openAiLlm(messages) {
//   try {
//     console.log("Invoking AI with Messages:", messages);

//     const llm = createOpenAIConnection();
//     const aiMsg = await llm.invoke(messages);
    

//     if (!aiMsg || !aiMsg.content) {
//       throw new Error("Invalid AI response");
//     }
// console.log(typeof(aiMsg.content));

//     return aiMsg.content;
//   } catch (error) {
//     console.error("AI Error:", error);
//     return "I'm unable to process your request at the moment.";
//   }
// }

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






// Navanitha apis


async function fetchAllChats(req, res) {
  let connection;
  try {
    connection = await dbConnection.getConnection();
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).send({ message: "User ID is required" });
    }

    const [chats] = await connection.query("SELECT content,chatName, BIN_TO_UUID(userId) as userId, BIN_TO_UUID(chatId) as chatId FROM chats WHERE userId = UUID_TO_BIN(?) and isActive=1;", [userId]);
    console.log("DB res",chats)
    if(!chats || chats.length === 0){
      //console.log("empty")
      return res.status(404).json({ message: "No Chats for this user " });
    }

    return res.status(200).json({ message: "Chats retrieved successfully", data: chats });
  } 
  catch (error) {
    return res.status(500).send({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

async function fetchChat(req, res) {
  let connection;
  try {

    connection = await dbConnection.getConnection();
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).send({ message: "Chat ID is required" });
    }

    const [chats] = await connection.query("SELECT content,chatName, BIN_TO_UUID(userId) as userId, BIN_TO_UUID(chatId) as chatId FROM chats WHERE chatId = UUID_TO_BIN(?) and isActive=1;", [chatId]);

    return res.status(200).json({ message: "Chats retrieved successfully", data: chats });
  } 
  catch (error) {
    return res.status(500).send({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

async function deleteChat(req, res) {
  let connection;
  try {

    connection = await dbConnection.getConnection();
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).send({ message: "Chat ID is required" });
    }

    const [chats] = await connection.query("UPDATE chats SET isActive = 0 WHERE chatId = UUID_TO_BIN(?)", [chatId]);
    console.log("Delete",chats)
    if (chats.affectedRows > 0) {
      return res.status(200).json({ success: true, message: "Chat status updated successfully" });
    } 
    else {
      return res.status(404).json({ success: false, message: "Chat not found or no changes made" });
    }
  } 

  catch (error) {
    return res.status(500).send({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { createOrUpdateChat,openAI, fetchAllChats,fetchChat, deleteChat };