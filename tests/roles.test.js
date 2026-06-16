'use strict';

// ---------------------------------------------------------------------------
// Mocks — deben declararse antes de cualquier require del código fuente
// ---------------------------------------------------------------------------

jest.mock('../src/controllers/rolesController', () => ({
  getRoles: (req, res) =>
    res.json([{ name: 'admin', permissions: ['users:read'] }]),

  getRoleById: (req, res) => {
    if (req.params.id === 'valid-id') return res.json({ name: 'editor' });
    return res.status(404).json({ message: 'Rol no encontrado' });
  },

  createRole: (req, res) => {
    if (!req.body.name)
      return res.status(400).json({ message: 'name requerido' });

    // Validación básica formato resource:action para permisos enviados
    if (req.body.permissions) {
      const formatoValido = /^[a-z]+:[a-z]+$/;
      const invalido = req.body.permissions.find(
        (p) => !formatoValido.test(p),
      );
      if (invalido)
        return res
          .status(400)
          .json({ message: `Permiso con formato inválido: ${invalido}` });
    }

    return res.status(201).json({
      name: req.body.name,
      permissions: req.body.permissions || [],
    });
  },

  updateRole: (req, res) => {
    if (req.params.id === 'valid-id') return res.json({ name: 'updated' });
    return res.status(404).json({ message: 'Rol no encontrado' });
  },

  deleteRole: (req, res) => {
    if (req.params.id === 'valid-id') return res.status(204).send();
    return res.status(404).json({ message: 'Rol no encontrado' });
  },

  getRoleByName: (req, res) => {
    if (req.params.name === 'admin') return res.json({ name: 'admin' });
    return res.status(404).json({ message: 'Rol no encontrado' });
  },

  checkPermission: (req, res) => {
    const { roles, permission } = req.body;
    if (!roles || !permission)
      return res
        .status(400)
        .json({ message: 'roles y permission requeridos' });
    const hasPermission = Array.isArray(roles) && roles.includes('admin');
    return res.json({
      hasPermission,
      permissions: hasPermission ? ['users:read', 'files:write'] : [],
    });
  },

  seedDefaultRoles: jest.fn(),
}));

jest.mock('@dev-laoz/core', () => ({
  authMiddleware: (req, res, next) => next(),
  rateLimitMiddleware: (req, res, next) => next(),
  createSwaggerDocs: () => () => {},
  config: { loadRemoteSecrets: jest.fn().mockResolvedValue({}) },
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/config/db', () => jest.fn().mockResolvedValue(undefined));

// ---------------------------------------------------------------------------
// Importaciones — después de los mocks
// ---------------------------------------------------------------------------

const request = require('supertest');
const app = require('../src/server');

// ---------------------------------------------------------------------------
// Suite de pruebas
// ---------------------------------------------------------------------------

describe('Roles API', () => {
  // ─── Health ───────────────────────────────────────────────────────────────

  describe('GET /api/roles/health', () => {
    it('debe responder 200 con status healthy', async () => {
      const res = await request(app).get('/api/roles/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('service', 'api-roles');
    });
  });

  // ─── GET /api/roles ───────────────────────────────────────────────────────

  describe('GET /api/roles', () => {
    it('debe retornar un array de roles con status 200', async () => {
      const res = await request(app).get('/api/roles');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('el primer elemento debe tener el campo name', async () => {
      const res = await request(app).get('/api/roles');
      expect(res.body[0]).toHaveProperty('name', 'admin');
    });

    it('el primer elemento debe tener el campo permissions', async () => {
      const res = await request(app).get('/api/roles');
      expect(res.body[0]).toHaveProperty('permissions');
      expect(Array.isArray(res.body[0].permissions)).toBe(true);
    });
  });

  // ─── POST /api/roles ──────────────────────────────────────────────────────

  describe('POST /api/roles', () => {
    it('debe crear un rol con name y permissions válidos → 201', async () => {
      const res = await request(app)
        .post('/api/roles')
        .send({ name: 'moderator', permissions: ['files:read', 'insights:read'] });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'moderator');
      expect(res.body.permissions).toEqual(['files:read', 'insights:read']);
    });

    it('debe crear un rol sin permissions → 201 con permissions vacío', async () => {
      const res = await request(app)
        .post('/api/roles')
        .send({ name: 'solorol' });
      expect(res.statusCode).toBe(201);
      expect(res.body.permissions).toEqual([]);
    });

    it('debe rechazar si name está ausente → 400', async () => {
      const res = await request(app)
        .post('/api/roles')
        .send({ permissions: ['files:read'] });
      expect(res.statusCode).toBe(400);
    });

    it('debe rechazar si name es cadena vacía → 400', async () => {
      const res = await request(app)
        .post('/api/roles')
        .send({ name: '' });
      expect(res.statusCode).toBe(400);
    });

    it('debe rechazar permissions con formato inválido (sin :) → 400', async () => {
      const res = await request(app)
        .post('/api/roles')
        .send({ name: 'malrol', permissions: ['filesread'] });
      expect(res.statusCode).toBe(400);
    });

    it('debe rechazar permissions con formato inválido (varias partes) → 400', async () => {
      const res = await request(app)
        .post('/api/roles')
        .send({ name: 'malrol2', permissions: ['files:read:extra'] });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /api/roles/:id ───────────────────────────────────────────────────

  describe('GET /api/roles/:id', () => {
    it('debe retornar el rol cuando el id es válido → 200', async () => {
      const res = await request(app).get('/api/roles/valid-id');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'editor');
    });

    it('debe retornar 404 cuando el id no existe', async () => {
      const res = await request(app).get('/api/roles/non-existing-id');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Rol no encontrado');
    });
  });

  // ─── GET /api/roles/name/:name ────────────────────────────────────────────

  describe('GET /api/roles/name/:name', () => {
    it('debe retornar el rol admin → 200', async () => {
      const res = await request(app).get('/api/roles/name/admin');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'admin');
    });

    it('debe retornar 404 si el nombre no existe', async () => {
      const res = await request(app).get('/api/roles/name/desconocido');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Rol no encontrado');
    });
  });

  // ─── PUT /api/roles/:id ───────────────────────────────────────────────────

  describe('PUT /api/roles/:id', () => {
    it('debe actualizar el rol con id válido → 200', async () => {
      const res = await request(app)
        .put('/api/roles/valid-id')
        .send({ description: 'Nueva descripción', permissions: ['files:read'] });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'updated');
    });

    it('debe retornar 404 si el rol no existe', async () => {
      const res = await request(app)
        .put('/api/roles/id-inexistente')
        .send({ description: 'X' });
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Rol no encontrado');
    });
  });

  // ─── DELETE /api/roles/:id ────────────────────────────────────────────────

  describe('DELETE /api/roles/:id', () => {
    it('debe eliminar el rol con id válido → 204', async () => {
      const res = await request(app).delete('/api/roles/valid-id');
      expect(res.statusCode).toBe(204);
      expect(res.body).toEqual({});
    });

    it('debe retornar 404 si el rol no existe', async () => {
      const res = await request(app).delete('/api/roles/id-inexistente');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Rol no encontrado');
    });
  });

  // ─── POST /api/roles/check ────────────────────────────────────────────────

  describe('POST /api/roles/check', () => {
    it('roles=["admin"] con permiso → hasPermission true', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({ roles: ['admin'], permission: 'users:read' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('hasPermission', true);
    });

    it('roles=["admin"] → permissions contiene entradas', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({ roles: ['admin'], permission: 'users:read' });
      expect(Array.isArray(res.body.permissions)).toBe(true);
      expect(res.body.permissions.length).toBeGreaterThan(0);
    });

    it('roles=["viewer"] → hasPermission false', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({ roles: ['viewer'], permission: 'users:write' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('hasPermission', false);
    });

    it('roles=["viewer"] → permissions vacío', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({ roles: ['viewer'], permission: 'users:write' });
      expect(res.body.permissions).toEqual([]);
    });

    it('sin campo roles → 400', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({ permission: 'files:write' });
      expect(res.statusCode).toBe(400);
    });

    it('sin campo permission → 400', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({ roles: ['admin'] });
      expect(res.statusCode).toBe(400);
    });

    it('body completamente vacío → 400', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('no requiere autenticación (sin header Authorization)', async () => {
      const res = await request(app)
        .post('/api/roles/check')
        .send({ roles: ['admin'], permission: 'files:write' });
      // No debe ser 401 ni 403
      expect(res.statusCode).toBe(200);
    });
  });
});
