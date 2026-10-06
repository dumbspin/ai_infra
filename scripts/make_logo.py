import base64
from pathlib import Path
from PIL import Image

pub_dir = Path(r"d:\ai-infra\frontend\public")
png_path = pub_dir / "logo.png"

with open(png_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 323 317" width="100%" height="100%">
  <rect width="323" height="317" fill="#000000" rx="24" />
  <image href="data:image/png;base64,{b64}" width="323" height="317" />
</svg>'''

(pub_dir / "logo.svg").write_text(svg_content, encoding="utf-8")
print("logo.svg created successfully")
