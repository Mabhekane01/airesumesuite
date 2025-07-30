built in 32.17s
@ai-job-suite/frontend:build: - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
@ai-job-suite/backend:build: src/controllers/authController.ts(950,46): error TS2551: Property 'createOTP' does not exist on type 'Model<IEmailOTP, {}, {}, {}, Document<unknown, {}, IEmailOTP, {}> & IEmailOTP & Required<{ \_id: unknown; }> & { **v: number; }, any>'. Did you mean 'create'?
@ai-job-suite/backend:build: src/controllers/authController.ts(1140,38): error TS2551: Property 'createOTP' does not exist on type 'Model<IEmailOTP, {}, {}, {}, Document<unknown, {}, IEmailOTP, {}> & IEmailOTP & Required<{ \_id: unknown; }> & { **v: number; }, any>'. Did you mean 'create'?
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(130,33): error TS2339: Property 'profileCompleteness' does not exist on type 'FlattenMaps<IEnhancedUserProfile> & Required<{ \_id: FlattenMaps<unknown>; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(131,79): error TS2339: Property 'profileMetrics' does not exist on type 'FlattenMaps<IEnhancedUserProfile> & Required<{ \_id: FlattenMaps<unknown>; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(244,40): error TS2339: Property 'profileCompleteness' does not exist on type 'Document<unknown, {}, IEnhancedUserProfile, {}> & IEnhancedUserProfile & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(271,67): error TS2345: Argument of type 'ObjectId' is not assignable to parameter of type 'string'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(343,9): error TS2554: Expected 2 arguments, but got 3.  
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(347,62): error TS2345: Argument of type '{ success: boolean; message: string; }' is not assignable to parameter of type 'IUserSettings'.
@ai-job-suite/backend:build: Type '{ success: boolean; message: string; }' is missing the following properties from type 'IUserSettings': userId, notifications, privacy, preferences, and 57 more.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(354,36): error TS2339: Property 'version' does not exist on type '{ success: boolean; message: string; }'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(381,51): error TS2551: Property 'getSystemSettings' does not exist on type 'SettingsService'. Did you mean 'getUserSettings'?
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(421,58): error TS2551: Property 'updateSystemSettings' does not exist on type 'SettingsService'. Did you mean 'updateUserSettings'?
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(459,67): error TS2345: Argument of type 'ObjectId' is not assignable to parameter of type 'string'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(471,59): error TS2551: Property 'exportUserSettings' does not exist on type 'SettingsService'. Did you mean 'getUserSettings'?
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(550,28): error TS2339: Property 'profileMetrics' does not exist on type 'Document<unknown, {}, IEnhancedUserProfile, {}> & IEnhancedUserProfile & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(551,31): error TS2339: Property 'profileEngagement' does not exist on type 'Document<unknown, {}, IEnhancedUserProfile, {}> & IEnhancedUserProfile & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(552,33): error TS2339: Property 'profileCompleteness' does not exist on type 'Document<unknown, {}, IEnhancedUserProfile, {}> & IEnhancedUserProfile & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/controllers/enterpriseSettingsController.ts(818,17): error TS2339: Property 'integrationData' does not exist on type 'IEnhancedUserProfile'.
@ai-job-suite/backend:build: src/controllers/interviewController.ts(745,32): error TS2554: Expected 4-5 arguments, but got 3.
@ai-job-suite/backend:build: src/controllers/interviewController.ts(808,30): error TS2554: Expected 3-4 arguments, but got 2.
@ai-job-suite/backend:build: src/controllers/interviewController.ts(988,30): error TS2554: Expected 3-4 arguments, but got 1.
@ai-job-suite/backend:build: src/controllers/interviewController.ts(1204,30): error TS2554: Expected 3-4 arguments, but got 1.
@ai-job-suite/backend:build: src/controllers/interviewController.ts(1310,32): error TS2554: Expected 3-4 arguments, but got 1.
@ai-job-suite/backend:build: src/controllers/interviewController.ts(1920,30): error TS2554: Expected 3-4 arguments, but got 1.
@ai-job-suite/backend:build: src/controllers/paymentController.ts(58,30): error TS2339: Property 'id' does not exist on type 'User'.
@ai-job-suite/backend:build: src/controllers/paymentController.ts(195,25): error TS2339: Property 'id' does not exist on type 'User'.  
@ai-job-suite/backend:build: src/controllers/paymentController.ts(243,30): error TS2339: Property 'id' does not exist on type 'User'.  
@ai-job-suite/backend:build: src/controllers/paymentController.ts(270,30): error TS2339: Property 'id' does not exist on type 'User'.  
@ai-job-suite/backend:build: src/controllers/paymentController.ts(297,30): error TS2339: Property 'id' does not exist on type 'User'.  
@ai-job-suite/backend:build: src/middleware/enterpriseErrorHandler.ts(65,3): error TS2322: Type '(chunk?: any, encoding?: any) => void' is not assignable to type '{ (cb?: () => void): Response<any, Record<string, any>>; (chunk: any, cb?: () => void): Response<any, Record<string, any>>; (chunk: any, encoding: BufferEncoding, cb?: () => void): Response<...>; }'.
@ai-job-suite/backend:build: Type 'void' is not assignable to type 'Response<any, Record<string, any>>'.
@ai-job-suite/backend:build: src/middleware/enterpriseErrorHandler.ts(87,3): error TS2322: Type '(chunk?: any, encoding?: any) => void' is not assignable to type '{ (cb?: () => void): Response<any, Record<string, any>>; (chunk: any, cb?: () => void): Response<any, Record<string, any>>; (chunk: any, encoding: BufferEncoding, cb?: () => void): Response<...>; }'.
@ai-job-suite/backend:build: Type 'void' is not assignable to type 'Response<any, Record<string, any>>'.
@ai-job-suite/backend:build: src/middleware/enterpriseValidation.ts(333,55): error TS2339: Property 'autoApply' does not exist on type '{ globalEnabled: boolean; authEndpoints: { windowMs: number; max: number; }; apiEndpoints: { windowMs: number; max: number; }; fileUpload: { windowMs: number; max: number; maxFileSize: number; }; aiServices: { ...; }; }'.
@ai-job-suite/backend:build: src/middleware/securityMiddleware.ts(4,10): error TS2724: '"../services/securityService"' has no exported member named 'SecurityService'. Did you mean 'securityService'?
@ai-job-suite/backend:build: src/middleware/securityMiddleware.ts(64,49): error TS2345: Argument of type 'string' is not assignable to parameter of type 'LogData'.
@ai-job-suite/backend:build: src/middleware/securityMiddleware.ts(126,25): error TS2339: Property 'userId' does not exist on type 'User'.
@ai-job-suite/backend:build: src/middleware/securityMiddleware.ts(144,25): error TS2339: Property 'userId' does not exist on type 'User'.
@ai-job-suite/backend:build: src/models/EmailVerification.ts(88,20): error TS2339: Property 'generateOTP' does not exist on type 'Model<IEmailOTP, any, any, any, Document<unknown, any, IEmailOTP, any> & IEmailOTP & Required<{ \_id: unknown; }> & { **v: number; }, any>'.
@ai-job-suite/backend:build: src/models/InterviewCommunication.ts(302,15): error TS2339: Property '\_replyCount' does not exist on type 'Document<unknown, {}, FlatRecord<IInterviewCommunication>, {}> & FlatRecord<IInterviewCommunication> & Required<...> & { ...; }'.  
@ai-job-suite/backend:build: src/models/Location.ts(129,36): error TS2551: Property 'parent' does not exist on type 'Document<unknown, {}, FlatRecord<ILocation>, {}> & FlatRecord<ILocation> & Required<{ \_id: unknown; }> & { **v: number; }'. Did you mean '$parent'?      
@ai-job-suite/backend:build: src/models/Location.ts(130,34): error TS2551: Property 'parent' does not exist on type 'Document<unknown, {}, FlatRecord<ILocation>, {}> & FlatRecord<ILocation> & Required<{ _id: unknown; }> & { __v: number; }'. Did you mean '$parent'?  
@ai-job-suite/backend:build: src/routes/accountRoutes.ts(17,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/routes/careerCoachRoutes.ts(6,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/routes/companyRoutes.ts(6,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/routes/currencyRoutes.ts(6,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/routes/enterpriseRoutes.ts(163,19): error TS2352: Conversion of type '{ user: { userId: string; id: string; email: string; }; get(name: "set-cookie"): string[] | undefined; get(name: string): string | undefined; header(name: "set-cookie"): string[] | undefined; header(name: string): string | undefined; ... 80 more ...; session?: { ...; }; }' to type 'AuthenticatedRequest' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
@ai-job-suite/backend:build: Type '{ user: { userId: string; id: string; email: string; }; get(name: "set-cookie"): string[]; get(name: string): string; header(name: "set-cookie"): string[]; header(name: string): string; accepts(): string[]; accepts(type: string): string | false; accepts(type: string[]): string | false; accepts(...type: string[]): st...' is missing the following properties from type 'AuthenticatedRequest': setTimeout, destroy, \_read, read, and 33 more.
@ai-job-suite/backend:build: src/routes/enterpriseRoutes.ts(168,19): error TS2352: Conversion of type '{ user: { userId: string; id: string; email: string; }; get(name: "set-cookie"): string[] | undefined; get(name: string): string | undefined; header(name: "set-cookie"): string[] | undefined; header(name: string): string | undefined; ... 80 more ...; session?: { ...; }; }' to type 'AuthenticatedRequest' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
@ai-job-suite/backend:build: Type '{ user: { userId: string; id: string; email: string; }; get(name: "set-cookie"): string[]; get(name: string): string; header(name: "set-cookie"): string[]; header(name: string): string; accepts(): string[]; accepts(type: string): string | false; accepts(type: string[]): string | false; accepts(...type: string[]): st...' is missing the following properties from type 'AuthenticatedRequest': setTimeout, destroy, \_read, read, and 33 more.
@ai-job-suite/backend:build: src/routes/enterpriseSettingsRoutes.ts(6,26): error TS2305: Module '"../middleware/auth"' has no exported member 'requirePermissions'.
@ai-job-suite/backend:build: src/routes/enterpriseSettingsRoutes.ts(7,10): error TS2305: Module '"../middleware/validation"' has no exported member 'validateRequest'.
@ai-job-suite/backend:build: src/routes/enterpriseSettingsRoutes.ts(11,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/routes/enterpriseSettingsRoutes.ts(59,54): error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
@ai-job-suite/backend:build: src/routes/interviewRoutes.ts(6,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/routes/locationRoutes.ts(6,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/routes/paymentRoutes.ts(19,7): error TS2742: The inferred type of 'router' cannot be named without a reference to '.pnpm/@types+express-serve-static-core@4.19.6/node_modules/@types/express-serve-static-core'. This is likely not portable. A type annotation is necessary.
@ai-job-suite/backend:build: src/services/advancedAnalyticsService.ts(186,44): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/advancedAnalyticsService.ts(187,14): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/ai/enterpriseAIService.ts(13,10): error TS2614: Module '"../../middleware/enterpriseErrorHandler"' has no exported member 'AIServiceError'. Did you mean to use 'import AIServiceError from "../../middleware/enterpriseErrorHandler"' instead?
@ai-job-suite/backend:build: src/services/ai/enterpriseAIService.ts(13,26): error TS2614: Module '"../../middleware/enterpriseErrorHandler"' has no exported member 'JobScrapingError'. Did you mean to use 'import JobScrapingError from "../../middleware/enterpriseErrorHandler"' instead?
@ai-job-suite/backend:build: src/services/ai/gemini.ts(652,55): error TS2345: Argument of type '{ contents: { role: string; parts: { text: string; }[]; }[]; generationConfig: { temperature: number; topK: number; topP: number; maxOutputTokens: number; candidateCount: number; }; safetySettings: ({ category: "HARM_CATEGORY_HARASSMENT"; threshold: "BLOCK_NONE"; } | { ...; })[]; }' is not assignable to parameter of type 'string | GenerateContentRequest | (string | Part)[]'.
@ai-job-suite/backend:build: Types of property 'safetySettings' are incompatible.
@ai-job-suite/backend:build: Type '({ category: "HARM_CATEGORY_HARASSMENT"; threshold: "BLOCK_NONE"; } | { category: "HARM_CATEGORY_HATE_SPEECH"; threshold: "BLOCK_NONE"; })[]' is not assignable to type 'SafetySetting[]'.
@ai-job-suite/backend:build: Type '{ category: "HARM_CATEGORY_HARASSMENT"; threshold: "BLOCK_NONE"; } | { category: "HARM_CATEGORY_HATE_SPEECH"; threshold: "BLOCK_NONE"; }' is not assignable to type 'SafetySetting'.
@ai-job-suite/backend:build: Type '{ category: "HARM_CATEGORY_HARASSMENT"; threshold: "BLOCK_NONE"; }' is not assignable to type 'SafetySetting'.
@ai-job-suite/backend:build: Types of property 'category' are incompatible.
@ai-job-suite/backend:build: Type '"HARM_CATEGORY_HARASSMENT"' is not assignable to type 'HarmCategory'.
@ai-job-suite/backend:build: src/services/ai/gemini.ts(923,9): error TS2393: Duplicate function implementation.
@ai-job-suite/backend:build: src/services/ai/gemini.ts(1009,9): error TS2393: Duplicate function implementation.
@ai-job-suite/backend:build: src/services/aiOptimizationService.ts(39,18): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/aiOptimizationService.ts(100,18): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/aiOptimizationService.ts(172,18): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/aiOptimizationService.ts(224,18): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/aiOptimizationService.ts(325,18): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/aiOptimizationService.ts(412,50): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/aiOptimizationService.ts(424,47): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(333,36): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(334,14): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(387,61): error TS2304: Cannot find name 'profile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(388,62): error TS2304: Cannot find name 'profile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(391,59): error TS2304: Cannot find name 'profile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(395,64): error TS2304: Cannot find name 'profile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(398,76): error TS2304: Cannot find name 'profile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(410,25): error TS2304: Cannot find name 'profile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(412,37): error TS2304: Cannot find name 'profile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(422,36): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(423,14): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(502,36): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(503,14): error TS2304: Cannot find name 'result'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(659,9): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(816,46): error TS2339: Property 'getLocationAnalytics' does not exist on type 'Model<IUserSession, {}, {}, {}, Document<unknown, {}, IUserSession, {}> & IUserSession & Required<{ \_id: unknown; }> & { **v: number; }, any>'.
@ai-job-suite/backend:build: src/services/analyticsService.ts(896,46): error TS2339: Property 'getLocationAnalytics' does not exist on type 'Model<IUserSession, {}, {}, {}, Document<unknown, {}, IUserSession, {}> & IUserSession & Required<{ \_id: unknown; }> & { **v: number; }, any>'.
@ai-job-suite/backend:build: src/services/calendarService.ts(179,20): error TS2339: Property 'profile' does not exist on type 'IUser'.
@ai-job-suite/backend:build: src/services/calendarService.ts(179,49): error TS2339: Property 'profile' does not exist on type 'IUser'.
@ai-job-suite/backend:build: src/services/calendarService.ts(179,75): error TS2339: Property 'profile' does not exist on type 'IUser'.
@ai-job-suite/backend:build: src/services/calendarService.ts(224,28): error TS2339: Property 'profile' does not exist on type 'IUser'.
@ai-job-suite/backend:build: src/services/emailService.ts(35,24): error TS2503: Cannot find namespace 'nodemailer'.
@ai-job-suite/backend:build: src/services/emailService.ts(90,26): error TS2503: Cannot find namespace 'nodemailer'.
@ai-job-suite/backend:build: src/services/emailService.ts(121,26): error TS2503: Cannot find namespace 'nodemailer'.
@ai-job-suite/backend:build: src/services/emailService.ts(148,26): error TS2503: Cannot find namespace 'nodemailer'.
@ai-job-suite/backend:build: src/services/emailService.ts(179,26): error TS2503: Cannot find namespace 'nodemailer'.
@ai-job-suite/backend:build: src/services/emailService.ts(204,26): error TS2503: Cannot find namespace 'nodemailer'.
@ai-job-suite/backend:build: src/services/emailService.ts(982,9): error TS2393: Duplicate function implementation.
@ai-job-suite/backend:build: src/services/emailService.ts(1173,9): error TS2393: Duplicate function implementation.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(139,31): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(142,27): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(476,44): error TS2322: Type 'string' is not assignable to type '"manual" | "linkedin" | "indeed" | "glassdoor" | "company_website" | "referral" | "recruiter"'.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(477,52): error TS2322: Type 'string' is not assignable to type '"email" | "referral" | "recruiter" | "online" | "career_fair" | "networking"'.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(489,9): error TS2322: Type '{ salaryRange?: { min?: number; max?: number; currency?: string; period?: string; }; equity?: { min?: number; max?: number; type?: string; }; benefits?: string[]; bonusStructure?: string; totalCompensation?: number; }' is not assignable to type '{ salaryRange?: { min: number; max: number; currency: string; period: "hourly" | "monthly" | "yearly"; }; equity?: { min: number; max: number; type: "options" | "rsu" | "percentage"; }; benefits?: string[]; bonusStructure?: string; totalCompensation?: number; }'.
@ai-job-suite/backend:build: Types of property 'salaryRange' are incompatible.
@ai-job-suite/backend:build: Type '{ min?: number; max?: number; currency?: string; period?: string; }' is not assignable to type '{ min: number; max: number; currency: string; period: "hourly" | "monthly" | "yearly"; }'.
@ai-job-suite/backend:build: Property 'min' is optional in type '{ min?: number; max?: number; currency?: string; period?: string; }' but required in type '{ min: number; max: number; currency: string; period: "hourly" | "monthly" | "yearly"; }'.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(520,9): error TS2322: Type '{ resumeId?: string | mongoose.Types.ObjectId; resumeContent?: string; coverLetterId?: string | mongoose.Types.ObjectId; portfolioLinks?: string[]; additionalDocuments?: { name: string; url: string; type: "transcript" | "portfolio" | "writing_sample" | "code_sample" | "references" | "other"; uploadDate: Date; }[]; t...' is not assignable to type '{ resumeId?: ObjectId; resumeContent?: string; coverLetterId?: ObjectId; portfolioLinks?: string[]; additionalDocuments?: { name: string; url: string; type: "other" | "references" | "transcript" | "portfolio" | "writing_sample" | "code_sample"; uploadDate: Date; }[]; technicalAssessments?: { ...; }[]; }'.
@ai-job-suite/backend:build: Types of property 'resumeId' are incompatible.
@ai-job-suite/backend:build: Type 'string | ObjectId' is not assignable to type 'ObjectId'.
@ai-job-suite/backend:build: Type 'string' is not assignable to type 'ObjectId'.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(1131,33): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/jobApplicationService.ts(1157,33): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(100,33): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(150,40): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(291,33): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(313,33): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(427,45): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(447,47): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(493,49): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(524,45): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(553,43): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(571,18): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(596,42): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(607,50): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(668,52): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/jobMatchingService.ts(723,18): error TS2304: Cannot find name 'IUserProfile'.
@ai-job-suite/backend:build: src/services/locationService.ts(287,42): error TS2769: No overload matches this call.
@ai-job-suite/backend:build: The last overload gave the following error.
@ai-job-suite/backend:build: Argument of type 'unknown' is not assignable to parameter of type 'string | number | ObjectId | Uint8Array<ArrayBufferLike> | ObjectIdLike'.
@ai-job-suite/backend:build: src/services/locationService.ts(310,56): error TS2769: No overload matches this call.
@ai-job-suite/backend:build: The last overload gave the following error.
@ai-job-suite/backend:build: Argument of type 'unknown' is not assignable to parameter of type 'string | number | ObjectId | Uint8Array<ArrayBufferLike> | ObjectIdLike'.
@ai-job-suite/backend:build: src/services/locationService.ts(436,47): error TS2551: Property 'parent' does not exist on type 'ILocation'. Did you mean '$parent'?
@ai-job-suite/backend:build: src/services/locationService.ts(437,44): error TS2551: Property 'parent' does not exist on type 'ILocation'. Did you mean '$parent'?
@ai-job-suite/backend:build: src/services/otpService.ts(22,22): error TS2769: No overload matches this call.
@ai-job-suite/backend:build: Overload 1 of 8, '(options: RedisOptions): Redis', gave the following error.
@ai-job-suite/backend:build: Object literal may only specify known properties, and 'retryDelayOnFailover' does not exist in type 'RedisOptions'.
@ai-job-suite/backend:build: Overload 2 of 8, '(port: number): Redis', gave the following error.
@ai-job-suite/backend:build: Argument of type '{ host: string; port: number; password: string; retryDelayOnFailover: number; maxRetriesPerRequest: number; lazyConnect: boolean; }' is not assignable to parameter of type 'number'.
@ai-job-suite/backend:build: Overload 3 of 8, '(path: string): Redis', gave the following error.
@ai-job-suite/backend:build: Argument of type '{ host: string; port: number; password: string; retryDelayOnFailover: number; maxRetriesPerRequest: number; lazyConnect: boolean; }' is not assignable to parameter of type 'string'.
@ai-job-suite/backend:build: src/services/paymentService.ts(98,35): error TS2503: Cannot find namespace 'z'.
@ai-job-suite/backend:build: src/services/paymentService.ts(209,36): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(219,67): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(223,66): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(227,63): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(231,69): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(235,69): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(253,50): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(306,49): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(337,46): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(362,42): error TS2503: Cannot find namespace 'z'.
@ai-job-suite/backend:build: src/services/paymentService.ts(523,60): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/paymentService.ts(527,60): error TS2503: Cannot find namespace 'Stripe'.
@ai-job-suite/backend:build: src/services/securityService.ts(515,13): error TS2304: Cannot find name 'UserProfile'.
@ai-job-suite/backend:build: src/services/simpleAnalyticsService.ts(249,11): error TS2339: Property 'summary' does not exist on type 'Document<unknown, {}, IResume, {}> & IResume & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/services/simpleAnalyticsService.ts(250,11): error TS2339: Property 'experience' does not exist on type 'Document<unknown, {}, IResume, {}> & IResume & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/services/simpleAnalyticsService.ts(251,11): error TS2339: Property 'experience' does not exist on type 'Document<unknown, {}, IResume, {}> & IResume & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/services/simpleAnalyticsService.ts(832,16): error TS2339: Property 'profile' does not exist on type 'Document<unknown, {}, IUser, {}> & IUser & Required<{ \_id: unknown; }> & { **v: number; }'.
@ai-job-suite/backend:build: src/services/simpleAnalyticsService.ts(833,36): error TS2339: Property 'profile' does not exist on type 'Document<unknown, {}, IUser, {}> & IUser & Required<{ \_id: unknown; }> & { \_\_v: number; }'.
@ai-job-suite/backend:build: src/utils/jwt.ts(15,14): error TS2769: No overload matches this call.
@ai-job-suite/backend:build: Overload 1 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: null, options?: SignOptions & { algorithm: "none"; }): string', gave the following error.
@ai-job-suite/backend:build: Argument of type 'string' is not assignable to parameter of type 'null'.
@ai-job-suite/backend:build: Overload 2 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, options?: SignOptions): string', gave the following error.
@ai-job-suite/backend:build: Type 'string' is not assignable to type 'number | StringValue'.
@ai-job-suite/backend:build: Overload 3 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, callback: SignCallback): void', gave the following error.
@ai-job-suite/backend:build: Object literal may only specify known properties, and 'expiresIn' does not exist in type 'SignCallback'.
@ai-job-suite/backend:build: src/utils/jwt.ts(23,14): error TS2769: No overload matches this call.
@ai-job-suite/backend:build: Overload 1 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: null, options?: SignOptions & { algorithm: "none"; }): string', gave the following error.
@ai-job-suite/backend:build: Argument of type 'string' is not assignable to parameter of type 'null'.
@ai-job-suite/backend:build: Overload 2 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, options?: SignOptions): string', gave the following error.
@ai-job-suite/backend:build: Type 'string' is not assignable to type 'number | StringValue'.
@ai-job-suite/backend:build: Overload 3 of 5, '(payload: string | object | Buffer<ArrayBufferLike>, secretOrPrivateKey: Buffer<ArrayBufferLike> | Secret | PrivateKeyInput | JsonWebKeyInput, callback: SignCallback): void', gave the following error.
@ai-job-suite/backend:build: Object literal may only specify known properties, and 'expiresIn' does not exist in type 'SignCallback'.
@ai-job-suite/backend:build:  ELIFECYCLE  Command failed with exit code 1.
@ai-job-suite/backend:build: ERROR: command finished with error: command (C:\Users\ngwen\MyProjects\ai-job-suite\apps\backend) C:\Users\ngwen\AppData\Local\pnpm\.tools\pnpm\8.15.0\bin\pnpm.CMD run build exited (1)
@ai-job-suite/backend#build: command (C:\Users\ngwen\MyProjects\ai-job-suite\apps\backend) C:\Users\ngwen\AppData\Local\pnpm\.tools\pnpm\8.15.0\bin\pnpm.CMD run build exited (1)

Tasks: 1 successful, 2 total
Cached: 0 cached, 2 total
Time: 1m0.995s
Failed: @ai-job-suite/backend#build

ERROR run failed: command exited (1)
 ELIFECYCLE  Command failed with exit code 1.
PS C:\Users\ngwen\MyProjects\ai-job-suite> pnpm install && pnpm run build

> >
