const { executeQuery } = require("../database/queryExecutor");
const {openAI}=require('../ai_helper/llm')
const dbConnection = require('../database/dbConnection');

async function createOrUpdateChat(req, res) {
  try {
    const { userId, chatId, messages, modelId } = req.body;
    const hasFileAttachment = 0;
    let chatName;
    let newChatId = chatId;
    console.log(messages,userId.chatId,modelId);
    
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

module.exports = { createOrUpdateChat, fetchAllChats,fetchChat, deleteChat };