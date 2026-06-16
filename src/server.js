const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const { config, createSwaggerDocs, rateLimitMiddleware } = require('@dev-laoz/core');

const connectDB = require('./config/db');
const rolesRoutes = require('./routes/rolesRoutes');
const { seedDefaultRoles } = require('./controllers/rolesController');

dotenv.config();

const swaggerDocs = createSwaggerDocs({
  title: 'Roles & Permissions API',
  description: 'API para gestión de roles y permisos del ecosistema Dev Laoz.\n\n**Permisos disponibles:** `resource:action` — ej. `users:read`, `files:write`, `roles:delete`.',
  routesGlob: path.join(__dirname, 'routes/*.js'),
});

const startServer = async () => {
  await config.loadRemoteSecrets('api-roles', ['MONGO_URI']);
  await connectDB();
  await seedDefaultRoles();

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(rateLimitMiddleware);

  app.use('/api/roles', rolesRoutes);
  swaggerDocs(app);

  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => console.log(`Roles API running on port ${PORT}`));
};

startServer();
