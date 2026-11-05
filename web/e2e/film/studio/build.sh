#!/bin/sh
# Builds gecko-one-link.mp4 from scratch: sound, all 450 frames, then H.264 + AAC (1080×1920, 30 fps, 15 s).
set -e
cd "$(dirname "$0")"
python3 sound.py
python3 render.py --workers 6
ffmpeg -v error -y -framerate 30 -i frames/%04d.png -i audio.wav \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -vf "scale=out_color_matrix=bt709" \
  -c:a aac -b:a 192k -ar 48000 -t 15 -movflags +faststart gecko-one-link.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,sample_rate,channels -of compact gecko-one-link.mp4
