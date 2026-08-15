import { generateAIContent } from "../services/geminiServices.js";

export const generatePost = async (req, res) => {

  try {

    const result = await generateAIContent(req.body);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

};