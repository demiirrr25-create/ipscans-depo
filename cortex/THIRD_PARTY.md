# Third-party components

- Python: https://www.python.org/psf/license/
- PyInstaller (bootloader distribution exception): https://pyinstaller.org/en/stable/license.html
- cryptography: Apache-2.0 / BSD-3-Clause, https://github.com/pyca/cryptography
- imageio-ffmpeg: BSD-2-Clause, https://github.com/imageio/imageio-ffmpeg
- Bundled FFmpeg executable supplied by imageio-ffmpeg; consult its build configuration (`ffmpeg -L` and `ffmpeg -buildconf`) for applicable GPL/LGPL terms. FFmpeg source: https://ffmpeg.org/download.html and corresponding build provider links in https://github.com/imageio/imageio-ffmpeg . Distribute this notice and packaged license information with the executable. Do not represent third-party codecs or models as IPScans proprietary code.
- Ollama runtime and Gemma model weights are automatically downloaded from their official distribution sources when missing, and are not embedded in this EXE. Their respective licenses apply: https://github.com/ollama/ollama/blob/main/LICENSE and https://ai.google.dev/gemma/terms .

- Pillow: HPND, https://python-pillow.github.io/

- OpenCV Python headless 4.13.0.92 and bundled third parties: see third-party-notices/opencv.
- NumPy: BSD-3-Clause; https://numpy.org/doc/stable/license.html
