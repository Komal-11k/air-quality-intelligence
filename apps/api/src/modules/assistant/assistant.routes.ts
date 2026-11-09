import type { FastifyInstance } from "fastify";
import { assistantQuerySchema } from "./assistant.schema.js";
import { answerAssistantQuestion } from "./assistant.service.js";

export const assistantRoutes = async (app: FastifyInstance) => {
  app.post("/assistant", async (request, reply) => {
    const query = assistantQuerySchema.parse(request.body);
    const response = await answerAssistantQuestion(query);

    return reply.code(200).send(response);
  });
};