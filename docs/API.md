# API Reference — Roles & Permissions API

## Base URL

```
http://localhost:5002
```

En Docker (acceso interno): `http://api-roles:5002`

---

## Autenticación

Todos los endpoints excepto `/api/roles/check` y `/api/roles/health` requieren un JWT válido en el header:

```
Authorization: Bearer <accessToken>
```

El token se obtiene en Authentication API (`POST /api/auth/login`).

---

## GET /api/roles

Lista todos los roles disponibles en el sistema.

**Auth:** Sí

**Response 200**
```json
[
  {
    "_id": "64a1f2b3c4d5e6f7a8b9c0d1",
    "name": "admin",
    "description": "Acceso total al sistema",
    "permissions": [
      "users:read", "users:write", "users:delete",
      "roles:read", "roles:write", "roles:delete",
      "files:read", "files:write", "files:delete",
      "secrets:read", "secrets:write",
      "insights:read", "insights:write",
      "billing:read", "billing:write"
    ],
    "isSystem": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "_id": "64a1f2b3c4d5e6f7a8b9c0d2",
    "name": "editor",
    "description": "Puede gestionar archivos y consultar logs",
    "permissions": ["files:read", "files:write", "files:delete", "insights:read"],
    "isSystem": true
  }
]
```

**curl**
```bash
curl -X GET http://localhost:5002/api/roles \
  -H "Authorization: Bearer <token>"
```

---

## POST /api/roles

Crea un nuevo rol personalizado.

**Auth:** Sí

**Request**
```json
{
  "name": "moderator",
  "description": "Moderador de contenido",
  "permissions": ["files:read", "files:write", "insights:read"]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | string | Sí | Nombre único del rol (se convierte a minúsculas) |
| `description` | string | No | Descripción del rol |
| `permissions` | string[] | No | Permisos en formato `resource:action` |

**Response 201**
```json
{
  "_id": "64a1f2b3c4d5e6f7a8b9c0d5",
  "name": "moderator",
  "description": "Moderador de contenido",
  "permissions": ["files:read", "files:write", "insights:read"],
  "isSystem": false,
  "createdAt": "2025-06-15T12:00:00.000Z",
  "updatedAt": "2025-06-15T12:00:00.000Z"
}
```

**Errores**

| Código | Razón |
|---|---|
| `400` | Nombre vacío o datos inválidos |
| `401` | Token no proporcionado o inválido |
| `409` | Ya existe un rol con ese nombre |

**curl**
```bash
curl -X POST http://localhost:5002/api/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"moderator","description":"Moderador","permissions":["files:read","insights:read"]}'
```

---

## GET /api/roles/name/:name

Obtiene un rol por su nombre.

**Auth:** Sí

**Parámetros de ruta**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre del rol (insensible a mayúsculas) |

**Response 200**
```json
{
  "_id": "64a1f2b3c4d5e6f7a8b9c0d1",
  "name": "admin",
  "description": "Acceso total al sistema",
  "permissions": ["users:read", "users:write", "..."],
  "isSystem": true
}
```

**Errores**

| Código | Razón |
|---|---|
| `404` | Rol no encontrado |

**curl**
```bash
curl -X GET http://localhost:5002/api/roles/name/editor \
  -H "Authorization: Bearer <token>"
```

---

## GET /api/roles/:id

Obtiene un rol por su ID de MongoDB.

**Auth:** Sí

**Response 200**: mismo esquema que `GET /api/roles/name/:name`

**Errores**

| Código | Razón |
|---|---|
| `400` | ID no es un MongoDB ObjectId válido |
| `404` | Rol no encontrado |

**curl**
```bash
curl -X GET http://localhost:5002/api/roles/64a1f2b3c4d5e6f7a8b9c0d1 \
  -H "Authorization: Bearer <token>"
```

---

## PUT /api/roles/:id

Actualiza la descripción y/o los permisos de un rol. El nombre no es modificable.

**Auth:** Sí

**Request**
```json
{
  "description": "Moderador de contenido actualizado",
  "permissions": ["files:read", "files:write", "files:delete", "insights:read"]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `description` | string | No | Nueva descripción |
| `permissions` | string[] | No | Lista completa de permisos (reemplaza la anterior) |

**Response 200**: rol actualizado (mismo esquema)

**Errores**

| Código | Razón |
|---|---|
| `400` | ID inválido o datos incorrectos |
| `404` | Rol no encontrado |

**curl**
```bash
curl -X PUT http://localhost:5002/api/roles/64a1f2b3c4d5e6f7a8b9c0d5 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"permissions":["files:read","files:write","files:delete","insights:read"]}'
```

---

## DELETE /api/roles/:id

Elimina un rol. Los roles con `isSystem: true` no pueden eliminarse.

**Auth:** Sí

**Response 204**: sin cuerpo

**Errores**

| Código | Razón |
|---|---|
| `400` | ID inválido |
| `403` | El rol es un rol del sistema y no puede eliminarse |
| `404` | Rol no encontrado |

**curl**
```bash
curl -X DELETE http://localhost:5002/api/roles/64a1f2b3c4d5e6f7a8b9c0d5 \
  -H "Authorization: Bearer <token>"
```

---

## POST /api/roles/check

Verifica si alguno de los roles proporcionados posee el permiso requerido.

**Uso interno:** Este endpoint es llamado por `authorization-api` para verificar permisos RBAC. No requiere autenticación ya que es una comunicación servicio-a-servicio dentro de la red Docker.

**Auth:** No

**Request**
```json
{
  "roles": ["editor", "viewer"],
  "permission": "files:write"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `roles` | string[] | Sí | Nombres de los roles del usuario |
| `permission` | string | Sí | Permiso a verificar en formato `resource:action` |

**Response 200**
```json
{
  "hasPermission": true,
  "permissions": [
    "files:read", "files:write", "files:delete", "insights:read"
  ]
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `hasPermission` | boolean | `true` si alguno de los roles tiene el permiso |
| `permissions` | string[] | Unión de todos los permisos de los roles especificados |

**Errores**

| Código | Razón |
|---|---|
| `400` | `roles` no es array o `permission` no se proporcionó |

**curl**
```bash
curl -X POST http://localhost:5002/api/roles/check \
  -H "Content-Type: application/json" \
  -d '{"roles":["editor"],"permission":"files:write"}'
```

---

## GET /api/roles/health

Healthcheck del servicio.

**Auth:** No

**Response 200**
```json
{
  "status": "healthy",
  "service": "api-roles"
}
```

---

## Swagger UI

Disponible en `http://localhost:5002/api-docs` cuando el servicio está corriendo.
