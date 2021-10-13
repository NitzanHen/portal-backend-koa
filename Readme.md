# Backend for the Agamim Portal project

This repo contains the backend code for the new Agamim Portal app.

# Stack

This backend is written in Typescript, with the Koa framework, and `ws` for WebSocket functionality.
MongoDB is used as the primary database.
For schema validation and parsing, Zod is used.
Dependencies are managed by Yarn.

# Hierarchy

Top-level directories:

- `build` (ignored by git) contains built code.
- `scripts` contains "side scripts" related to the portal. At the time of writing a single script exists, `migrateToNewSchema`, which handlers migrating the MongoDB collections of the old backend to collections supporting the new schemas.
- `src` contains the source code.

Directories under `src`:

- `auth`: contains code related to authentication against Azure AD.
- `common`: contains code that's generic in nature or relevant to multiple places in the code, mostly used as a utils directory.
- `controller`: contains the endpoint implementation themselves; each controller is assigned a route, and the `loadControllers` function in `controller/index.ts` injects them.
- `middleware`: contains general middleware not specific to a single endpoint (`logger`, `validate`, etc.)
- `model`: contains Zod model definitions as well as types. These should be moved to a common package (as a private package preferably, otherwise as part of a monorepo) when a new frontend is created for the portal.
- `peripheral`: contains logic for interacting with different components that are not the server's code (env, db connection, Azure blob storage, etc).
- `service`: contains service logic. the generic `Service`, a `MongoService` for MongoDB services as well as specific services for the different models.
in this context, services are the layer that implements the business logic; controllers wrap them with authentication & authorization, validation, receiving and sending data. 
- `websocket`: contains websocket-related logic. As the project scales, this part should be decoupled into a separate microservice.