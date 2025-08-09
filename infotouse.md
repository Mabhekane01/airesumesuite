docker build -f docker/Dockerfile.latex-base -t ghcr.io/mabhakane01/ai-job-suite-latex-base:latest .
[+] Building 1258.7s (12/12) FINISHED                                                                           docker:desktop-linux
 => [internal] load build definition from Dockerfile.latex-base                                                                 0.1s
 => => transferring dockerfile: 3.55kB                                                                                          0.1s
 => [internal] load metadata for docker.io/library/node:18-bullseye                                                             3.4s
 => [auth] library/node:pull token for registry-1.docker.io                                                                     0.0s
 => [internal] load .dockerignore                                                                                               0.1s
 => => transferring context: 1.96kB                                                                                             0.0s
 => [1/7] FROM docker.io/library/node:18-bullseye@sha256:0d9e9a8dcd5a83ea737ed92227a6591a31ad70c8bb722b0c51aff7ae23a88b6a     189.9s
 => => resolve docker.io/library/node:18-bullseye@sha256:0d9e9a8dcd5a83ea737ed92227a6591a31ad70c8bb722b0c51aff7ae23a88b6a       0.1s
 => => sha256:9fa90b7e18162da14889d6ddb66f9e31a75d67a3b5bf8a2e7630fc35488077a1 445B / 445B                                      2.0s
 => => sha256:8c1ed1def9d2c13e8c4bda737f49eb6aa8ac78039c286d76f5bd410688a73869 1.25MB / 1.25MB                                  1.7s
 => => sha256:762aa0aa2e631582317b64a1a5001c5fa54fd63e58a4b7d268fc35d9644778bf 45.68MB / 45.68MB                               71.8s
 => => sha256:7704b1a39512dedbda42a035f22899a5bc0051dc5d5b4663b208efd8f096d54c 4.08kB / 4.08kB                                  0.6s
 => => sha256:e94932625c5ab18ebb7640ecd70dd33061ba90cc7666b7ff06042a8bd7cf63fb 197.13MB / 197.13MB                            157.7s
 => => sha256:9a69a02035012d2783a66ac7ecc549af09c1718d81affa5f9c39abcf969da971 54.76MB / 54.76MB                               95.1s
 => => sha256:06b6c820e694a6c19c297492ef4009391c7dfc83ecae735895f31a89e78b31fc 15.76MB / 15.76MB                               20.9s
 => => sha256:54107f2de180b7b6e9f909d2f1c6c18e10c700a6bd80a035d931768b06bb2905 53.75MB / 53.75MB                               78.9s
 => => extracting sha256:54107f2de180b7b6e9f909d2f1c6c18e10c700a6bd80a035d931768b06bb2905                                       9.4s
 => => extracting sha256:06b6c820e694a6c19c297492ef4009391c7dfc83ecae735895f31a89e78b31fc                                       1.3s
 => => extracting sha256:9a69a02035012d2783a66ac7ecc549af09c1718d81affa5f9c39abcf969da971                                       8.6s
 => => extracting sha256:e94932625c5ab18ebb7640ecd70dd33061ba90cc7666b7ff06042a8bd7cf63fb                                      20.0s
 => => extracting sha256:7704b1a39512dedbda42a035f22899a5bc0051dc5d5b4663b208efd8f096d54c                                       0.1s
 => => extracting sha256:762aa0aa2e631582317b64a1a5001c5fa54fd63e58a4b7d268fc35d9644778bf                                       8.8s
 => => extracting sha256:8c1ed1def9d2c13e8c4bda737f49eb6aa8ac78039c286d76f5bd410688a73869                                       0.2s
 => => extracting sha256:9fa90b7e18162da14889d6ddb66f9e31a75d67a3b5bf8a2e7630fc35488077a1                                       0.1s
 => [2/7] RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser     && mkdir -p /home/appuser/Downloads      46.0s
 => [3/7] RUN apt-get update && apt-get install -y --no-install-recommends     ca-certificates     curl     gnupg     lsb-re  664.6s
 => [4/7] RUN npm install -g pnpm@8.15.0                                                                                        7.1s
 => [5/7] RUN texhash &&     latex --version &&     pdflatex --version &&     xelatex --version &&     lualatex --version       1.3s
 => [6/7] WORKDIR /app                                                                                                          0.2s
 => [7/7] RUN mkdir -p /app/uploads /app/latex-workspace/templates /app/latex-workspace/output &&     chown -R appuser:appuser  0.6s
 => exporting to image                                                                                                        344.5s
 => => exporting layers                                                                                                       238.8s
 => => exporting manifest sha256:777d9b646522450889b8f9c82231057ea6039316921bddb1f23843a99b7d392c                               0.1s
 => => exporting config sha256:0e58344f6a9554c880f7158979be8f06e96fae7c69bb44dce82480063ba116db                                 0.1s
 => => exporting attestation manifest sha256:259f99a660b0ce84fc64635cfcec180ea353969d0df395d47ed177adb08d6ff0                   0.1s
 => => exporting manifest list sha256:da87562a9c2bd81a6a20fd97daeb3158e7dca33523ebc1b30236719a8c683b50                          0.1s
 => => naming to ghcr.io/mabhakane01/ai-job-suite-latex-base:latest                                                             0.0s
 => => unpacking to ghcr.io/mabhakane01/ai-job-suite-latex-base:latest                                                        105.3s

C:\Users\ngwen\MyProjects\ai-job-suite>docker push ghcr.io/mabhakane01/ai-job-suite-latex-base:latest
The push refers to repository [ghcr.io/mabhakane01/ai-job-suite-latex-base]
9fa90b7e1816: Waiting
56fb35d19ae6: Waiting
36ab681a2340: Waiting
9a69a0203501: Waiting
762aa0aa2e63: Waiting
54107f2de180: Waiting
06b6c820e694: Waiting
e53386b59fc5: Waiting
71291e77f507: Waiting
e192f5ccb21d: Waiting
bf06c1425464: Waiting
7704b1a39512: Waiting
e94932625c5a: Waiting
5e4d312ef288: Waiting
8c1ed1def9d2: Waiting
error from registry: not_found: owner not found

C:\Users\ngwen\MyProjects\ai-job-suite>docker login ghcr.io
Authenticating with existing credentials... [Username: mabhekane01]

i Info → To login with a different account, run 'docker logout' followed by 'docker login'


Login Succeeded

C:\Users\ngwen\MyProjects\ai-job-suite>docker push ghcr.io/mabhakane01/ai-job-suite-latex-base:latest
The push refers to repository [ghcr.io/mabhakane01/ai-job-suite-latex-base]
9a69a0203501: Waiting
71291e77f507: Waiting
e94932625c5a: Waiting
54107f2de180: Waiting
56fb35d19ae6: Waiting
8c1ed1def9d2: Waiting
e192f5ccb21d: Waiting
06b6c820e694: Waiting
e53386b59fc5: Waiting
762aa0aa2e63: Waiting
36ab681a2340: Waiting
bf06c1425464: Waiting
5e4d312ef288: Waiting
7704b1a39512: Waiting
9fa90b7e1816: Waiting
error from registry: not_found: owner not found

C:\Users\ngwen\MyProjects\ai-job-suite>docker tag ghcr.io/mabhakane01/ai-job-suite-latex-base:latest ghcr.io/mabhekane01/ai-job-suite-latex-base:latest

C:\Users\ngwen\MyProjects\ai-job-suite>docker push ghcr.io/mabhekane01/ai-job-suite-latex-base:latest
The push refers to repository [ghcr.io/mabhekane01/ai-job-suite-latex-base]
8c1ed1def9d2: Pushed
54107f2de180: Pushed
36ab681a2340: Pushed
56fb35d19ae6: Pushed
e53386b59fc5: Pushed
06b6c820e694: Pushed
e94932625c5a: Pushed
5e4d312ef288: Pushed
71291e77f507: Pushed
9fa90b7e1816: Pushed
9a69a0203501: Pushed
7704b1a39512: Pushed
e192f5ccb21d: Pushed
762aa0aa2e63: Pushed
bf06c1425464: Pushed
latest: digest: sha256:da87562a9c2bd81a6a20fd97daeb3158e7dca33523ebc1b30236719a8c683b50 size: 856

C:\Users\ngwen\MyProjects\ai-job-suite>