import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Service Coordination Service API",
      version: "1.0.0",
      description:
        "API documentation for AI-Driven Delay-Aware Service Scheduling and Rescheduling Engine",
    },
    servers: [
      {
        url: "http://localhost:5005",
        description: "Local development server",
      },
    ],
    tags: [
      {
        name: "Health",
        description: "Service health check",
      },
      {
        name: "Predictions",
        description: "ML duration and delay-risk prediction endpoints",
      },
      {
        name: "Service Requests",
        description: "Service request and pre-booking coordination endpoints",
      },
      {
        name: "Availability",
        description: "Provider availability endpoints",
      },
      {
        name: "Bookings",
        description: "Lightweight booking/scheduling records",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;