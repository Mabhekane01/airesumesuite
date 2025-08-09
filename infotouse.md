                                                                                         0.0s

=> CACHED [1/7] FROM ghcr.io/puppeteer/puppeteer:21.6.1@sha256:d41d0271c774019a9bf6a1bbec8071d067558815f047bc6f15c84ebab12f03 0.1s
=> => resolve ghcr.io/puppeteer/puppeteer:21.6.1@sha256:d41d0271c774019a9bf6a1bbec8071d067558815f047bc6f15c84ebab12f0391 0.0s
=> [2/7] RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrom 1.1s
=> ERROR [3/7] RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip build-essenti 0.8s

---

> [3/7] RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip build-essential make g++ texlive-latex-base texlive-latex-recommended texlive-plain-generic lmodern fonts-liberation fonts-dejavu-core texlive-fonts-recommended texlive-fonts-extra texlive-luatex texlive-xetex texlive-latex-extra texlive-pictures texlive-science ghostscript imagemagick poppler-utils && apt-get clean && rm -rf /var/lib/apt/lists/\* && apt-get autoremove -y:
> 0.748 E: Conflicting values set for option Signed-By regarding source https://dl.google.com/linux/chrome/deb/ stable: /usr/share/keyrings/google-chrome-keyring.gpg != /usr/share/keyrings/googlechrome-linux-keyring.gpg

## 0.748 E: The list of sources could not be read.

## Dockerfile.latex-base:22

21 | # Install LaTeX packages (Puppeteer dependencies already in base image)
22 | >>> RUN apt-get update && apt-get install -y --no-install-recommends \
 23 | >>> # Python and build tools
24 | >>> python3 \
 25 | >>> python3-pip \
 26 | >>> build-essential \
 27 | >>> make \
 28 | >>> g++ \
 29 | >>> # Core LaTeX packages
30 | >>> texlive-latex-base \
 31 | >>> texlive-latex-recommended \
 32 | >>> texlive-plain-generic \
 33 | >>> # Font packages
34 | >>> lmodern \
 35 | >>> fonts-liberation \
 36 | >>> fonts-dejavu-core \
 37 | >>> texlive-fonts-recommended \
 38 | >>> texlive-fonts-extra \
 39 | >>> # LaTeX engines
40 | >>> texlive-luatex \
 41 | >>> texlive-xetex \
 42 | >>> # Extended LaTeX packages
43 | >>> texlive-latex-extra \
 44 | >>> texlive-pictures \
 45 | >>> texlive-science \
 46 | >>> # Document processing utilities
47 | >>> ghostscript \
 48 | >>> imagemagick \
 49 | >>> poppler-utils \
 50 | >>> && apt-get clean \
 51 | >>> && rm -rf /var/lib/apt/lists/\* \
 52 | >>> && apt-get autoremove -y
53 |

---

ERROR: failed to build: failed to solve: process "/bin/sh -c apt-get update && apt-get install -y --no-install-recommends python3 python3-pip build-essential make g++ texlive-latex-base texlive-latex-recommended texlive-plain-generic lmodern fonts-liberation fonts-dejavu-core texlive-fonts-recommended texlive-fonts-extra texlive-luatex texlive-xetex texlive-latex-extra texlive-pictures texlive-science ghostscript imagemagick poppler-utils && apt-get clean && rm -rf /var/lib/apt/lists/\* && apt-get autoremove -y" did not complete successfully: exit code: 100

C:\Users\ngwen\MyProjects\ai-job-suite>
