pnpm run build

> @ai-job-suite/auth-service@1.0.0 build C:\Users\ngwen\MyProjects\ai-job-suite\auth-service
> tsc

src/config/passport.ts:83:14 - error TS6133: 'accessToken' is declared but its value is never read.

83 async (accessToken, refreshToken, profile, done) => {
~~~~~~~~~~~

src/config/passport.ts:83:27 - error TS6133: 'refreshToken' is declared but its value is never read.

83 async (accessToken, refreshToken, profile, done) => {
~~~~~~~~~~~~

src/database/migrate.ts:31:11 - error TS18048: 'statement' is possibly 'undefined'.

31 if (statement.trim()) {
~~~~~~~~~

src/database/migrate.ts:33:23 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
Type 'undefined' is not assignable to type 'string'.

33 await query(statement);
~~~~~~~~~

src/index.ts:246:32 - error TS6133: 'req' is declared but its value is never read.

246 app.get("/health/db", async (req, res) => {
~~~

src/index.ts:269:35 - error TS6133: 'req' is declared but its value is never read.

269 app.get("/health/redis", async (req, res) => {
~~~

src/lib/authClient.ts:86:36 - error TS18046: 'error' is of type 'unknown'.

86 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:86:51 - error TS18046: 'error' is of type 'unknown'.

86 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:90:14 - error TS18046: 'result' is of type 'unknown'.

90 return result.data;
~~~~~~

src/lib/authClient.ts:125:36 - error TS18046: 'error' is of type 'unknown'.

125 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:125:51 - error TS18046: 'error' is of type 'unknown'.

125 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:129:14 - error TS18046: 'result' is of type 'unknown'.

129 return result.data;
~~~~~~

src/lib/authClient.ts:163:36 - error TS18046: 'error' is of type 'unknown'.

163 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:163:51 - error TS18046: 'error' is of type 'unknown'.

163 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:167:14 - error TS18046: 'result' is of type 'unknown'.

167 return result.data;
~~~~~~

src/lib/authClient.ts:198:36 - error TS18046: 'error' is of type 'unknown'.

198 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:198:51 - error TS18046: 'error' is of type 'unknown'.

198 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:233:36 - error TS18046: 'error' is of type 'unknown'.

233 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:233:51 - error TS18046: 'error' is of type 'unknown'.

233 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:237:14 - error TS18046: 'result' is of type 'unknown'.

237 return result.data;
~~~~~~

src/lib/authClient.ts:278:36 - error TS18046: 'error' is of type 'unknown'.

278 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:278:51 - error TS18046: 'error' is of type 'unknown'.

278 throw new AuthServiceError(error.message, error.code, response.status);
~~~~~

src/lib/authClient.ts:282:14 - error TS18046: 'result' is of type 'unknown'.

282 return result.data;
~~~~~~

src/lib/authClient.ts:315:7 - error TS2322: Type 'unknown' is not assignable to type '{ status: string; timestamp: string; service: string; version: string; environment: string; }'.

315 return await response.json();
~~~~~~

src/middleware/auth.ts:369:3 - error TS6133: 'res' is declared but its value is never read.

369 res: Response,
~~~

src/middleware/serviceAuth.ts:83:3 - error TS6133: 'res' is declared but its value is never read.

83 res: Response,
~~~

src/middleware/session.ts:26:3 - error TS6133: 'res' is declared but its value is never read.

26 res: Response,
~~~

src/middleware/session.ts:30:38 - error TS2339: Property 'userId' does not exist on type 'Session & Partial<SessionData>'.

30 if (!req.session || !req.session.userId) {
~~~~~~

src/middleware/session.ts:34:32 - error TS2339: Property 'userId' does not exist on type 'Session & Partial<SessionData>'.

34 const userId = req.session.userId;
~~~~~~

src/middleware/session.ts:116:9 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

116 return res.status(401).json({
~~~~~~

src/middleware/session.ts:123:56 - error TS4111: Property 'organizationId' comes from an index signature, so it must be accessed with ['organizationId'].

123 const targetOrgId = organizationId || req.params.organizationId;
~~~~~~~~~~~~~~

src/middleware/session.ts:126:9 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

126 return res.status(400).json({
~~~~~~

src/middleware/session.ts:135:9 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

135 return res.status(403).json({
~~~~~~

src/middleware/session.ts:165:9 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

165 return res.status(401).json({
~~~~~~

src/middleware/session.ts:176:9 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

176 return res.status(403).json({
~~~~~~

src/middleware/session.ts:208:7 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

208 return res.status(401).json({
~~~~~~

src/middleware/session.ts:217:7 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

217 return res.status(403).json({
~~~~~~

src/middleware/session.ts:231:7 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

231 return res.status(403).json({
~~~~~~

src/middleware/session.ts:241:7 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

241 return res.status(403).json({
~~~~~~

src/middleware/session.ts:264:3 - error TS6133: 'res' is declared but its value is never read.

264 res: Response,
~~~

src/middleware/session.ts:349:7 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

349 return res.status(429).json({
~~~~~~

src/routes/auth.ts:41:53 - error TS7006: Parameter 'req' implicitly has an 'any' type.

41 router.post("/register", registerValidation, async (req, res) => {
~~~

src/routes/auth.ts:41:58 - error TS7006: Parameter 'res' implicitly has an 'any' type.

41 router.post("/register", registerValidation, async (req, res) => {
~~~

src/routes/auth.ts:213:47 - error TS7006: Parameter 'req' implicitly has an 'any' type.

213 router.post("/login", loginValidation, async (req, res) => {
~~~

src/routes/auth.ts:213:52 - error TS7006: Parameter 'res' implicitly has an 'any' type.

213 router.post("/login", loginValidation, async (req, res) => {
~~~

src/routes/auth.ts:363:24 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

363 router.post("/logout", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/auth.ts:402:24 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

402 router.get("/profile", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:28:29 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

28 router.get("/subscription", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:28:45 - error TS7030: Not all code paths return a value.

28 router.get("/subscription", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/authorization.ts:97:29 - error TS6133: 'req' is declared but its value is never read.

97 router.get("/plans", async (req, res) => {
~~~

src/routes/authorization.ts:132:3 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

132 authMiddleware,
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:186:37 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

186 router.post("/subscription/cancel", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:188:30 - error TS2339: Property 'id' does not exist on type 'User'.

188 const userId = req.user?.id;
~~

src/routes/authorization.ts:226:3 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

226 authMiddleware,
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:228:3 - error TS7030: Not all code paths return a value.

228 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/authorization.ts:230:32 - error TS2339: Property 'id' does not exist on type 'User'.

230 const userId = req.user?.id;
~~

src/routes/authorization.ts:309:36 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

309 router.get("/permissions/summary", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:309:52 - error TS7030: Not all code paths return a value.

309 router.get("/permissions/summary", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/authorization.ts:311:30 - error TS2339: Property 'id' does not exist on type 'User'.

311 const userId = req.user?.id;
~~

src/routes/authorization.ts:361:29 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

361 router.post("/usage/track", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:363:30 - error TS2339: Property 'id' does not exist on type 'User'.

363 const userId = req.user?.id;
~~

src/routes/authorization.ts:388:30 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

388 router.get("/usage/current", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/authorization.ts:390:30 - error TS2339: Property 'id' does not exist on type 'User'.

390 const userId = req.user?.id;
~~

src/routes/organizations.ts:43:3 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

43 authMiddleware,
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/organizations.ts:45:3 - error TS7030: Not all code paths return a value.

45 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:48:32 - error TS2339: Property 'id' does not exist on type 'User'.

48 const userId = req.user?.id;
~~

src/routes/organizations.ts:143:32 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

143 router.get("/:organizationId", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/organizations.ts:143:48 - error TS7030: Not all code paths return a value.

143 router.get("/:organizationId", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:146:30 - error TS2339: Property 'id' does not exist on type 'User'.

146 const userId = req.user?.id;
~~

src/routes/organizations.ts:213:3 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

213 authMiddleware,
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/organizations.ts:215:3 - error TS7030: Not all code paths return a value.

215 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:219:32 - error TS2339: Property 'id' does not exist on type 'User'.

219 const userId = req.user?.id;
~~

src/routes/organizations.ts:314:3 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

314 authMiddleware,
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/organizations.ts:316:3 - error TS7030: Not all code paths return a value.

316 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:320:32 - error TS2339: Property 'id' does not exist on type 'User'.

320 const userId = req.user?.id;
~~

src/routes/organizations.ts:421:38 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

421 router.get("/:organizationId/users", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/organizations.ts:421:54 - error TS7030: Not all code paths return a value.

421 router.get("/:organizationId/users", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:424:30 - error TS2339: Property 'id' does not exist on type 'User'.

424 const userId = req.user?.id;
~~

src/routes/organizations.ts:469:3 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

469 authMiddleware,
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/organizations.ts:470:3 - error TS7030: Not all code paths return a value.

470 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:473:39 - error TS2339: Property 'id' does not exist on type 'User'.

473 const currentUserId = req.user?.id;
~~

src/routes/organizations.ts:561:3 - error TS2769: No overload matches this call.
The last overload gave the following error.
Argument of type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to parameter of type 'RequestHandlerParams<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Type '(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>' is not assignable to type 'RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
Types of parameters 'req' and 'req' are incompatible.
Type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to type 'AuthenticatedRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'user' are incompatible.
Type 'User | undefined' is not assignable to type 'AuthenticatedUser'.
Type 'undefined' is not assignable to type 'AuthenticatedUser'.

561 authMiddleware,
~~~~~~~~~~~~~~

node_modules/.pnpm/@types+express-serve-static-core@5.0.7/node_modules/@types/express-serve-static-core/index.d.ts:157:5
157 <
~
158 P = ParamsDictionary,
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
166 ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
167 ): T;
~~~~~~~~~
The last overload is declared here.

src/routes/organizations.ts:562:3 - error TS7030: Not all code paths return a value.

562 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:566:39 - error TS2339: Property 'id' does not exist on type 'User'.

566 const currentUserId = req.user?.id;
~~

src/routes/services.ts:39:10 - error TS7006: Parameter 'req' implicitly has an 'any' type.

39 async (req, res) => {
~~~

src/routes/services.ts:39:15 - error TS7006: Parameter 'res' implicitly has an 'any' type.

39 async (req, res) => {
~~~

src/routes/services.ts:156:10 - error TS7006: Parameter 'req' implicitly has an 'any' type.

156 async (req, res) => {
~~~

src/routes/services.ts:156:15 - error TS7006: Parameter 'res' implicitly has an 'any' type.

156 async (req, res) => {
~~~

src/routes/services.ts:243:3 - error TS7030: Not all code paths return a value.

243 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/services.ts:300:10 - error TS7006: Parameter 'req' implicitly has an 'any' type.

300 async (req, res) => {
~~~

src/routes/services.ts:300:15 - error TS7006: Parameter 'res' implicitly has an 'any' type.

300 async (req, res) => {
~~~

src/routes/services.ts:379:54 - error TS7030: Not all code paths return a value.

379 router.post("/bulk-permissions", validateServiceKey, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

Found 92 errors in 11 files.

Errors Files
2 src/config/passport.ts:83
2 src/database/migrate.ts:31
2 src/index.ts:246
18 src/lib/authClient.ts:86
1 src/middleware/auth.ts:369
1 src/middleware/serviceAuth.ts:83
15 src/middleware/session.ts:26
6 src/routes/auth.ts:41
16 src/routes/authorization.ts:28
21 src/routes/organizations.ts:43
8 src/routes/services.ts:39
 ELIFECYCLE  Command failed with exit code 2.
PS C:\Users\ngwen\MyProjects\ai-job-suite\auth-service> pnpm run build

> @ai-job-suite/auth-service@1.0.0 build C:\Users\ngwen\MyProjects\ai-job-suite\auth-service
> tsc

src/middleware/auth.ts:198:31 - error TS18048: 'req.user' is possibly 'undefined'.

198 currentServiceType: req.user.serviceType,
~~~~~~~~

src/middleware/auth.ts:198:40 - error TS2339: Property 'serviceType' does not exist on type 'User'.

198 currentServiceType: req.user.serviceType,
~~~~~~~~~~~

src/middleware/auth.ts:369:3 - error TS6133: 'res' is declared but its value is never read.

369 res: Response,
~~~

src/middleware/session.ts:264:3 - error TS6133: 'res' is declared but its value is never read.

264 res: Response,
~~~

src/middleware/session.ts:349:7 - error TS2322: Type 'Response<any, Record<string, any>>' is not assignable to type 'void'.

349 return res.status(429).json({
~~~~~~

src/routes/auth.ts:41:53 - error TS7006: Parameter 'req' implicitly has an 'any' type.

41 router.post("/register", registerValidation, async (req, res) => {
~~~

src/routes/auth.ts:41:58 - error TS7006: Parameter 'res' implicitly has an 'any' type.

41 router.post("/register", registerValidation, async (req, res) => {
~~~

src/routes/auth.ts:213:47 - error TS7006: Parameter 'req' implicitly has an 'any' type.

213 router.post("/login", loginValidation, async (req, res) => {
~~~

src/routes/auth.ts:213:52 - error TS7006: Parameter 'res' implicitly has an 'any' type.

213 router.post("/login", loginValidation, async (req, res) => {
~~~

src/routes/authorization.ts:96:29 - error TS6133: 'req' is declared but its value is never read.

96 router.get("/plans", async (req, res) => {
~~~

src/routes/authorization.ts:307:52 - error TS7030: Not all code paths return a value.

307 router.get("/permissions/summary", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/authorization.ts:309:30 - error TS2339: Property 'id' does not exist on type 'User'.

309 const userId = req.user?.id;
~~

src/routes/authorization.ts:361:30 - error TS2339: Property 'id' does not exist on type 'User'.

361 const userId = req.user?.id;
~~

src/routes/authorization.ts:388:30 - error TS2339: Property 'id' does not exist on type 'User'.

388 const userId = req.user?.id;
~~

src/routes/organizations.ts:143:48 - error TS7030: Not all code paths return a value.

143 router.get("/:organizationId", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:146:30 - error TS2339: Property 'id' does not exist on type 'User'.

146 const userId = req.user?.id;
~~

src/routes/organizations.ts:215:10 - error TS7006: Parameter 'req' implicitly has an 'any' type.

215 async (req, res) => {
~~~

src/routes/organizations.ts:215:15 - error TS7006: Parameter 'res' implicitly has an 'any' type.

215 async (req, res) => {
~~~

src/routes/organizations.ts:316:10 - error TS7006: Parameter 'req' implicitly has an 'any' type.

316 async (req, res) => {
~~~

src/routes/organizations.ts:316:15 - error TS7006: Parameter 'res' implicitly has an 'any' type.

316 async (req, res) => {
~~~

src/routes/organizations.ts:421:54 - error TS7030: Not all code paths return a value.

421 router.get("/:organizationId/users", authMiddleware, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:424:30 - error TS2339: Property 'id' does not exist on type 'User'.

424 const userId = req.user?.id;
~~

src/routes/organizations.ts:470:3 - error TS7030: Not all code paths return a value.

470 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:473:39 - error TS2339: Property 'id' does not exist on type 'User'.

473 const currentUserId = req.user?.id;
~~

src/routes/organizations.ts:562:3 - error TS7030: Not all code paths return a value.

562 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/organizations.ts:566:39 - error TS2339: Property 'id' does not exist on type 'User'.

566 const currentUserId = req.user?.id;
~~

src/routes/services.ts:156:10 - error TS7006: Parameter 'req' implicitly has an 'any' type.

156 async (req, res) => {
~~~

src/routes/services.ts:156:15 - error TS7006: Parameter 'res' implicitly has an 'any' type.

156 async (req, res) => {
~~~

src/routes/services.ts:243:3 - error TS7030: Not all code paths return a value.

243 async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

src/routes/services.ts:300:10 - error TS7006: Parameter 'req' implicitly has an 'any' type.

300 async (req, res) => {
~~~

src/routes/services.ts:300:15 - error TS7006: Parameter 'res' implicitly has an 'any' type.

300 async (req, res) => {
~~~

src/routes/services.ts:379:54 - error TS7030: Not all code paths return a value.

379 router.post("/bulk-permissions", validateServiceKey, async (req, res) => {
~~~~~~~~~~~~~~~~~~~~~

Found 32 errors in 6 files.

Errors Files
3 src/middleware/auth.ts:198
2 src/middleware/session.ts:264
4 src/routes/auth.ts:41
5 src/routes/authorization.ts:96
12 src/routes/organizations.ts:143
6 src/routes/services.ts:156
 ELIFECYCLE  Command failed with exit code 2.
PS C:\Users\ngwen\MyProjects\ai-job-suite\auth-service>
