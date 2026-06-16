const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { createSwaggerDocs, rateLimitMiddleware } = require('@dev-laoz/core');

const rolesRoutes = require('./routes/rolesRoutes');

const swaggerDocs = createSwaggerDocs({
  title: 'Roles & Permissions API',
  description:
    'API para gestión de roles y permisos del ecosistema Dev Laoz.\n\n**Permisos disponibles:** `resource:action` — ej. `users:read`, `files:write`, `roles:delete`.',
  routesGlob: path.join(__dirname, 'routes/*.js'),
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimitMiddleware);

app.use('/api/roles', rolesRoutes);
swaggerDocs(app);

module.exports = app;
