# Documento de Requerimientos — dev-laoz-api-roles

## 1. Descripción general

El servicio `dev-laoz-api-roles` gestiona los roles y permisos del ecosistema Dev Laoz. Provee un CRUD completo de roles, un mecanismo de seed de roles por defecto y un endpoint interno de verificación RBAC sin autenticación consumido exclusivamente por `authorization-api`.

---

## 2. Requerimientos Funcionales

### RF-ROLES-001 — Listado de roles
El sistema debe exponer un endpoint `GET /api/roles` que retorne todos los roles almacenados en la base de datos, ordenados alfabéticamente por nombre. Requiere autenticación JWT.

**Respuesta esperada:** Array JSON de documentos `Role` con campos `_id`, `name`, `description`, `permissions`, `isSystem`, `createdAt`, `updatedAt`.

---

### RF-ROLES-002 — Obtención de rol por ID
El sistema debe exponer un endpoint `GET /api/roles/:id` que retorne un único rol identificado por su `_id` de MongoDB. Requiere autenticación JWT.

- Si el ID no es un MongoId válido, debe responder `400`.
- Si el rol no existe, debe responder `404`.

---

### RF-ROLES-003 — Obtención de rol por nombre
El sistema debe exponer un endpoint `GET /api/roles/name/:name` que retorne el rol cuyo campo `name` coincida con el parámetro (búsqueda insensible a mayúsculas). Requiere autenticación JWT.

- Si el rol no existe, debe responder `404`.

---

### RF-ROLES-004 — Creación de rol
El sistema debe exponer un endpoint `POST /api/roles` que permita crear un rol personalizado. Requiere autenticación JWT.

Campos aceptados:
| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `name` | string | Sí | No vacío; se almacena en minúsculas; único en la colección |
| `description` | string | No | Texto libre |
| `permissions` | string[] | No | Cada elemento debe seguir el formato `resource:action` (ej. `files:write`) |

Respuestas:
- `201` con el documento creado.
- `400` si `name` está vacío o los datos no pasan validación.
- `409` si ya existe un rol con el mismo nombre (índice único de MongoDB).

---

### RF-ROLES-005 — Actualización de rol
El sistema debe exponer un endpoint `PUT /api/roles/:id` que permita actualizar `description` y/o `permissions` de un rol existente. El campo `name` no es modificable. Requiere autenticación JWT.

- Si el ID es inválido responde `400`.
- Si el rol no existe responde `404`.
- Los permisos enviados reemplazan completamente la lista anterior.

---

### RF-ROLES-006 — Eliminación de rol
El sistema debe exponer un endpoint `DELETE /api/roles/:id` que elimine permanentemente un rol. Requiere autenticación JWT.

Restricciones:
- Si el ID es inválido responde `400`.
- Si el rol no existe responde `404`.
- Si el rol tiene `isSystem: true` responde `403` con mensaje `"No se puede eliminar un rol del sistema"`. El rol **no** se elimina.
- Si la eliminación es exitosa responde `204` sin cuerpo.

---

### RF-ROLES-007 — Verificación de permisos RBAC (endpoint interno)
El sistema debe exponer un endpoint `POST /api/roles/check` sin autenticación, destinado a comunicación servicio-a-servicio con `authorization-api`.

**Body requerido:**
```json
{ "roles": ["admin", "editor"], "permission": "files:write" }
```

**Respuesta `200`:**
```json
{ "hasPermission": true, "permissions": ["files:read", "files:write", "files:delete", "insights:read"] }
```

- `hasPermission`: `true` si alguno de los roles listados posee el permiso indicado.
- `permissions`: unión de todos los permisos de los roles indicados.
- Responde `400` si `roles` no es array o `permission` no se proporciona.

---

### RF-ROLES-008 — Seed de roles por defecto
Al iniciar el servidor, el sistema debe ejecutar `seedDefaultRoles()` que inserta o actualiza (upsert) los siguientes roles en la base de datos:

| Nombre | `isSystem` | Permisos |
|---|---|---|
| `admin` | `true` | `users:read`, `users:write`, `users:delete`, `roles:read`, `roles:write`, `roles:delete`, `files:read`, `files:write`, `files:delete`, `secrets:read`, `secrets:write`, `insights:read`, `insights:write`, `billing:read`, `billing:write` |
| `editor` | `true` | `files:read`, `files:write`, `files:delete`, `insights:read` |
| `viewer` | `false` | `files:read`, `insights:read` |
| `user` | `false` | `files:read` |

El seed utiliza `findOneAndUpdate` con `upsert: true` para ser idempotente: no genera duplicados si se ejecuta múltiples veces.

---

### RF-ROLES-009 — Healthcheck
El sistema debe exponer `GET /api/roles/health` sin autenticación. Responde `200` con:
```json
{ "status": "healthy", "service": "api-roles" }
```

---

### RF-ROLES-010 — Formato de permisos `resource:action`
Todos los permisos almacenados en el campo `permissions` de un rol deben seguir el formato `resource:action`, donde:
- `resource`: nombre del recurso (ej. `users`, `files`, `roles`, `secrets`, `insights`, `billing`).
- `action`: operación permitida (ej. `read`, `write`, `delete`).

El sistema no rechaza permisos con formato inválido en la capa de persistencia (la validación es responsabilidad del consumidor), pero la documentación establece este contrato.

---

## 3. Requerimientos No Funcionales

### RNF-ROLES-001 — Tiempo de respuesta
Todos los endpoints deben responder en menos de 500 ms bajo carga normal (conexión MongoDB local o en la misma red Docker).

---

### RNF-ROLES-002 — Unicidad de nombre de rol
El campo `name` del modelo `Role` tiene índice único en MongoDB (`unique: true`). Dos roles no pueden compartir el mismo nombre. Los nombres se normalizan a minúsculas antes de almacenarse (`lowercase: true`).

---

### RNF-ROLES-003 — Integridad referencial de roles del sistema
Los roles marcados con `isSystem: true` (`admin` y `editor`) no pueden eliminarse mediante la API. Cualquier intento de eliminarlos debe ser rechazado con `403`, garantizando la integridad del modelo de permisos del ecosistema.

---

### RNF-ROLES-004 — Seguridad de endpoints
Todos los endpoints excepto `/api/roles/health` y `/api/roles/check` requieren un JWT válido procesado por `authMiddleware` de `@dev-laoz/core`. El endpoint `/api/roles/check` está protegido a nivel de red (comunicación interna Docker) y no debe exponerse públicamente.

---

### RNF-ROLES-005 — Rate limiting
El servidor aplica `rateLimitMiddleware` de `@dev-laoz/core` a todas las rutas para prevenir abuso de la API.

---

### RNF-ROLES-006 — Idempotencia del seed
La función `seedDefaultRoles` debe ser segura de ejecutar en cada arranque del servidor sin producir duplicados ni errores, usando operaciones upsert.

---

### RNF-ROLES-007 — Timestamps automáticos
El modelo `Role` usa `{ timestamps: true }` en Mongoose, por lo que `createdAt` y `updatedAt` se gestionan automáticamente.

---

## 4. Roles y permisos por defecto

| Rol | `isSystem` | Permisos completos |
|---|---|---|
| `admin` | `true` | `users:read` `users:write` `users:delete` `roles:read` `roles:write` `roles:delete` `files:read` `files:write` `files:delete` `secrets:read` `secrets:write` `insights:read` `insights:write` `billing:read` `billing:write` |
| `editor` | `true` | `files:read` `files:write` `files:delete` `insights:read` |
| `viewer` | `false` | `files:read` `insights:read` |
| `user` | `false` | `files:read` |

---

## 5. Modelo de datos

```
Role {
  _id:         ObjectId (auto)
  name:        String, required, unique, lowercase, trim
  description: String, default: ''
  permissions: [String], default: []  // formato 'resource:action'
  isSystem:    Boolean, default: false
  createdAt:   Date (auto)
  updatedAt:   Date (auto)
}
```

---

## 6. Endpoints resumen

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/roles/health` | No | Healthcheck |
| POST | `/api/roles/check` | No | Verificación RBAC interna |
| GET | `/api/roles` | Sí | Listar roles |
| GET | `/api/roles/name/:name` | Sí | Obtener rol por nombre |
| GET | `/api/roles/:id` | Sí | Obtener rol por ID |
| POST | `/api/roles` | Sí | Crear rol |
| PUT | `/api/roles/:id` | Sí | Actualizar rol |
| DELETE | `/api/roles/:id` | Sí | Eliminar rol |
