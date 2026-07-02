# CobrApp

Software de cobranzas y recordatorios automáticos por WhatsApp para pequeños y medianos negocios.

## Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: API Routes de Next.js
- **Base de datos**: PostgreSQL + Prisma ORM
- **Auth**: JWT con jose
- **WhatsApp**: Evolution API (integración transparente)

## Primeros pasos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar base de datos

Crea un archivo `.env` basado en `.env.example` y configura tu URL de PostgreSQL.

### 3. Generar cliente Prisma y crear tablas

```bash
npm run db:generate
npm run db:push
```

### 4. Crear admin inicial

```bash
npm run db:seed
```

Esto crea el usuario admin con las credenciales definidas en `.env`:
- Email: `admin@cobrapp.com`
- Contraseña: `Admin1234!`

### 5. Iniciar desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Inicia en producción |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:push` | Sincroniza schema con DB |
| `npm run db:seed` | Crea usuario admin |

## Estructura del proyecto

```
src/
├── app/              # Next.js App Router
│   ├── (public)/     # Rutas públicas (Home, Login)
│   ├── (admin)/      # Panel de administración
│   ├── (user)/       # Panel del usuario/negocio
│   └── api/          # API Routes
├── components/       # Componentes React
├── lib/              # Utilidades, DB, Auth
└── styles/           # Estilos globales
```