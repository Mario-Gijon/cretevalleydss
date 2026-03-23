# Contexto completo del proyecto (para usar en ChatGPT)

Ultima revision: 2026-03-23  
Ruta raiz del repo: `/home/mario/Documents/Trabalo/CreteValleyDSS/Project`

## 1) Que es este proyecto

Este repo implementa un DSS (Decision Support System) llamado **Crete Valley DSS**.
Permite:

- Crear "issues" (problemas de decision) con alternativas y criterios.
- Invitar expertos para evaluar alternativas.
- Trabajar con evaluacion directa (AxC) o pairwise (AxA), segun modelo.
- Resolver issues con distintos modelos multicriterio/consenso.
- Gestionar usuarios e issues desde panel admin.
- Ejecutar modelos matematicos en un microservicio Python (FastAPI).

Dominio principal:

- **Issue** = proceso de decision.
- **Admin** crea/gestiona issue.
- **Experts** evalua(n) alternativas y/o pesos.
- **Modelos** calculan ranking final y metricas.

## 2) Estructura del monorepo

Carpetas principales:

- `Frontend/`: React + Vite + MUI.
- `Backend/`: Node.js + Express + MongoDB (Mongoose).
- `ApiModels/`: FastAPI con modelos de decision.
- `docker-compose.yml`: compose para build local.
- `cretevalley-docker-compose.yml`: compose usando imagenes publicadas.

Archivos Docker:

- `Dockerfile.frontend`: build del `dist` (Bun).
- `Dockerfile.backend`: API Node + servir `dist`.
- `Dockerfile.apimodels`: FastAPI/Uvicorn.

## 3) Arquitectura runtime

Arquitectura en 3 servicios:

1. `frontend` construye app React y deja `dist` en volumen compartido.
2. `backend` expone API REST y sirve SPA React desde `/dist`.
3. `apimodels` expone endpoints matematicos en FastAPI (puerto 7000).

Puertos habituales en Docker:

- Backend: host `80` -> container `5000`
- ApiModels: host `7000` -> container `7000`

Notas:

- El backend hace `app.use("/api/auth", ...)`, `app.use("/api/issues", ...)`, `app.use("/api/admin", ...)`.
- Luego sirve frontend con `express.static(dist)` y fallback `app.get('*', ...)`.

## 4) Stack tecnico real

Frontend:

- React 19
- React Router
- Vite
- MUI (material, joy, x-data-grid, x-charts)
- styled-components

Backend:

- Node + Express (ESM)
- Mongoose
- JWT access + refresh cookie
- CORS con whitelist por env
- Nodemailer/Brevo/Resend para emails
- Axios para llamar a `ApiModels`

ApiModels:

- FastAPI + Uvicorn
- Numpy/Pandas/Scipy y librerias de decision
- Endpoints de modelos: topsis, borda, aras, fuzzy_topsis, herrera_viedma_crp, bwm, cmcc

## 5) Variables de entorno detectadas

### Backend (`process.env.*`)

- `NODE_ENV`
- `PORT`
- `URI_MONGODB`
- `ORIGIN_FRONT`
- `ORIGIN_BACK`
- `ORIGIN_APIMODELS`
- `ORIGIN_CRETEVALLEY`
- `ORIGIN_SULEIMAN`
- `JWT_SECRET`
- `JWT_REFRESH`
- `APIKEY_BREVO`
- `APIKEY_RESEND`

### Frontend (`import.meta.env.*`)

- `VITE_API_BACK`

Importante:

- `VITE_API_BACK` se usa como base y luego concatena `/auth`, `/issues`, `/admin`.
- En practica suele apuntar a algo como `http://host/api`.

## 6) Flujo funcional principal (negocio)

### 6.1 Auth

- Signup crea usuario con `tokenConfirm` y envia email.
- Login devuelve access token JWT y setea refresh token en cookie httpOnly.
- `authFetch` en frontend:
  - adjunta bearer token en memoria.
  - si recibe 401 por expiracion/no token, llama `/auth/refresh`.
  - reintenta request con token nuevo.

### 6.2 Ciclo de un Issue

1. Admin crea issue:
   - nombre, descripcion, modelo, alternativas, criterios, expertos.
   - asignaciones de dominio de expresion.
2. Se crean documentos relacionados:
   - `Issue`, `Alternative`, `Criterion`, `Participation`, notificaciones.
3. Stage inicial depende de `weightingMode` y numero de leaf criteria:
   - `"criteriaWeighting"` o `"alternativeEvaluation"`.
4. Experts aceptan invitacion y completan evaluaciones/pesos.
5. Admin (o flujo correspondiente) resuelve issue:
   - backend prepara matrices.
   - llama `ApiModels`.
   - guarda resultado y estado final.

### 6.3 Evaluaciones y pesos

- **No pairwise (AxC)**:
  - valor por `(expert, alternative, criterion)`.
- **Pairwise (AxA)**:
  - valor por `(expert, criterion, alternative, comparedAlternative)`.
- Pesos por criterios:
  - modo manual / consenso / bwm / consensoBwm / simulatedConsensusBwm.

### 6.4 Scenarios (simulaciones)

- Permite simular resultado de un issue con otro modelo objetivo.
- Congela inputs y outputs en `IssueScenario`.
- Reusa evaluaciones existentes (no modifica evaluaciones originales).

## 7) Modelos de datos clave (MongoDB)

Modelos relevantes:

- `Users`
  - nombre, universidad, email unico, password hash, role (`user|admin`), accountConfirm.
- `Issues`
  - admin, model, name, isConsensus, stage, weightingMode, modelParameters, order canonico.
- `Alternatives`
- `Criteria` (incluye arbol y leaf criteria)
- `Participations`
  - invitationStatus (`pending|accepted|declined`), flags completion.
- `Evaluations`
  - soporta AxC y AxA (`comparedAlternative`), value mixed, historial por fase.
- `CriteriaWeightEvaluation`
  - datos BWM y/o pesos manuales.
- `ExpressionDomain`
  - dominios globales o por usuario; numeric o linguistic.
- `IssueExpressionDomain`
  - snapshots de dominio usados en issue.
- `IssueScenario`
  - simulaciones con `inputs`/`outputs` congelados.

## 8) Mapa de rutas backend

### Auth (`/api/auth/*`)

- `POST /signup`
- `POST /login`
- `GET /logout`
- `GET /refresh`
- `GET /protected`
- `PUT /modifyName`
- `PUT /modifyUniversity`
- `PUT /modifyEmail`
- `PUT /updatePassword`
- `DELETE /deleteAccount`
- `GET /admin/check`
- `GET /accountConfirm/:token`
- `GET /confirmEmailChange/:token`

### Issues (`/api/issues/*`)

Bloques funcionales:

- Catalogos/base:
  - `getModelsInfo`, `getAllUsers`, `getExpressionsDomain`, `createExpressionDomain`, `updateExpressionDomain`, `removeExpressionDomain`
- Issue lifecycle:
  - `createIssue`, `getAllActiveIssues`, `getAllFinishedIssues`, `removeIssue`, `removeFinishedIssue`, `getFinishedIssueInfo`
- Invitaciones/notificaciones:
  - `getNotifications`, `markAllNotificationsAsRead`, `changeInvitationStatus`, `removeNotificationById`, `editExperts`, `leaveIssue`
- Evaluaciones:
  - `save/get/send/resolve` (version pairwise y no pairwise)
- Pesos:
  - BWM: `save/get/sendBwmWeights`, `computeWeights`
  - Manual: `save/get/sendManualWeights`, `computeManualWeights`
- Scenarios:
  - `createIssueScenario`, `getIssueScenarios`, `getIssueScenarioById`, `removeIssueScenario`

### Admin (`/api/admin/*`)

- Gestion de expertos:
  - `getAllExperts`, `createExpert`, `updateExpert`, `deleteExpert`
- Gestion de issues:
  - `getAllIssues`, `getIssue/:id`, `reassignIssueAdmin`
  - `getIssueExpertsProgress/:id`
  - `getIssueExpertEvaluations/:issueId/:expertId`
  - `getIssueExpertWeights/:issueId/:expertId`
  - Acciones tipo creador: `issues/edit-experts`, `issues/compute-weights`, `issues/resolve`, `issues/remove`

## 9) Mapa Frontend

### Routing

Rutas publicas:

- `/login`
- `/signup`

Rutas privadas:

- `/dashboard/active`
- `/dashboard/finished`
- `/dashboard/create`
- `/dashboard/admin/*` (protegida por `AdminRoute`)

### Estado global

- `AuthProvider`:
  - usuario logado, rol admin, notificaciones, loading.
- `IssuesDataProvider`:
  - modelos, expertos, issues activos/finalizados, dominios globales y usuario.

### Capa de acceso API

- `Frontend/src/controllers/authController.js`
- `Frontend/src/controllers/issueController.js`
- `Frontend/src/controllers/adminController.js`
- `Frontend/src/utils/authFetch.js` (refresh transparente)

## 10) Endpoints del microservicio `ApiModels`

En `ApiModels/app.py`:

- `POST /herrera_viedma_crp`
- `POST /topsis`
- `POST /borda`
- `POST /aras`
- `POST /fuzzy_topsis`
- `POST /bwm`
- `POST /cmcc`

El backend llama a este servicio con `ORIGIN_APIMODELS` (fallback `http://localhost:7000`).

## 11) Forma del codigo (importante para mantener consistencia)

Convenciones observadas:

- JS/JSX con modulos ESM (`import/export`).
- Estilo de indentacion de 2 espacios.
- Comentarios muy abundantes en espanol.
- Nombres de funciones/endpoints en ingles con `camelCase`.
- Respuestas API con patron frecuente:
  - `{ success: true/false, msg, ... }`
  - en auth/form tambien aparece `{ errors: { field: "..." } }`.
- Mezcla de estilos de punto y coma; no aplicar refactors cosmeticos masivos.
- Controladores grandes y con bastante logica inline (especialmente `issue.controller.js` y `admin.controller.js`).
- Arquitectura frontend por capas:
  - `controllers` para HTTP
  - `context` para estado global
  - componentes MUI + paginas por feature

Recomendaciones al modificar:

- Hacer cambios minimos y localizados.
- Mantener naming y patron de respuestas ya existente.
- Evitar reformatear archivos enteros.
- Si hay que refactorizar, hacerlo incremental.

## 12) Puntos delicados / gotchas reales

- `Backend/README.md` y `Frontend/README.md` estan desactualizados respecto al estado real.
- En backend hay `bun.lockb`, pero scripts actuales usan Node/Nodemon; Docker backend usa npm.
- El frontend depende de que `VITE_API_BACK` este bien configurado (normalmente base con `/api`).
- CORS depende de whitelist por entorno; errores de origen rompen auth/cookies.
- El proyecto mezcla ingles/espanol en codigo y comentarios.
- No se detecto suite formal de tests automatizados en el repo.

## 13) Archivos clave para entender rapido el sistema

Backend:

- `Backend/app.js`
- `Backend/routes/auth.route.js`
- `Backend/routes/issue.route.js`
- `Backend/routes/admin.route.js`
- `Backend/controllers/issue.controller.js`
- `Backend/controllers/admin.controller.js`
- `Backend/controllers/auth.controller.js`

Frontend:

- `Frontend/src/App.jsx`
- `Frontend/src/main.jsx`
- `Frontend/src/context/auth/auth.provider.jsx`
- `Frontend/src/context/issues/issues.provider.jsx`
- `Frontend/src/controllers/*.js`
- `Frontend/src/pages/private/createIssue/CreateIssuePage.jsx`

ApiModels:

- `ApiModels/app.py`
- `ApiModels/models/*`

## 14) Prompt base recomendado para pegar en ChatGPT junto a este documento

Usa este bloque como prompt inicial (puedes adaptarlo):

```text
Actua como senior full-stack engineer en este monorepo (Frontend React+Vite, Backend Express+Mongo, ApiModels FastAPI).
Tu objetivo es proponer cambios MINIMOS y compatibles con el estilo existente.

Reglas:
1. No hagas refactors cosmeticos grandes ni reformateo global.
2. Respeta la arquitectura por capas (frontend controllers/context/components, backend routes/controllers/models).
3. Mantiene respuestas API con el patron actual { success, msg, ... }.
4. Si tocas auth, considera access token en memoria + refresh token en cookie.
5. Si tocas resolucion de issues, no rompas flujo pairwise vs no pairwise ni stages del issue.
6. Si propones cambios, devuelve:
   - resumen corto
   - archivos a tocar
   - diff o snippet exacto
   - riesgos/regresiones a vigilar

Antes de proponer, resume en 6-10 lineas como entendiste el contexto del proyecto.
```

## 15) Comandos utiles (referencia rapida)

Frontend:

- `cd Frontend && bun install && bun run dev`
- `cd Frontend && bun run build`

Backend:

- `cd Backend && npm install && npm run dev`
- `cd Backend && npm run start`

ApiModels:

- `cd ApiModels && pip install -r requirements.txt`
- `cd ApiModels && uvicorn app:app --host 0.0.0.0 --port 7000 --reload`

Docker:

- `docker compose up --build`
- `docker compose -f cretevalley-docker-compose.yml up`

