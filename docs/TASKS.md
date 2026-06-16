# Tareas de desarrollo — dev-laoz-api-roles

## Historias de usuario

---

### US-ROLES-001 — Listar todos los roles

**Como** administrador del sistema,
**quiero** obtener la lista completa de roles disponibles,
**para** conocer los roles existentes y sus permisos asignados.

**Criterios de aceptación:**

```gherkin
Escenario: Listado exitoso de roles
  Dado que soy un usuario autenticado con JWT válido
  Cuando hago GET /api/roles
  Entonces recibo un array JSON con todos los roles
  Y cada rol contiene los campos: _id, name, description, permissions, isSystem
  Y la respuesta tiene status 200

Escenario: Acceso sin token
  Dado que no incluyo el header Authorization
  Cuando hago GET /api/roles
  Entonces recibo status 401
```

**Tareas técnicas:**
- [ ] Implementar `getRoles` en `rolesController.js` usando `Role.find().sort({ name: 1 })`
- [ ] Proteger la ruta con `authMiddleware`
- [ ] Documentar con Swagger JSDoc

---

### US-ROLES-002 — Obtener rol por ID

**Como** servicio consumidor,
**quiero** recuperar un rol específico por su ID de MongoDB,
**para** obtener sus permisos y metadatos.

**Criterios de aceptación:**

```gherkin
Escenario: Rol encontrado
  Dado que existe un rol con el id "64a1f2b3c4d5e6f7a8b9c0d1"
  Cuando hago GET /api/roles/64a1f2b3c4d5e6f7a8b9c0d1 con JWT válido
  Entonces recibo el documento del rol con status 200

Escenario: Rol no encontrado
  Dado que no existe ningún rol con ese ObjectId
  Cuando hago GET /api/roles/64a1f2b3c4d5e6f7a8b9c0d9 con JWT válido
  Entonces recibo status 404 con body { "error": "Rol no encontrado" }

Escenario: ID con formato inválido
  Dado que envío un ID que no es un MongoId ("abc123")
  Cuando hago GET /api/roles/abc123 con JWT válido
  Entonces recibo status 400
```

**Tareas técnicas:**
- [ ] Agregar validación `param('id').isMongoId()` en la ruta
- [ ] Implementar `getRoleById` en el controlador
- [ ] Manejar el caso de rol inexistente con 404

---

### US-ROLES-003 — Obtener rol por nombre

**Como** administrador,
**quiero** buscar un rol por su nombre,
**para** consultarlo sin necesidad de conocer su ID de MongoDB.

**Criterios de aceptación:**

```gherkin
Escenario: Nombre encontrado
  Dado que existe el rol "admin"
  Cuando hago GET /api/roles/name/admin con JWT válido
  Entonces recibo el documento del rol con status 200

Escenario: Búsqueda insensible a mayúsculas
  Dado que existe el rol "editor"
  Cuando hago GET /api/roles/name/EDITOR con JWT válido
  Entonces recibo el rol "editor" con status 200

Escenario: Nombre desconocido
  Dado que no existe ningún rol llamado "superuser"
  Cuando hago GET /api/roles/name/superuser con JWT válido
  Entonces recibo status 404
```

**Tareas técnicas:**
- [ ] Implementar `getRoleByName` con búsqueda por `name.toLowerCase()`
- [ ] Proteger la ruta con `authMiddleware`

---

### US-ROLES-004 — Crear nuevo rol

**Como** administrador,
**quiero** crear roles personalizados con permisos específicos,
**para** modelar el control de acceso de nuevos módulos del sistema.

**Criterios de aceptación:**

```gherkin
Escenario: Creación exitosa
  Dado que envío { "name": "moderator", "permissions": ["files:read", "insights:read"] }
  Cuando hago POST /api/roles con JWT válido
  Entonces recibo status 201
  Y el body contiene el documento creado con name "moderator"
  Y el campo isSystem es false por defecto

Escenario: Nombre faltante
  Dado que envío un body sin el campo "name"
  Cuando hago POST /api/roles con JWT válido
  Entonces recibo status 400

Escenario: Rol duplicado
  Dado que ya existe un rol llamado "moderator"
  Cuando hago POST /api/roles con { "name": "moderator" }
  Entonces recibo status 409

Escenario: Permisos con formato correcto
  Dado que envío permissions: ["users:read", "files:write"]
  Cuando hago POST /api/roles con JWT válido
  Entonces los permisos se almacenan tal cual con status 201
```

**Tareas técnicas:**
- [ ] Validar `body('name').trim().notEmpty()` en la ruta
- [ ] Implementar `createRole` con `Role.create()`
- [ ] Capturar el error de índice duplicado (`err.code === 11000`) y responder 409
- [ ] Documentar con Swagger JSDoc

---

### US-ROLES-005 — Actualizar rol

**Como** administrador,
**quiero** modificar la descripción y los permisos de un rol existente,
**para** adaptar el modelo RBAC sin necesidad de recrear el rol.

**Criterios de aceptación:**

```gherkin
Escenario: Actualización exitosa de permisos
  Dado que existe el rol con id "64a1f2b3c4d5e6f7a8b9c0d5"
  Cuando hago PUT /api/roles/64a1f2b3c4d5e6f7a8b9c0d5 con { "permissions": ["files:read"] }
  Entonces recibo status 200 con el rol actualizado
  Y los permisos reflejan la nueva lista

Escenario: Rol no encontrado en actualización
  Dado que no existe un rol con ese ID
  Cuando hago PUT /api/roles/<id-inexistente>
  Entonces recibo status 404

Escenario: El nombre no es modificable
  Dado que envío { "name": "nuevo_nombre" } en el body
  Cuando hago PUT /api/roles/:id
  Entonces el nombre del rol NO cambia (el campo name es ignorado por el controlador)
```

**Tareas técnicas:**
- [ ] Implementar `updateRole` que solo modifique `description` y `permissions`
- [ ] Validar el ID con `param('id').isMongoId()`
- [ ] Usar `role.save()` para disparar hooks de Mongoose si existieran

---

### US-ROLES-006 — Eliminar rol

**Como** administrador,
**quiero** eliminar roles personalizados que ya no se usan,
**para** mantener el catálogo de roles limpio.

**Criterios de aceptación:**

```gherkin
Escenario: Eliminación exitosa de rol personalizado
  Dado que existe el rol "moderator" con isSystem: false
  Cuando hago DELETE /api/roles/<id-moderator> con JWT válido
  Entonces recibo status 204 sin cuerpo

Escenario: Intento de eliminar rol del sistema
  Dado que el rol "admin" tiene isSystem: true
  Cuando hago DELETE /api/roles/<id-admin> con JWT válido
  Entonces recibo status 403 con { "error": "No se puede eliminar un rol del sistema" }
  Y el rol sigue existiendo en la base de datos

Escenario: Rol no encontrado al eliminar
  Dado que no existe un rol con ese ID
  Cuando hago DELETE /api/roles/<id-inexistente>
  Entonces recibo status 404
```

**Tareas técnicas:**
- [ ] Implementar `deleteRole` verificando `isSystem` antes de eliminar
- [ ] Usar `role.deleteOne()` (en lugar de `findByIdAndDelete`) para facilitar el chequeo previo

---

### US-ROLES-007 — Verificación RBAC interna

**Como** `authorization-api` (servicio interno),
**quiero** verificar si un conjunto de roles posee un permiso específico,
**para** autorizar o denegar peticiones de los usuarios del ecosistema.

**Criterios de aceptación:**

```gherkin
Escenario: Permiso presente en uno de los roles
  Dado que envío { "roles": ["editor"], "permission": "files:write" }
  Cuando hago POST /api/roles/check
  Entonces recibo { "hasPermission": true, "permissions": [...] } con status 200

Escenario: Permiso ausente
  Dado que envío { "roles": ["viewer"], "permission": "files:write" }
  Cuando hago POST /api/roles/check
  Entonces recibo { "hasPermission": false, "permissions": ["files:read", "insights:read"] }

Escenario: Body incompleto
  Dado que envío { "roles": ["admin"] } sin el campo "permission"
  Cuando hago POST /api/roles/check
  Entonces recibo status 400

Escenario: Sin autenticación (uso interno correcto)
  Dado que no incluyo header Authorization
  Cuando hago POST /api/roles/check con body válido
  Entonces el sistema responde correctamente (no requiere JWT)
```

**Tareas técnicas:**
- [ ] Implementar `checkPermission` con búsqueda `Role.find({ name: { $in: roleNames } })`
- [ ] Agregar la ruta ANTES de `authMiddleware` global
- [ ] Documentar el uso exclusivo de comunicación interna en Swagger y API.md

---

### US-ROLES-008 — Seed automático de roles por defecto

**Como** operador del sistema,
**quiero** que los roles base (`admin`, `editor`, `viewer`, `user`) se inicialicen automáticamente al arrancar el servidor,
**para** garantizar que el ecosistema siempre tiene los roles fundacionales disponibles.

**Criterios de aceptación:**

```gherkin
Escenario: Primera ejecución del servidor
  Dado que la base de datos está vacía
  Cuando el servidor arranca
  Entonces los 4 roles por defecto son creados en la colección "roles"

Escenario: Ejecución idempotente
  Dado que los 4 roles ya existen en la base de datos
  Cuando el servidor se reinicia
  Entonces los roles no se duplican (upsert por nombre)
  Y sus permisos se mantienen o actualizan según DEFAULT_ROLES

Escenario: Roles del sistema protegidos
  Dado que los roles "admin" y "editor" tienen isSystem: true tras el seed
  Cuando se intenta eliminarlos por API
  Entonces son rechazados con status 403
```

**Tareas técnicas:**
- [ ] Implementar `seedDefaultRoles` con loop sobre `DEFAULT_ROLES` usando `findOneAndUpdate({ upsert: true })`
- [ ] Llamar a `seedDefaultRoles()` en `startServer()` tras conectar a MongoDB
- [ ] Exportar la función para facilitar su testing unitario

---

### US-ROLES-009 — Healthcheck del servicio

**Como** orquestador de contenedores (Docker / Kubernetes),
**quiero** un endpoint de salud sin autenticación,
**para** monitorear el estado del servicio y tomar decisiones de routing.

**Criterios de aceptación:**

```gherkin
Escenario: Servicio operativo
  Cuando hago GET /api/roles/health sin ningún header
  Entonces recibo status 200 con { "status": "healthy", "service": "api-roles" }
```

**Tareas técnicas:**
- [ ] Definir el handler inline en `rolesRoutes.js` antes de cualquier middleware de auth
- [ ] No conectar la lógica del healthcheck a la BD (respuesta siempre inmediata)
