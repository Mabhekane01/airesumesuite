Cloning from https://github.com/Mabhekane01/airesumesuite
==> Checking out commit 96d13bfbefb5b3a0e1c78444c1c798b0d38405e5 in branch main
==> Using Node.js version 22.16.0 (default)
==> Docs on specifying a Node.js version: https://render.com/docs/node-version
==> Running build command 'pnpm install --frozen-lockfile; pnpm run build'...
Scope: all 3 workspace projects
.../esbuild@0.21.5/node*modules/esbuild postinstall$ node install.js
.../esbuild@0.25.8/node_modules/esbuild postinstall$ node install.js
.../esbuild@0.21.5/node_modules/esbuild postinstall: Done
.../esbuild@0.25.8/node_modules/esbuild postinstall: Done
.../canvas@2.11.2/node_modules/canvas install$ node-pre-gyp install --fallback-to-build --update-binary
.../canvas@2.11.2/node_modules/canvas install: node-pre-gyp ERR! install response status 404 Not Found on https://github.com/Automattic/node-canvas/releases/download/v2.11.2/canvas-v2.11.2-node-v127-linux-glibc-x64.tar.gz
.../canvas@2.11.2/node_modules/canvas install: (node:208) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
.../canvas@2.11.2/node_modules/canvas install: (Use `node --trace-deprecation ...` to show where the warning was created)
.../canvas@2.11.2/node_modules/canvas install: make: Entering directory '/opt/render/project/src/node_modules/.pnpm/canvas@2.11.2/node_modules/canvas/build'
.../canvas@2.11.2/node_modules/canvas install: SOLINK_MODULE(target) Release/obj.target/canvas-postbuild.node
.../canvas@2.11.2/node_modules/canvas install: COPY Release/canvas-postbuild.node
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/backend/Backend.o
.../canvas@2.11.2/node_modules/canvas install: In file included from /opt/render/.cache/22.16.0/include/node/v8-local-handle.h:13,
.../canvas@2.11.2/node_modules/canvas install: from /opt/render/.cache/22.16.0/include/node/v8-array-buffer.h:12,
.../canvas@2.11.2/node_modules/canvas install: from /opt/render/.cache/22.16.0/include/node/v8.h:24,
.../canvas@2.11.2/node_modules/canvas install: from /opt/render/.cache/22.16.0/include/node/node.h:74,
.../canvas@2.11.2/node_modules/canvas install: from ../../../../nan@2.23.0/node_modules/nan/nan.h:62,
.../canvas@2.11.2/node_modules/canvas install: from ../src/backend/Backend.h:6,
.../canvas@2.11.2/node_modules/canvas install: from ../src/backend/Backend.cc:1:
.../canvas@2.11.2/node_modules/canvas install: In member function ‘bool v8::api_internal::IndirectHandleBase::IsEmpty() const’,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void v8::PersistentBase<T>::Reset() [with T = v8::Object]’ at /opt/render/.cache/22.16.0/include/node/v8-persistent-handle.h:469:20,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void v8::PersistentBase<T>::Reset(v8::Isolate\*, const v8::Local<S>&) [with S = v8::Object; T = v8::Object]’ at /opt/render/.cache/22.16.0/include/node/v8-persistent-handle.h:482:8,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void Nan::Persistent<T, M>::Reset(const v8::Local<S>&) [with S = v8::Object; T = v8::Object; M = v8::NonCopyablePersistentTraits<v8::Object>]’ at ../../../../nan@2.23.0/node_modules/nan/nan_persistent_12_inl.h:29:33,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void Nan::ObjectWrap::Wrap(v8::Local<v8::Object>)’ at ../../../../nan@2.23.0/node_modules/nan/nan_object_wrap.h:56:23,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘static void Backend::init(const Nan::FunctionCallbackInfo<v8::Value>&)’ at ../src/backend/Backend.cc:23:16:
.../canvas@2.11.2/node_modules/canvas install: /opt/render/.cache/22.16.0/include/node/v8-handle-base.h:56:43: warning: array subscript 0 is outside array bounds of ‘Nan::Persistent<v8::Object> [0]’ [-Warray-bounds]
.../canvas@2.11.2/node_modules/canvas install: 56 | V8_INLINE bool IsEmpty() const { return location* == nullptr; }
.../canvas@2.11.2/node*modules/canvas install: | ^~~~~~~~~
.../canvas@2.11.2/node_modules/canvas install: In member function ‘void v8::api_internal::IndirectHandleBase::Clear()’,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void v8::PersistentBase<T>::Reset() [with T = v8::Object]’ at /opt/render/.cache/22.16.0/include/node/v8-persistent-handle.h:471:14,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void v8::PersistentBase<T>::Reset(v8::Isolate\*, const v8::Local<S>&) [with S = v8::Object; T = v8::Object]’ at /opt/render/.cache/22.16.0/include/node/v8-persistent-handle.h:482:8,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void Nan::Persistent<T, M>::Reset(const v8::Local<S>&) [with S = v8::Object; T = v8::Object; M = v8::NonCopyablePersistentTraits<v8::Object>]’ at ../../../../nan@2.23.0/node_modules/nan/nan_persistent_12_inl.h:29:33,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void Nan::ObjectWrap::Wrap(v8::Local<v8::Object>)’ at ../../../../nan@2.23.0/node_modules/nan/nan_object_wrap.h:56:23,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘static void Backend::init(const Nan::FunctionCallbackInfo<v8::Value>&)’ at ../src/backend/Backend.cc:23:16:
.../canvas@2.11.2/node_modules/canvas install: /opt/render/.cache/22.16.0/include/node/v8-handle-base.h:59:38: warning: array subscript 0 is outside array bounds of ‘Nan::Persistent<v8::Object> [0]’ [-Warray-bounds]
.../canvas@2.11.2/node_modules/canvas install: 59 | V8_INLINE void Clear() { location* = nullptr; }
.../canvas@2.11.2/node_modules/canvas install: | ~~~~~~~~~~^~~~~~~~~
.../canvas@2.11.2/node_modules/canvas install: In file included from /opt/render/.cache/22.16.0/include/node/v8-object.h:10,
.../canvas@2.11.2/node_modules/canvas install: from /opt/render/.cache/22.16.0/include/node/v8-array-buffer.h:13:
.../canvas@2.11.2/node_modules/canvas install: In member function ‘void v8::PersistentBase<T>::Reset(v8::Isolate*, const v8::Local<S>&) [with S = v8::Object; T = v8::Object]’,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void Nan::Persistent<T, M>::Reset(const v8::Local<S>&) [with S = v8::Object; T = v8::Object; M = v8::NonCopyablePersistentTraits<v8::Object>]’ at ../../../../nan@2.23.0/node_modules/nan/nan_persistent_12_inl.h:29:33,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘void Nan::ObjectWrap::Wrap(v8::Local<v8::Object>)’ at ../../../../nan@2.23.0/node_modules/nan/nan_object_wrap.h:56:23,
.../canvas@2.11.2/node_modules/canvas install: inlined from ‘static void Backend::init(const Nan::FunctionCallbackInfo<v8::Value>&)’ at ../src/backend/Backend.cc:23:16:
.../canvas@2.11.2/node_modules/canvas install: /opt/render/.cache/22.16.0/include/node/v8-persistent-handle.h:484:16: warning: array subscript 0 is outside array bounds of ‘Nan::Persistent<v8::Object> [0]’ [-Warray-bounds]
.../canvas@2.11.2/node_modules/canvas install: 484 | this->slot() = New(isolate, *other);
.../canvas@2.11.2/node_modules/canvas install: | ~~~~~~~~~~~~~^~~~~~~~~~~~~~~~~~~~~~
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/backend/ImageBackend.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/backend/PdfBackend.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/backend/SvgBackend.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/bmp/BMPParser.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/Backends.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/Canvas.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/CanvasGradient.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/CanvasPattern.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/CanvasRenderingContext2d.o
.../canvas@2.11.2/node_modules/canvas install: ../src/CanvasRenderingContext2d.cc: In member function ‘void Context2d::setTextPath(double, double)’:
.../canvas@2.11.2/node_modules/canvas install: ../src/CanvasRenderingContext2d.cc:2500:10: warning: enumeration value ‘TEXT_ALIGNMENT_LEFT’ not handled in switch [-Wswitch]
.../canvas@2.11.2/node_modules/canvas install: 2500 | switch (state->textAlignment) {
.../canvas@2.11.2/node_modules/canvas install: | ^
.../canvas@2.11.2/node_modules/canvas install: ../src/CanvasRenderingContext2d.cc:2500:10: warning: enumeration value ‘TEXT_ALIGNMENT_START’ not handled in switch [-Wswitch]
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/closure.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/color.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/Image.o
.../canvas@2.11.2/node_modules/canvas install: ../src/Image.cc: In member function ‘cairo_status_t Image::loadSVGFromBuffer(uint8_t*, unsigned int)’:
.../canvas@2.11.2/node_modules/canvas install: ../src/Image.cc:1196:29: warning: ‘void rsvg_handle_get_dimensions(RsvgHandle*, RsvgDimensionData*)’ is deprecated: Use 'rsvg_handle_get_intrinsic_size_in_pixels' instead [-Wdeprecated-declarations]
.../canvas@2.11.2/node_modules/canvas install: 1196 | rsvg_handle_get_dimensions(\_rsvg, dims);
.../canvas@2.11.2/node_modules/canvas install: | ~~~~~~~~~~~~~~~~~~~~~~~~~~^~~~~~~~~~~~~
.../canvas@2.11.2/node_modules/canvas install: In file included from ../src/Image.h:28,
.../canvas@2.11.2/node_modules/canvas install: from ../src/Image.cc:3:
.../canvas@2.11.2/node_modules/canvas install: /usr/include/librsvg-2.0/librsvg/rsvg.h:708:6: note: declared here
.../canvas@2.11.2/node_modules/canvas install: 708 | void rsvg_handle_get_dimensions (RsvgHandle *handle, RsvgDimensionData _dimension_data);
.../canvas@2.11.2/node_modules/canvas install: | ^~~~~~~~~~~~~~~~~~~~~~~~~~
.../canvas@2.11.2/node_modules/canvas install: ../src/Image.cc: In member function ‘cairo_status_t Image::renderSVGToSurface()’:
.../canvas@2.11.2/node_modules/canvas install: ../src/Image.cc:1235:48: warning: ‘gboolean rsvg_handle_render_cairo(RsvgHandle_, cairo_t*)’ is deprecated: Use 'rsvg_handle_render_document' instead [-Wdeprecated-declarations]
.../canvas@2.11.2/node_modules/canvas install: 1235 | gboolean render_ok = rsvg_handle_render_cairo(\_rsvg, cr);
.../canvas@2.11.2/node_modules/canvas install: | ~~~~~~~~~~~~~~~~~~~~~~~~^~~~~~~~~~~
.../canvas@2.11.2/node_modules/canvas install: In file included from /usr/include/librsvg-2.0/librsvg/rsvg.h:1452:
.../canvas@2.11.2/node_modules/canvas install: /usr/include/librsvg-2.0/librsvg/rsvg-cairo.h:88:10: note: declared here
.../canvas@2.11.2/node_modules/canvas install: 88 | gboolean rsvg_handle_render_cairo (RsvgHandle *handle, cairo_t \*cr);
.../canvas@2.11.2/node_modules/canvas install: | ^~~~~~~~~~~~~~~~~~~~~~~~
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/ImageData.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/init.o
.../canvas@2.11.2/node_modules/canvas install: CXX(target) Release/obj.target/canvas/src/register_font.o
.../canvas@2.11.2/node_modules/canvas install: SOLINK_MODULE(target) Release/obj.target/canvas.node
.../canvas@2.11.2/node_modules/canvas install: COPY Release/canvas.node
.../canvas@2.11.2/node_modules/canvas install: make: Leaving directory '/opt/render/project/src/node_modules/.pnpm/canvas@2.11.2/node_modules/canvas/build'
.../canvas@2.11.2/node_modules/canvas install: Done
.../node_modules/puppeteer postinstall$ node install.mjs
.../node_modules/puppeteer postinstall: Done
dependencies:

- node-cron 3.0.3
  devDependencies:
- @playwright/test 1.54.1
- @types/node 20.19.9
- @types/node-cron 3.0.11
- turbo 1.13.4
- typescript 5.8.3
  apps/backend postinstall$ echo 'Skipping Puppeteer Chromium download on production'
  apps/backend postinstall: Skipping Puppeteer Chromium download on production
  apps/backend postinstall: Done
  Done in 43.9s
  > ai-job-suite@1.0.0 build /opt/render/project/src
  > turbo run build
  > Attention:
  > Turborepo now collects completely anonymous telemetry regarding usage.
  > This information is used to shape the Turborepo roadmap and prioritize features.
  > You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
  > https://turbo.build/repo/docs/telemetry
  > • Packages in scope: @ai-job-suite/backend, @ai-job-suite/frontend
  > • Running build in 2 packages
  > • Remote caching disabled
  > @ai-job-suite/backend:build: cache miss, executing 9f9c10c114b20e59
  > @ai-job-suite/frontend:build: cache miss, executing cb25eade630960b2
  > @ai-job-suite/frontend:build:
  > @ai-job-suite/frontend:build: > @ai-job-suite/frontend@1.0.0 build /opt/render/project/src/apps/frontend
  > @ai-job-suite/frontend:build: > vite build
  > @ai-job-suite/frontend:build:
  > @ai-job-suite/backend:build:
  > @ai-job-suite/backend:build: > @ai-job-suite/backend@1.0.0 build /opt/render/project/src/apps/backend
  > @ai-job-suite/backend:build: > tsc
  > @ai-job-suite/backend:build:
  > @ai-job-suite/frontend:build: vite v5.4.19 building for production...
  > @ai-job-suite/frontend:build: transforming...
  > @ai-job-suite/frontend:build: ✓ 1840 modules transformed.
  > @ai-job-suite/frontend:build: [plugin:vite:reporter] [plugin vite:reporter]
  > @ai-job-suite/frontend:build: (!) /opt/render/project/src/apps/frontend/src/services/resumeService.ts is dynamically imported by /opt/render/project/src/apps/frontend/src/contexts/ResumeContext.tsx but also statically imported by /opt/render/project/src/apps/frontend/src/components/career-coach/ResumeDisplay.tsx, /opt/render/project/src/apps/frontend/src/components/documents/CoverLetterEditor.tsx, /opt/render/project/src/apps/frontend/src/components/documents/ResumePDFPreviewSimple.tsx, /opt/render/project/src/apps/frontend/src/components/resume/ATSCompatibilityChecker.tsx, /opt/render/project/src/apps/frontend/src/components/resume/EnhancedResumePreview.tsx, /opt/render/project/src/apps/frontend/src/components/resume/EnterpriseResumeEnhancer.tsx, /opt/render/project/src/apps/frontend/src/components/resume/JobOptimizationModal.tsx, /opt/render/project/src/apps/frontend/src/components/resume/ProfessionalSummaryForm.tsx, /opt/render/project/src/apps/frontend/src/components/resume/ResumeDownloadManager.tsx, /opt/render/project/src/apps/frontend/src/pages/DocumentManager.tsx, /opt/render/project/src/apps/frontend/src/pages/resume-builder/ComprehensiveResumeBuilder.tsx, /opt/render/project/src/apps/frontend/src/pages/resume-builder/ResumePreviewPage.tsx, /opt/render/project/src/apps/frontend/src/pages/resume-builder/TemplateSelection.tsx, /opt/render/project/src/apps/frontend/src/stores/resumeStore.ts, dynamic import will not move module into another chunk.
  > @ai-job-suite/frontend:build:
  > @ai-job-suite/frontend:build: rendering chunks...
  > @ai-job-suite/frontend:build: computing gzip size...
  > @ai-job-suite/frontend:build: dist/index.html 0.79 kB │ gzip: 0.48 kB
  > @ai-job-suite/frontend:build: dist/assets/index-DM1yWzTi.css 148.22 kB │ gzip: 20.17 kB
  > @ai-job-suite/frontend:build: dist/assets/index-7p3EW3WL.js 1,614.43 kB │ gzip: 428.92 kB │ map: 5,879.98 kB
  > @ai-job-suite/frontend:build:
  > @ai-job-suite/frontend:build: (!) Some chunks are larger than 500 kB after minification. Consider:
  > @ai-job-suite/frontend:build: - Using dynamic import() to code-split the application
  > @ai-job-suite/frontend:build: - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
  > @ai-job-suite/frontend:build: - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
  > @ai-job-suite/frontend:build: ✓ built in 14.96s
  > Tasks: 2 successful, 2 total
  > Cached: 0 cached, 2 total
  > Time: 17.359s
  > ==> Uploading build...
  > ==> Uploaded in 6.4s. Compression took 6.8s
  > ==> Build successful 🎉
  > ==> Deploying...
  > ==> Running 'pnpm start'
  > ==> Exited with status 1
  > ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
  >  ERR_PNPM_NO_SCRIPT_OR_SERVER  Missing script start or file server.js
  > ==> Running 'pnpm start'
  >  ERR_PNPM_NO_SCRIPT_OR_SERVER  Missing script start or file server.js
