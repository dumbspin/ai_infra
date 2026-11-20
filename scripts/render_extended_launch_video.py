import os
import math
import asyncio
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import edge_tts
from moviepy import (
    VideoClip,
    AudioFileClip,
    CompositeAudioClip,
    AudioClip,
    concatenate_audioclips
)

# Output directories
OUT_DIR = Path(r"d:\ai-infra\brag-output")
WORK_DIR = OUT_DIR / "work"
WORK_DIR.mkdir(parents=True, exist_ok=True)

# Video Specs
WIDTH = 1920
HEIGHT = 1080
FPS = 30
TOTAL_DURATION = 105.0 # 1 minute 45 seconds
TOTAL_FRAMES = int(TOTAL_DURATION * FPS)

# Color Scheme
BG_VOID = (8, 9, 13)
CARD_BG = (16, 19, 27)
CARD_BORDER = (38, 48, 66)
ACCENT_LIME = (184, 255, 34)
ACCENT_EMERALD = (52, 211, 153)
ACCENT_CYAN = (56, 189, 248)
ACCENT_AMBER = (251, 191, 36)
ACCENT_ROSE = (244, 63, 94)
TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (148, 163, 184)
TEXT_DIM = (100, 116, 139)

# Fonts
FONT_DIR = r"C:\Windows\Fonts"
def load_font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    except Exception:
        return ImageFont.load_default()

font_title_lg = load_font("segoeuib.ttf", 60)
font_title = load_font("segoeuib.ttf", 46)
font_h2 = load_font("segoeuib.ttf", 34)
font_body = load_font("segoeui.ttf", 24)
font_body_bold = load_font("segoeuib.ttf", 24)
font_mono = load_font("consola.ttf", 23)
font_mono_bold = load_font("consolab.ttf", 24)
font_mono_lg = load_font("consola.ttf", 28)
font_mono_sm = load_font("consola.ttf", 19)
font_badge = load_font("segoeuib.ttf", 17)
font_caption = load_font("segoeuib.ttf", 26)

# Logo
logo_path = r"d:\ai-infra\frontend\public\logo.png"
logo_img = Image.open(logo_path).convert("RGBA") if os.path.exists(logo_path) else None

# Voiceover Scripts for 8 Scenes
VO_SCRIPTS = [
    ("scene1.mp3", "Most tools that say AI generates your infrastructure stop right there — at generation."),
    ("scene2.mp3", "SDD-Infra starts the same way — you write what you want in YAML."),
    ("scene3.mp3", "But the model doesn't get a blank check. If it gets something wrong, the exact error goes back into the prompt — one retry, then it falls back to a deterministic compiler. Nothing it produces is trusted blindly."),
    ("scene4_a.mp3", "Before anything touches real infrastructure, two independent systems check it. A static scanner. A policy engine. Either one, on its own, can stop a deploy cold."),
    ("scene4_b.mp3", "Nothing applied. That's the point."),
    ("scene5.mp3", "Fix the spec, and the exact same pipeline takes it all the way through — synthesis, both gates, and a real deploy."),
    ("scene6.mp3", "And it doesn't stop watching after deploy. Every few minutes, the system checks live state against the spec — and if something's changed outside the pipeline, it can reconcile it automatically."),
    ("scene7.mp3", "One spec, three targets. A dashboard if you want to see it. A CLI if you don't — and every run, logged, with the exact spec commit that produced it."),
    ("scene8.mp3", "AI proposes. Deterministic systems decide. That's the whole idea.")
]

async def generate_voiceovers():
    print("Generating high-fidelity neural voiceover audio...")
    voice = "en-US-ChristopherNeural"
    for fname, text in VO_SCRIPTS:
        p = WORK_DIR / fname
        if not p.exists():
            communicate = edge_tts.Communicate(text, voice, rate="+2%")
            await communicate.save(str(p))
            print(f"Generated {fname}")

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def draw_top_nav(draw):
    draw.line([(0, 68), (WIDTH, 68)], fill=(28, 35, 48), width=1)
    if logo_img:
        thumb = logo_img.resize((36, 36), Image.Resampling.LANCZOS)
    draw.text((105, 20), "sdd", font=font_h2, fill=TEXT_WHITE)
    draw.text((160, 20), ".infra", font=font_h2, fill=ACCENT_LIME)
    
    # Target pills
    targets = [("DOCKER", True), ("AWS ECS", False), ("KUBERNETES", False)]
    px = WIDTH - 460
    for label, active in targets:
        bg = ACCENT_LIME if active else (20, 24, 34)
        tc = (0, 0, 0) if active else TEXT_MUTED
        draw_rounded_rect(draw, [px, 18, px + 115, 50], radius=16, fill=bg, outline=(40, 50, 70) if not active else None)
        draw.text((px + 18, 25), label, font=font_badge, fill=tc)
        px += 130

def draw_caption_bar(draw, text):
    """Burned-in subtitle bar at bottom."""
    if not text:
        return
    bbox = font_caption.getbbox(text)
    tw = bbox[2] - bbox[0]
    cx = WIDTH // 2
    pad_x = 24
    pad_y = 12
    draw_rounded_rect(draw, [cx - tw//2 - pad_x, 980 - pad_y, cx + tw//2 + pad_x, 980 + 36 + pad_y], radius=20, fill=(12, 14, 20), outline=(50, 60, 80), width=1)
    draw.text((cx - tw//2, 980), text, font=font_caption, fill=TEXT_WHITE)

def draw_stage_badge(draw, text):
    """Stage indicator badge overlay on bottom-third."""
    draw_rounded_rect(draw, [140, 900, 650, 945], radius=16, fill=(18, 25, 20), outline=ACCENT_LIME, width=1)
    draw.text((160, 912), text, font=font_badge, fill=ACCENT_LIME)

# Scene timings
# 1: 0 - 10s (Cold Open)
# 2: 10 - 20s (The Spec)
# 3: 20 - 32s (AI Compile + Retry)
# 4: 32 - 50s (Security Gate Denial)
# 5: 50 - 62s (Security Gate Pass & Deploy)
# 6: 62 - 78s (Drift & Self-Heal)
# 7: 78 - 92s (Multi-target Montage)
# 8: 92 - 105s (Outro & Close)

def render_frame(t):
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG_VOID)
    draw = ImageDraw.Draw(img)

    # Subtle grid
    grid = 70
    for x in range(0, WIDTH, grid):
        draw.line([(x, 0), (x, HEIGHT)], fill=(13, 16, 23), width=1)
    for y in range(0, HEIGHT, grid):
        draw.line([(0, y), (WIDTH, y)], fill=(13, 16, 23), width=1)

    # ── SCENE 1: COLD OPEN (0:00 - 0:10) ──
    if t < 10.0:
        caption = "Most tools that say 'AI generates your infrastructure' stop right there — at generation."
        
        # Terminal Box in center
        tx1, ty1, tx2, ty2 = 280, 260, 1640, 780
        draw_rounded_rect(draw, [tx1, ty1, tx2, ty2], radius=24, fill=(12, 14, 20), outline=(50, 65, 90), width=2)
        
        # Terminal Window Bar
        draw_rounded_rect(draw, [tx1, ty1, tx2, ty1 + 55], radius=24, fill=(20, 24, 34))
        draw.ellipse([tx1 + 25, ty1 + 20, tx1 + 39, ty1 + 34], fill=(244, 63, 94))
        draw.ellipse([tx1 + 50, ty1 + 20, tx1 + 64, ty1 + 34], fill=(251, 191, 36))
        draw.ellipse([tx1 + 75, ty1 + 20, tx1 + 89, ty1 + 34], fill=(52, 211, 153))
        draw.text((tx1 + 110, ty1 + 16), "terminal — bash", font=font_mono_sm, fill=TEXT_DIM)

        # Typing animation
        full_line = '$ most "AI generates your infrastructure" tools stop here.'
        # Type over 0.5s to 6.5s
        chars = int(max(0, min(len(full_line), (t - 0.8) * 12)))
        typed = full_line[:chars]
        
        draw.text((tx1 + 45, ty1 + 100), typed, font=font_mono_lg, fill=TEXT_WHITE)
        if int(t * 3) % 2 == 0:
            cursor_x = tx1 + 45 + len(typed) * 15.5
            draw.line([(cursor_x, ty1 + 100), (cursor_x, ty1 + 130)], fill=ACCENT_LIME, width=3)

        if t > 6.0:
            draw.text((tx1 + 45, ty1 + 170), "# Unchecked LLM generation", font=font_mono, fill=(244, 63, 94))
            draw.text((tx1 + 45, ty1 + 220), "# No deterministic validation", font=font_mono, fill=(244, 63, 94))
            draw.text((tx1 + 45, ty1 + 270), "# 0 policy enforcement", font=font_mono, fill=(244, 63, 94))
            draw.text((tx1 + 45, ty1 + 350), "-> SDD-Infra changes the contract.", font=font_mono_bold, fill=ACCENT_LIME)

        draw_caption_bar(draw, caption)

    # ── SCENE 2: THE SPEC (0:10 - 0:20) ──
    elif t < 20.0:
        draw_top_nav(draw)
        caption = "SDD-Infra starts the same way — you write what you want in YAML."
        
        # Split layout: Header & Clean Spec Editor
        draw.text((140, 110), "The Specification", font=font_title, fill=TEXT_WHITE)
        draw.text((140, 175), "A single, versioned declaration of desired state — no hand-written Terraform HCL.", font=font_body, fill=TEXT_MUTED)

        # Code Editor Card
        cx1, cy1, cx2, cy2 = 140, 240, 1200, 840
        draw_rounded_rect(draw, [cx1, cy1, cx2, cy2], radius=24, fill=(13, 16, 23), outline=CARD_BORDER, width=2)
        draw_rounded_rect(draw, [cx1, cy1, cx2, cy1 + 50], radius=24, fill=(22, 27, 38))
        draw.text((cx1 + 30, cy1 + 14), "specification/infrastructure.yaml", font=font_mono_sm, fill=ACCENT_LIME)

        spec_lines = [
            ("01", "spec_version: \"1.0\"", ACCENT_CYAN),
            ("02", "application: ecommerce", TEXT_WHITE),
            ("03", "environment: production", TEXT_WHITE),
            ("04", "services:", ACCENT_LIME),
            ("05", "  frontend:", TEXT_WHITE),
            ("06", "    replicas: 2", ACCENT_AMBER),
            ("07", "    image: nginx:1.25", TEXT_MUTED),
            ("08", "  backend:", TEXT_WHITE),
            ("09", "    replicas: 2", ACCENT_AMBER),
            ("10", "    image: node:20-alpine", TEXT_MUTED),
            ("11", "  database:", TEXT_WHITE),
            ("12", "    replicas: 1", ACCENT_AMBER),
            ("13", "    image: postgres:16", TEXT_MUTED),
            ("14", "security:", ACCENT_LIME),
            ("15", "  public_access: false", ACCENT_EMERALD),
            ("16", "  ssh: false", ACCENT_EMERALD),
            ("17", "metadata:", ACCENT_CYAN),
            ("18", "  owner: platform-team", TEXT_WHITE)
        ]
        
        sy = cy1 + 75
        for num, line, col in spec_lines:
            draw.text((cx1 + 30, sy), num, font=font_mono_sm, fill=TEXT_DIM)
            draw.text((cx1 + 85, sy), line, font=font_mono_sm, fill=col)
            sy += 29

        # Right Summary Card
        rx1, ry1, rx2, ry2 = 1240, 240, 1780, 840
        draw_rounded_rect(draw, [rx1, ry1, rx2, ry2], radius=24, fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((rx1 + 35, ry1 + 40), "Source of Truth Contract", font=font_h2, fill=TEXT_WHITE)
        
        points = [
            ("Strict Schema", "JSON Schema validated before LLM ever sees it"),
            ("Secret Linter", "Hard regex & key denylist blocks exposed API keys"),
            ("Deterministic", "Versioned spec contract isolates compiler blast radius"),
            ("Zero HCL", "Developers declare intent; system renders infrastructure")
        ]
        py = ry1 + 130
        for title, desc in points:
            draw.text((rx1 + 35, py), f"✓ {title}", font=font_body_bold, fill=ACCENT_LIME)
            draw.text((rx1 + 35, py + 34), desc, font=font_body, fill=TEXT_MUTED)
            py += 105

        draw_stage_badge(draw, "Stage 01 · Spec Validation")
        draw_caption_bar(draw, caption)

    # ── SCENE 3: AI COMPILE + SELF-CORRECTION (0:20 - 0:32) ──
    elif t < 32.0:
        draw_top_nav(draw)
        caption = "If it gets something wrong, the exact error goes back into the prompt — one retry, then fallback."
        
        draw.text((140, 110), "AI Synthesis & Self-Correction Loop", font=font_title, fill=TEXT_WHITE)
        draw.text((140, 175), "The LLM never writes Terraform directly. It fills a schema with automated feedback retry.", font=font_body, fill=TEXT_MUTED)

        # Big Terminal
        tx1, ty1, tx2, ty2 = 140, 240, 1780, 840
        draw_rounded_rect(draw, [tx1, ty1, tx2, ty2], radius=24, fill=(10, 12, 18), outline=CARD_BORDER, width=2)
        draw_rounded_rect(draw, [tx1, ty1, tx2, ty1 + 50], radius=24, fill=(20, 24, 34))
        draw.text((tx1 + 30, ty1 + 14), "$ sdd compile specification/infrastructure.yaml", font=font_mono, fill=ACCENT_LIME)

        term_output = [
            ("[INFO] Connecting to OpenRouter inference endpoint (liquid/lfm-2.5-2.6b:free)...", TEXT_MUTED),
            ("[INFO] Translating YAML specification into candidate JSON resource plan...", TEXT_WHITE),
            ("[Attempt 1] Output validation: ValidationError: missing required property 'owner' in tags", ACCENT_AMBER),
            ("[Attempt 2] Injecting error feedback into retry prompt:", ACCENT_CYAN),
            ("           \"Previous candidate failed validation: missing property 'owner'. Fix and return ONLY valid JSON.\"", TEXT_MUTED),
            ("[Attempt 2] Parsing candidate JSON schema...", TEXT_WHITE),
            ("✓ Schema Gate: 100% Valid candidate plan on retry", ACCENT_LIME),
            ("[Stage 03] Invoking deterministic HCL renderer (zero network calls, pure templating)...", TEXT_WHITE),
            ("✓ Terraform main.tf generated successfully (5 resources expanded)", ACCENT_EMERALD)
        ]
        
        # Reveal lines based on time in scene
        st = t - 20.0
        lines_to_show = int(min(len(term_output), st * 1.0))
        
        ty = ty1 + 80
        for i in range(lines_to_show):
            line_text, col = term_output[i]
            draw.text((tx1 + 35, ty), line_text, font=font_mono, fill=col)
            ty += 42

        draw_stage_badge(draw, "Stage 02 · AI Synthesis — self-correcting, not single-shot")
        draw_caption_bar(draw, caption)

    # ── SCENE 4: THE GATE — DENIAL (0:32 - 0:50) ──
    elif t < 50.0:
        draw_top_nav(draw)
        st = t - 32.0
        
        if st < 11.0:
            caption = "Before anything touches real infrastructure, two independent systems check it. A static scanner. A policy engine."
        else:
            caption = "Nothing applied. That's the point."

        draw.text((140, 110), "Dual Security Gates · Denial Execution", font=font_title, fill=ACCENT_ROSE)
        draw.text((140, 175), "A violating spec is blocked cold before touching any real cloud or container infrastructure.", font=font_body, fill=TEXT_MUTED)

        # Left: Violating Spec Snippet
        vx1, vy1, vx2, vy2 = 140, 240, 720, 840
        draw_rounded_rect(draw, [vx1, vy1, vx2, vy2], radius=24, fill=(22, 14, 18), outline=ACCENT_ROSE, width=2)
        draw_rounded_rect(draw, [vx1, vy1, vx2, vy1 + 50], radius=24, fill=(40, 18, 24))
        draw.text((vx1 + 30, vy1 + 14), "VIOLATING SPEC", font=font_mono_sm, fill=ACCENT_ROSE)

        v_lines = [
            ("spec_version: \"1.0\"", TEXT_MUTED),
            ("services:", TEXT_WHITE),
            ("  frontend:", TEXT_WHITE),
            ("    replicas: 2", TEXT_MUTED),
            ("    image: nginx:1.25", TEXT_MUTED),
            ("", TEXT_WHITE),
            ("security:", ACCENT_ROSE),
            ("  public_access: true   <-- VIOLATION", ACCENT_ROSE),
            ("  ssh: true             <-- VIOLATION", ACCENT_ROSE),
            ("", TEXT_WHITE),
            ("metadata:", TEXT_MUTED),
            ("  owner: anonymous      <-- DENIED", ACCENT_ROSE)
        ]
        vy = vy1 + 80
        for vl, col in v_lines:
            if "<--" in vl:
                draw_rounded_rect(draw, [vx1 + 25, vy - 4, vx2 - 25, vy + 28], radius=8, fill=(60, 20, 30))
            draw.text((vx1 + 35, vy), vl, font=font_mono_sm, fill=col)
            vy += 38

        # Right: Real Denial Terminal
        dx1, dy1, dx2, dy2 = 760, 240, 1780, 840
        draw_rounded_rect(draw, [dx1, dy1, dx2, dy2], radius=24, fill=(12, 14, 20), outline=ACCENT_ROSE if st > 2.0 else CARD_BORDER, width=2)
        draw_rounded_rect(draw, [dx1, dy1, dx2, dy1 + 50], radius=24, fill=(25, 20, 28))
        draw.text((dx1 + 30, dy1 + 14), "$ sdd plan specification/infrastructure.yaml --target docker", font=font_mono, fill=TEXT_WHITE)

        deny_lines = [
            ("Layer 1 — Checkov (Static AST Scanner)", ACCENT_CYAN),
            ("  ✗ DENY: [CKV_DOCKER_1] Container exposed to public ingress (0.0.0.0/0)", ACCENT_ROSE),
            ("  ✗ DENY: [CKV_DOCKER_2] SSH Port 22 exposed on workload container", ACCENT_ROSE),
            ("", TEXT_WHITE),
            ("Layer 2 — Open Policy Agent / Rego (Zero-Trust Gate)", ACCENT_LIME),
            ("  ✗ deny_public_access: public_access must be false for non-DMZ workloads", ACCENT_ROSE),
            ("  ✗ deny_ssh_enabled: SSH must not be enabled on generated infrastructure", ACCENT_ROSE),
            ("  ✗ deny_missing_owner: Resource missing mandatory valid owner tag", ACCENT_ROSE),
        ]
        
        dy = dy1 + 80
        for dl, col in deny_lines:
            draw.text((dx1 + 35, dy), dl, font=font_mono, fill=col)
            dy += 40

        # Big Denial Banner at bottom of terminal
        if st > 4.0:
            draw_rounded_rect(draw, [dx1 + 35, dy + 20, dx2 - 35, dy + 110], radius=16, fill=(80, 15, 25), outline=ACCENT_ROSE, width=2)
            draw.text((dx1 + 70, dy + 45), "EXECUTION DENIED — 0 RESOURCES APPLIED", font=font_title, fill=TEXT_WHITE)

        draw_stage_badge(draw, "Stage 04 · Security Gate — either layer can block alone")
        draw_caption_bar(draw, caption)

    # ── SCENE 5: THE GATE — PASS & DEPLOY (0:50 - 1:02) ──
    elif t < 62.0:
        draw_top_nav(draw)
        caption = "Fix the spec, and the exact same pipeline takes it all the way through — synthesis, both gates, and a real deploy."

        draw.text((140, 110), "Security Gate Passed · Real Deployment", font=font_title, fill=ACCENT_EMERALD)
        draw.text((140, 175), "Compliant specification passes both Checkov and OPA before executing verified apply.", font=font_body, fill=TEXT_MUTED)

        # Terminal
        tx1, ty1, tx2, ty2 = 140, 240, 1780, 840
        draw_rounded_rect(draw, [tx1, ty1, tx2, ty2], radius=24, fill=(10, 14, 18), outline=ACCENT_EMERALD, width=2)
        draw_rounded_rect(draw, [tx1, ty1, tx2, ty1 + 50], radius=24, fill=(18, 30, 25))
        draw.text((tx1 + 30, ty1 + 14), "$ sdd deploy specification/infrastructure.yaml --target docker --yes", font=font_mono, fill=ACCENT_LIME)

        deploy_lines = [
            ("[Stage 01] Spec Validation: ✓ JSON Schema valid (0 exposed secrets)", TEXT_WHITE),
            ("[Stage 02] AI Synthesis: ✓ Resource plan compiled ( spec_hash: 7a3f8c )", TEXT_WHITE),
            ("[Stage 03] HCL Renderer: ✓ Deterministic Terraform code rendered", TEXT_WHITE),
            ("[Stage 04] Layer 1 (Checkov Static Scan):  ✓ 2/2 PASSED (0 high/critical findings)", ACCENT_CYAN),
            ("[Stage 04] Layer 2 (OPA Rego Policy Gate):  ✓ 3/3 PASSED (100% compliant)", ACCENT_LIME),
            ("[Stage 05] Docker Runtime Engine: Initializing Terraform state...", TEXT_MUTED),
            ("           terraform apply -auto-approve tfplan", TEXT_MUTED),
            ("✓ DEPLOYED — frontend-1 (nginx:1.25), frontend-2 (nginx:1.25)", ACCENT_EMERALD),
            ("✓ DEPLOYED — backend-1 (node:20-alpine), backend-2 (node:20-alpine)", ACCENT_EMERALD),
            ("✓ DEPLOYED — database (postgres:16)", ACCENT_EMERALD),
            ("✓ Execution complete in 2,410 ms · Run recorded in Turso DB", ACCENT_LIME)
        ]

        ty = ty1 + 75
        for dl, col in deploy_lines:
            draw.text((tx1 + 35, ty), dl, font=font_mono, fill=col)
            ty += 40

        draw_stage_badge(draw, "Stage 05 · Deploy")
        draw_caption_bar(draw, caption)

    # ── SCENE 6: DRIFT & SELF-HEAL (1:02 - 1:18) ──
    elif t < 78.0:
        draw_top_nav(draw)
        st = t - 62.0
        caption = "Every few minutes, the system checks live state against the spec — and if something's changed, reconciles it."

        draw.text((140, 110), "Continuous Drift Watch & Auto-Reconciliation", font=font_title, fill=TEXT_WHITE)
        draw.text((140, 175), "Background cron compares desired YAML against live containers and autonomously repairs divergence.", font=font_body, fill=TEXT_MUTED)

        # Left Card: Live Container Table
        lx1, ly1, lx2, ly2 = 140, 240, 1050, 840
        draw_rounded_rect(draw, [lx1, ly1, lx2, ly2], radius=24, fill=CARD_BG, outline=CARD_BORDER, width=2)
        draw.text((lx1 + 35, ly1 + 30), "Runtime Cockpit · Active Containers", font=font_h2, fill=TEXT_WHITE)

        containers = [
            ("frontend-1", "nginx:1.25", "Running", ACCENT_EMERALD),
            ("frontend-2", "nginx:1.25", "Running", ACCENT_EMERALD),
            ("backend-1", "node:20-alpine", "Running", ACCENT_EMERALD),
            ("backend-2", "node:20-alpine", "Running", ACCENT_EMERALD),
            ("database", "postgres:16", "Running", ACCENT_EMERALD)
        ]
        
        # In second half of scene, show rogue container appear and then get pruned
        if 4.0 < st < 11.0:
            containers.append(("frontend-3-untracked", "nginx:1.25", "UNMANAGED", ACCENT_AMBER))

        cy = ly1 + 100
        for name, img_name, status, status_col in containers:
            is_rogue = status == "UNMANAGED"
            row_bg = (50, 20, 25) if is_rogue else (12, 15, 22)
            draw_rounded_rect(draw, [lx1 + 30, cy, lx2 - 30, cy + 65], radius=14, fill=row_bg, outline=ACCENT_AMBER if is_rogue else (30, 40, 55))
            draw.text((lx1 + 55, cy + 20), name, font=font_mono, fill=TEXT_WHITE if not is_rogue else ACCENT_AMBER)
            draw.text((lx1 + 380, cy + 22), img_name, font=font_mono_sm, fill=TEXT_MUTED)
            draw.text((lx1 + 680, cy + 20), status, font=font_body_bold, fill=status_col)
            cy += 76

        # Right Card: Drift Telemetry & Action
        rx1, ry1, rx2, ry2 = 1100, 240, 1780, 840
        draw_rounded_rect(draw, [rx1, ry1, rx2, ry2], radius=24, fill=CARD_BG, outline=ACCENT_LIME if st > 10.0 else CARD_BORDER, width=2)
        draw.text((rx1 + 35, ry1 + 30), "Drift Reconciliation", font=font_h2, fill=TEXT_WHITE)

        if st < 4.0:
            draw_rounded_rect(draw, [rx1 + 35, ry1 + 100, rx2 - 35, ry1 + 220], radius=18, fill=(15, 35, 20), outline=ACCENT_EMERALD)
            draw.text((rx1 + 60, ry1 + 130), "✓ ZERO DRIFT DETECTED", font=font_h2, fill=ACCENT_EMERALD)
            draw.text((rx1 + 60, ry1 + 175), "Live daemon state matches 100% of specification.", font=font_body, fill=TEXT_MUTED)
        elif st < 11.0:
            draw_rounded_rect(draw, [rx1 + 35, ry1 + 100, rx2 - 35, ry1 + 240], radius=18, fill=(45, 25, 15), outline=ACCENT_AMBER, width=2)
            draw.text((rx1 + 60, ry1 + 125), "⚠️ DRIFT ALERT (Count Mismatch)", font=font_h2, fill=ACCENT_AMBER)
            draw.text((rx1 + 60, ry1 + 170), "Expected: 2 replicas | Running: 3 containers", font=font_body, fill=TEXT_WHITE)
            draw.text((rx1 + 60, ry1 + 200), "Rogue resource: frontend-3-untracked", font=font_mono_sm, fill=(255, 200, 150))
            
            # Auto-healing action trigger
            draw_rounded_rect(draw, [rx1 + 35, ry1 + 280, rx2 - 35, ry1 + 360], radius=16, fill=ACCENT_LIME)
            draw.text((rx1 + 120, ry1 + 305), "⚡ Autonomously Reconciling...", font=font_h2, fill=(0, 0, 0))
        else:
            draw_rounded_rect(draw, [rx1 + 35, ry1 + 100, rx2 - 35, ry1 + 260], radius=18, fill=(15, 40, 25), outline=ACCENT_LIME, width=2)
            draw.text((rx1 + 60, ry1 + 125), "✓ RECONCILED & HEALED", font=font_h2, fill=ACCENT_LIME)
            draw.text((rx1 + 60, ry1 + 170), "1. Pruned unmanaged container: frontend-3-untracked", font=font_mono_sm, fill=TEXT_WHITE)
            draw.text((rx1 + 60, ry1 + 205), "2. Desired state restored · 0 manual intervention", font=font_mono_sm, fill=ACCENT_EMERALD)

        draw_stage_badge(draw, "Stage 06 · Drift Watch — scheduled, not just on-demand")
        draw_caption_bar(draw, caption)

    # ── SCENE 7: MULTI-TARGET & DASHBOARD FLASH (1:18 - 1:32) ──
    elif t < 92.0:
        draw_top_nav(draw)
        st = t - 78.0
        caption = "One spec, three targets. A dashboard if you want to see it. A CLI if you don't."

        # Sub-beat 1: Multi-target Switcher (0-5s)
        if st < 5.0:
            draw.text((140, 110), "Multi-Target Infrastructure Compiler", font=font_title, fill=TEXT_WHITE)
            draw.text((140, 175), "The same YAML specification renders target-specific HCL for Docker, AWS ECS, or Kubernetes.", font=font_body, fill=TEXT_MUTED)

            targets = [
                ("1. Docker Local", "docker_container, docker_image", "Local Developer Loop"),
                ("2. AWS ECS", "aws_ecs_task_definition, aws_ecs_service, alb", "Cloud Production"),
                ("3. Kubernetes", "kubernetes_deployment, kubernetes_service", "Cluster Native")
            ]
            cx = 140
            for name, resources, usecase in targets:
                draw_rounded_rect(draw, [cx, 260, cx + 510, 800], radius=24, fill=CARD_BG, outline=ACCENT_LIME if "AWS" in name else CARD_BORDER, width=2)
                draw.text((cx + 35, 300), name, font=font_h2, fill=TEXT_WHITE)
                draw.text((cx + 35, 355), usecase, font=font_badge, fill=ACCENT_LIME)
                draw.line([(cx + 35, 395), (cx + 475, 395)], fill=(30, 40, 55), width=1)
                draw.text((cx + 35, 430), "Generated Resources:", font=font_body_bold, fill=TEXT_MUTED)
                draw.text((cx + 35, 480), resources, font=font_mono_sm, fill=ACCENT_CYAN)
                cx += 550

        # Sub-beat 2: sdd history terminal (5-14s)
        else:
            draw.text((140, 110), "Persistent Telemetry & CLI History", font=font_title, fill=TEXT_WHITE)
            draw.text((140, 175), "Every execution outcome, spec commit hash, and audit trail recorded in Turso cloud libSQL.", font=font_body, fill=TEXT_MUTED)

            tx1, ty1, tx2, ty2 = 140, 240, 1780, 840
            draw_rounded_rect(draw, [tx1, ty1, tx2, ty2], radius=24, fill=(10, 12, 18), outline=CARD_BORDER, width=2)
            draw_rounded_rect(draw, [tx1, ty1, tx2, ty1 + 50], radius=24, fill=(20, 24, 34))
            draw.text((tx1 + 30, ty1 + 14), "$ sdd history --limit 6", font=font_mono, fill=ACCENT_LIME)

            history_rows = [
                ("ID", "COMMIT", "TARGET", "STATUS", "DURATION", "TIMESTAMP"),
                ("108", "a22e253", "docker", "DEPLOYED", "2,410 ms", "2026-10-06 18:24:32 UTC"),
                ("107", "78968b7", "aws_ecs", "PASSED", "1,840 ms", "2026-10-06 17:45:10 UTC"),
                ("106", "fa23453", "docker", "BLOCKED (OPA)", "420 ms", "2026-10-06 17:12:05 UTC"),
                ("105", "dc054ac", "kubernetes", "PASSED", "2,110 ms", "2026-10-06 16:50:44 UTC"),
                ("104", "088030d", "docker", "LOCAL CLI REQ", "310 ms", "2026-10-06 16:30:19 UTC")
            ]
            hy = ty1 + 80
            for row in history_rows:
                is_header = row[0] == "ID"
                col = ACCENT_LIME if is_header else TEXT_WHITE
                draw.text((tx1 + 35, hy), row[0].ljust(6), font=font_mono, fill=col)
                draw.text((tx1 + 130, hy), row[1].ljust(12), font=font_mono, fill=ACCENT_CYAN if not is_header else col)
                draw.text((tx1 + 310, hy), row[2].ljust(14), font=font_mono, fill=col)
                
                status_col = col
                if row[3] == "DEPLOYED" or row[3] == "PASSED": status_col = ACCENT_EMERALD
                elif "BLOCKED" in row[3]: status_col = ACCENT_ROSE
                elif "LOCAL" in row[3]: status_col = ACCENT_AMBER
                
                draw.text((tx1 + 520, hy), row[3].ljust(18), font=font_mono_bold if not is_header else font_mono, fill=status_col)
                draw.text((tx1 + 820, hy), row[4].ljust(14), font=font_mono, fill=TEXT_MUTED if not is_header else col)
                draw.text((tx1 + 1040, hy), row[5], font=font_mono, fill=TEXT_DIM if not is_header else col)
                hy += 48

        draw_caption_bar(draw, caption)

    # ── SCENE 8: CLOSE & OUTRO (1:32 - 1:45) ──
    else:
        st = t - 92.0
        caption = "AI proposes. Deterministic systems decide. That's the whole idea."

        center_x = WIDTH // 2
        center_y = 360
        logo_size = 200

        # Gentle pulsing aura
        glow = int(240 + 20 * math.sin(st * 3))
        draw.ellipse([center_x - glow, center_y - glow, center_x + glow, center_y + glow], fill=(20, 38, 12))

        if logo_img:
            big_logo = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            img.paste(big_logo, (center_x - logo_size // 2, center_y - logo_size // 2), mask=big_logo.split()[3])

        # Wordmark
        draw.text((center_x - 190, 500), "sdd", font=font_title_lg, fill=TEXT_WHITE)
        draw.text((center_x - 70, 500), ".infra", font=font_title_lg, fill=ACCENT_LIME)

        # Tagline
        draw.text((center_x - 470, 610), "AI proposes. Deterministic systems decide.", font=font_title, fill=TEXT_WHITE)

        # Links Strip
        btn_y = 730
        draw_rounded_rect(draw, [center_x - 460, btn_y, center_x - 30, btn_y + 80], radius=40, fill=ACCENT_LIME)
        draw.text((center_x - 390, btn_y + 24), "ai-infra-six.vercel.app", font=font_body_bold, fill=(0, 0, 0))

        draw_rounded_rect(draw, [center_x + 30, btn_y, center_x + 460, btn_y + 80], radius=40, fill=(20, 24, 34), outline=CARD_BORDER, width=2)
        draw.text((center_x + 75, btn_y + 24), "github.com/dumbspin/ai_infra", font=font_body_bold, fill=TEXT_WHITE)

        draw.text((center_x - 170, 880), "Built by Ayush Dwivedi · 100% Open Source", font=font_mono_sm, fill=TEXT_DIM)

        draw_caption_bar(draw, caption)

    return np.array(img.convert("RGB"))

async def main():
    # 1. Generate Voiceover Audio Files
    await generate_voiceovers()

    # 2. Build Audio Track
    print("Composing full voiceover and music audio track...")
    
    # Music Track
    music_src = Path(r"d:\ai-infra\.agents\skills\brag\skills\brag\assets\music\happy-beats-business-moves-vol-1-by-ende-dot-app.mp3")
    
    # Load VO clips with timestamps
    # Scene 1: 0:00 (1.0s in)
    # Scene 2: 0:10 (11.0s)
    # Scene 3: 0:20 (21.0s)
    # Scene 4a: 0:32 (33.0s)
    # Scene 4b: 0:44 (44.0s)
    # Scene 5: 0:50 (51.0s)
    # Scene 6: 1:02 (63.0s)
    # Scene 7: 1:18 (79.0s)
    # Scene 8: 1:32 (93.0s)
    
    vo_cues = [
        ("scene1.mp3", 1.0),
        ("scene2.mp3", 11.0),
        ("scene3.mp3", 21.0),
        ("scene4_a.mp3", 33.0),
        ("scene4_b.mp3", 44.5),
        ("scene5.mp3", 51.0),
        ("scene6.mp3", 63.0),
        ("scene7.mp3", 79.0),
        ("scene8.mp3", 93.0)
    ]
    
    audio_clips = []
    
    # Add background music (looped to 105s at 15% volume, dipping to 3% in scene 4)
    if music_src.exists():
        raw_music = AudioFileClip(str(music_src))
        # Loop music to cover 105s
        loops_needed = int(math.ceil(TOTAL_DURATION / raw_music.duration)) + 1
        full_music = concatenate_audioclips([raw_music] * loops_needed).subclipped(0, TOTAL_DURATION)
        
        # Volume profile: normal ~0.15, dip to 0.03 between 32s and 50s (denial moment), swell to 0.22 in outro
        def volume_func(gf, t):
            vol = 0.15
            if 32.0 <= t <= 50.0:
                vol = 0.03
            elif t >= 92.0:
                vol = 0.22
            return gf(t) * vol

        # Apply volume
        music_vol = full_music.with_volume_scaled(0.14)
        audio_clips.append(music_vol)

    for fname, start_t in vo_cues:
        p = WORK_DIR / fname
        if p.exists():
            c = AudioFileClip(str(p)).with_start(start_t)
            audio_clips.append(c)

    final_audio = CompositeAudioClip(audio_clips)

    # 3. Export Poster Thumbnail
    poster_path = OUT_DIR / "brag.jpg"
    print("Generating poster thumbnail...")
    poster_arr = render_frame(96.0) # Settled outro
    Image.fromarray(poster_arr).save(poster_path, quality=95)
    print(f"Saved poster to {poster_path}")

    # 4. Render Video
    video_path = OUT_DIR / "brag.mp4"
    print(f"Rendering 105s video to {video_path}...")
    
    clip = VideoClip(render_frame, duration=TOTAL_DURATION)
    clip = clip.with_audio(final_audio)

    clip.write_videofile(
        str(video_path),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        preset="fast"
    )
    print("Video export complete: " + str(video_path))

if __name__ == "__main__":
    asyncio.run(main())
