import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
from moviepy import VideoClip, AudioFileClip, CompositeAudioClip

# Canvas Configuration
WIDTH = 1920
HEIGHT = 1080
FPS = 30
DURATION = 20.0
TOTAL_FRAMES = int(DURATION * FPS)

# Color Palette
BG_COLOR = (6, 7, 10)            # Deep dark void
PANEL_BG = (18, 21, 30)          # Card slate
PANEL_BORDER = (45, 55, 75)      # Card border
ACCENT_LIME = (184, 255, 34)     # #b8ff22 signature lime
ACCENT_EMERALD = (52, 211, 153)  # Emerald green
ACCENT_CYAN = (56, 189, 248)     # Sky cyan
ACCENT_AMBER = (251, 191, 36)    # Amber warning
ACCENT_ROSE = (244, 63, 94)      # Rose red
TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (148, 163, 184)
TEXT_DIM = (100, 116, 139)

# Load Fonts
FONT_DIR = r"C:\Windows\Fonts"
def get_font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    except Exception:
        return ImageFont.load_default()

font_hero_bold = get_font("segoeuib.ttf", 68)
font_h1_bold = get_font("segoeuib.ttf", 52)
font_h2_bold = get_font("segoeuib.ttf", 38)
font_body = get_font("segoeui.ttf", 26)
font_body_bold = get_font("segoeuib.ttf", 26)
font_mono = get_font("consola.ttf", 24)
font_mono_lg = get_font("consola.ttf", 28)
font_mono_sm = get_font("consola.ttf", 20)
font_tag = get_font("segoeuib.ttf", 18)

# Load Logo
logo_path = r"d:\ai-infra\frontend\public\logo.png"
logo_img = Image.open(logo_path).convert("RGBA") if os.path.exists(logo_path) else None

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def draw_grid_background(draw, t):
    # Subtle digital grid background
    grid_size = 60
    shift = int((t * 20) % grid_size)
    for x in range(0, WIDTH, grid_size):
        draw.line([(x, 0), (x, HEIGHT)], fill=(15, 18, 25), width=1)
    for y in range(0, HEIGHT, grid_size):
        draw.line([(0, y + shift), (WIDTH, y + shift)], fill=(15, 18, 25), width=1)

def draw_header_bar(draw, t):
    # Top navbar
    draw.line([(0, 80), (WIDTH, 80)], fill=(30, 36, 48), width=1)
    
    # Brand logo + title
    if logo_img:
        logo_thumb = logo_img.resize((42, 42), Image.Resampling.LANCZOS)
        # Paste with alpha
        # Note: caller will handle image pasting if needed
    
    draw.text((120, 24), "sdd", font=font_h2_bold, fill=TEXT_WHITE)
    draw.text((180, 24), ".infra", font=font_h2_bold, fill=ACCENT_LIME)
    
    # Target pills on top right
    targets = [("DOCKER", True), ("AWS ECS", False), ("KUBERNETES", False)]
    px = WIDTH - 480
    for label, active in targets:
        bg = ACCENT_LIME if active else (22, 27, 38)
        tc = (0, 0, 0) if active else TEXT_MUTED
        draw_rounded_rect(draw, [px, 22, px + 120, 58], radius=18, fill=bg, outline=(40, 50, 70) if not active else None)
        draw.text((px + 20, 30), label, font=font_tag, fill=tc)
        px += 135

def render_frame(t):
    """Render a single frame at time t (seconds)."""
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Background Grid
    draw_grid_background(draw, t)
    
    # Top persistent bar
    draw_header_bar(draw, t)
    if logo_img:
        logo_thumb = logo_img.resize((46, 46), Image.Resampling.LANCZOS)
        img.paste(logo_thumb, (60, 18), mask=logo_thumb.split()[3])

    # ── SCENE 1: THE HOOK (0.0s - 3.8s) ──
    if t < 3.8:
        progress = min(1.0, t / 1.0)
        alpha = int(progress * 255)
        
        # Pill badge
        draw_rounded_rect(draw, [140, 160, 480, 204], radius=22, fill=(20, 35, 20), outline=ACCENT_LIME, width=2)
        draw.text((165, 172), "THE PROBLEM WITH AI INFRASTRUCTURE", font=font_tag, fill=ACCENT_LIME)
        
        # Hero question / claim
        y_text = 240
        draw.text((140, y_text), "Most AI tools generate Terraform directly.", font=font_hero_bold, fill=TEXT_WHITE)
        draw.text((140, y_text + 85), "That's an unverified proposal reaching production.", font=font_hero_bold, fill=(244, 63, 94))
        
        # Big comparison cards
        if t > 1.2:
            card_anim = min(1.0, (t - 1.2) / 0.6)
            card_y = int(480 - (1.0 - card_anim) * 30)
            
            # Left Card: Traditional AI (Red/Denied)
            draw_rounded_rect(draw, [140, card_y, 880, card_y + 440], radius=28, fill=(22, 16, 20), outline=(120, 30, 40), width=2)
            draw.text((180, card_y + 35), "TRADITIONAL LLM GENERATION", font=font_tag, fill=(244, 63, 94))
            draw.text((180, card_y + 75), "Unchecked Hallucinations", font=font_h2_bold, fill=TEXT_WHITE)
            
            code_lines = [
                "1  # Raw LLM writes .tf file directly",
                "2  resource \"aws_security_group\" \"all\" {",
                "3    ingress { cidr_blocks = [\"0.0.0.0/0\"] } # INSECURE",
                "4    ingress { port = 22 } # SSH OPEN TO PUBLIC",
                "5  }",
                "6  # ❌ No policy gate. Applied straight to cloud."
            ]
            cy = card_y + 150
            for cl in code_lines:
                col = (255, 100, 100) if "INSECURE" in cl or "SSH" in cl or "❌" in cl else TEXT_MUTED
                draw.text((180, cy), cl, font=font_mono_sm, fill=col)
                cy += 38
                
            # Right Card: SDD-Infra (Green/Protected)
            draw_rounded_rect(draw, [940, card_y, 1680, card_y + 440], radius=28, fill=(15, 25, 20), outline=ACCENT_LIME, width=2)
            draw.text((980, card_y + 35), "SDD-INFRA SPECIFICATION GATING", font=font_tag, fill=ACCENT_LIME)
            draw.text((980, card_y + 75), "Deterministic Guardrails", font=font_h2_bold, fill=TEXT_WHITE)
            
            sdd_lines = [
                "✓ Desired State Spec (YAML)",
                "✓ Strict JSON Schema Gate",
                "✓ Checkov Static AST Security Scan",
                "✓ OPA Rego Zero-Trust Policy Gate",
                "✓ Zero Hallucinations Touch Infrastructure",
                "✓ Autonomous Drift Reconciliation"
            ]
            cy = card_y + 150
            for sl in sdd_lines:
                draw.text((980, cy), sl, font=font_body_bold, fill=ACCENT_LIME if "✓" in sl else TEXT_WHITE)
                cy += 38

    # ── SCENE 2: DUAL SECURITY GATES (3.8s - 7.8s) ──
    elif t < 7.8:
        st = t - 3.8
        
        # Pill badge
        draw_rounded_rect(draw, [140, 140, 420, 184], radius=22, fill=(20, 35, 20), outline=ACCENT_LIME, width=2)
        draw.text((165, 152), "STAGE 04 & 05 SECURITY GATES", font=font_tag, fill=ACCENT_LIME)
        
        draw.text((140, 210), "AI proposes. Deterministic systems decide.", font=font_hero_bold, fill=TEXT_WHITE)
        draw.text((140, 295), "Neither the AI nor any single check gets the final say.", font=font_h2_bold, fill=TEXT_MUTED)
        
        # Gate 1: Checkov Card
        g1_y = 380
        draw_rounded_rect(draw, [140, g1_y, 880, g1_y + 540], radius=28, fill=PANEL_BG, outline=PANEL_BORDER, width=2)
        draw_rounded_rect(draw, [180, g1_y + 30, 480, g1_y + 74], radius=18, fill=(30, 40, 60))
        draw.text((200, g1_y + 42), "GATE 1 · STATIC SCANNER", font=font_tag, fill=ACCENT_CYAN)
        draw.text((180, g1_y + 95), "Checkov AST Engine", font=font_h1_bold, fill=TEXT_WHITE)
        
        checkov_rules = [
            ("CKV_DOCKER_1", "Public ingress blocked on workload units", "PASSED"),
            ("CKV_DOCKER_2", "SSH Port 22 strictly disabled", "PASSED"),
            ("CKV_AWS_1", "IAM Least-Privilege Execution Role", "PASSED")
        ]
        ry = g1_y + 190
        for code, desc, status in checkov_rules:
            draw_rounded_rect(draw, [180, ry, 840, ry + 85], radius=16, fill=(12, 15, 22), outline=(35, 45, 60))
            draw.text((200, ry + 16), code, font=font_mono_sm, fill=ACCENT_CYAN)
            draw.text((200, ry + 46), desc, font=font_body, fill=TEXT_MUTED)
            draw_rounded_rect(draw, [710, ry + 22, 820, ry + 62], radius=12, fill=(15, 45, 25), outline=ACCENT_EMERALD)
            draw.text((728, ry + 32), status, font=font_tag, fill=ACCENT_EMERALD)
            ry += 105

        # Gate 2: OPA Rego Card
        draw_rounded_rect(draw, [940, g1_y, 1680, g1_y + 540], radius=28, fill=PANEL_BG, outline=ACCENT_LIME if st > 1.0 else PANEL_BORDER, width=2)
        draw_rounded_rect(draw, [980, g1_y + 30, 1280, g1_y + 74], radius=18, fill=(35, 45, 20))
        draw.text((1000, g1_y + 42), "GATE 2 · POLICY ENGINE", font=font_tag, fill=ACCENT_LIME)
        draw.text((980, g1_y + 95), "Open Policy Agent (OPA)", font=font_h1_bold, fill=TEXT_WHITE)
        
        opa_rules = [
            ("deny_public_access", "public_access must be false", "ACTIVE"),
            ("deny_ssh_enabled", "ssh enabled blocked on generated infra", "ACTIVE"),
            ("deny_missing_owner", "every resource must carry owner tag", "ACTIVE")
        ]
        ry = g1_y + 190
        for code, desc, status in opa_rules:
            draw_rounded_rect(draw, [980, ry, 1640, ry + 85], radius=16, fill=(12, 15, 22), outline=(35, 45, 60))
            draw.text((1000, ry + 16), code, font=font_mono_sm, fill=ACCENT_LIME)
            draw.text((1000, ry + 46), desc, font=font_body, fill=TEXT_MUTED)
            draw_rounded_rect(draw, [1510, ry + 22, 1620, ry + 62], radius=12, fill=(35, 50, 15), outline=ACCENT_LIME)
            draw.text((1532, ry + 32), status, font=font_tag, fill=ACCENT_LIME)
            ry += 105

    # ── SCENE 3: MULTI-CLOUD SYNTHESIS & SELF-CORRECTION (7.8s - 11.8s) ──
    elif t < 11.8:
        st = t - 7.8
        
        draw_rounded_rect(draw, [140, 140, 480, 184], radius=22, fill=(20, 35, 20), outline=ACCENT_LIME, width=2)
        draw.text((165, 152), "MULTI-TARGET SYNTHESIS ENGINE", font=font_tag, fill=ACCENT_LIME)
        
        draw.text((140, 210), "One YAML Spec. Three Cloud Targets.", font=font_hero_bold, fill=TEXT_WHITE)
        draw.text((140, 295), "Compiles to Docker, AWS ECS, or Kubernetes without changing the spec.", font=font_h2_bold, fill=TEXT_MUTED)
        
        # Left: Clean YAML Spec
        card_y = 380
        draw_rounded_rect(draw, [140, card_y, 780, card_y + 540], radius=28, fill=(10, 12, 18), outline=PANEL_BORDER, width=2)
        draw.text((180, card_y + 30), "specification/infrastructure.yaml", font=font_mono, fill=ACCENT_LIME)
        
        yaml_lines = [
            "spec_version: \"1.0\"",
            "application: ecommerce",
            "environment: development",
            "services:",
            "  frontend:",
            "    replicas: 2",
            "    image: nginx:1.25",
            "  backend:",
            "    replicas: 2",
            "    image: node:20-alpine",
            "  database:",
            "    replicas: 1",
            "    image: postgres:16",
            "security:",
            "  public_access: false",
            "  ssh: false"
        ]
        yy = card_y + 80
        for yl in yaml_lines:
            col = ACCENT_LIME if "frontend:" in yl or "backend:" in yl or "database:" in yl else TEXT_WHITE
            if "public_access" in yl or "ssh:" in yl:
                col = ACCENT_CYAN
            draw.text((180, yy), yl, font=font_mono_sm, fill=col)
            yy += 28

        # Right: Interactive Terminal Execution
        draw_rounded_rect(draw, [820, card_y, 1680, card_y + 540], radius=28, fill=(12, 14, 20), outline=ACCENT_LIME, width=2)
        draw.text((860, card_y + 30), "SDD CLI TERMINAL (sdd compile & plan)", font=font_mono, fill=TEXT_MUTED)
        
        term_commands = [
            ("$ sdd validate specification/infrastructure.yaml", ACCENT_LIME),
            ("  [✓] JSON Schema validated", TEXT_WHITE),
            ("  [✓] Secret linter clean (0 exposed tokens)", ACCENT_EMERALD),
            ("", TEXT_WHITE),
            ("$ sdd compile --target aws_ecs --retry-with-feedback", ACCENT_LIME),
            ("  [1/2] Invoking OpenRouter LLM synthesis...", TEXT_MUTED),
            ("  [2/2] Validating candidate JSON resource plan...", TEXT_MUTED),
            ("  [✓] Deterministic HCL renderer synthesized main.tf", ACCENT_EMERALD),
            ("", TEXT_WHITE),
            ("$ sdd plan --target aws_ecs --json", ACCENT_LIME),
            ("  [✓] Checkov AST scan: 0 findings", ACCENT_EMERALD),
            ("  [✓] OPA Rego policy: 3/3 passed (100% compliant)", ACCENT_LIME),
            ("  [✓] Candidate plan ready for zero-trust deployment", (255, 255, 255))
        ]
        ty = card_y + 80
        for tc, col in term_commands:
            draw.text((860, ty), tc, font=font_mono_sm, fill=col)
            ty += 32

    # ── SCENE 4: CONTINUOUS DRIFT WATCH (11.8s - 15.8s) ──
    elif t < 15.8:
        st = t - 11.8
        
        draw_rounded_rect(draw, [140, 140, 480, 184], radius=22, fill=(35, 25, 15), outline=ACCENT_AMBER, width=2)
        draw.text((165, 152), "STAGE 06 · CONTINUOUS DRIFT WATCH", font=font_tag, fill=ACCENT_AMBER)
        
        draw.text((140, 210), "Drift isn't a button. It's a continuous loop.", font=font_hero_bold, fill=TEXT_WHITE)
        draw.text((140, 295), "Compares desired spec against live runtime every 10 minutes with auto-healing.", font=font_h2_bold, fill=TEXT_MUTED)
        
        # Dual Cockpit Drift Cards
        card_y = 380
        
        # Left: Detected Drift Alert
        draw_rounded_rect(draw, [140, card_y, 880, card_y + 540], radius=28, fill=(24, 18, 16), outline=ACCENT_AMBER, width=2)
        draw.text((180, card_y + 35), "1. LIVE DRIFT DETECTED", font=font_tag, fill=ACCENT_AMBER)
        draw.text((180, card_y + 75), "Out-Of-Band Container", font=font_h1_bold, fill=TEXT_WHITE)
        
        drift_items = [
            ("Unmanaged Container", "frontend-3-untracked", "ALERT"),
            ("Expected Replica Count", "2 Desired Containers", "MISMATCH"),
            ("Actual Running Count", "3 Active Containers", "DRIFT")
        ]
        dy = card_y + 160
        for label, val, tag in drift_items:
            draw_rounded_rect(draw, [180, dy, 840, dy + 90], radius=16, fill=(15, 12, 12), outline=(60, 35, 30))
            draw.text((200, dy + 18), label, font=font_mono_sm, fill=TEXT_MUTED)
            draw.text((200, dy + 50), val, font=font_h2_bold, fill=(255, 200, 150))
            draw_rounded_rect(draw, [700, dy + 25, 820, dy + 65], radius=12, fill=(60, 25, 15), outline=ACCENT_AMBER)
            draw.text((720, dy + 35), tag, font=font_tag, fill=ACCENT_AMBER)
            dy += 110
            
        # Right: Auto-Reconciliation Engine
        draw_rounded_rect(draw, [940, card_y, 1680, card_y + 540], radius=28, fill=(15, 25, 20), outline=ACCENT_LIME, width=2)
        draw.text((980, card_y + 35), "2. AUTONOMOUS RECONCILIATION", font=font_tag, fill=ACCENT_LIME)
        draw.text((980, card_y + 75), "Self-Healing Execution", font=font_h1_bold, fill=TEXT_WHITE)
        
        heal_items = [
            ("Pruned Rogue Container", "docker rm -f frontend-3-untracked", "HEALED"),
            ("Re-applied Desired State", "terraform apply active_spec.tf", "ALIGNED"),
            ("Current State Status", "Zero Drift · 100% Spec Compliant", "VERIFIED")
        ]
        hy = card_y + 160
        for label, val, tag in heal_items:
            draw_rounded_rect(draw, [980, hy, 1640, hy + 90], radius=16, fill=(12, 18, 15), outline=(30, 55, 35))
            draw.text((1000, hy + 18), label, font=font_mono_sm, fill=TEXT_MUTED)
            draw.text((1000, hy + 50), val, font=font_h2_bold, fill=ACCENT_LIME)
            draw_rounded_rect(draw, [1500, hy + 25, 1620, hy + 65], radius=12, fill=(20, 50, 25), outline=ACCENT_LIME)
            draw.text((1518, hy + 35), tag, font=font_tag, fill=ACCENT_LIME)
            hy += 110

    # ── SCENE 5: OUTRO & CALL TO ACTION (15.8s - 20.0s) ──
    else:
        st = t - 15.8
        
        # Centerpiece Starburst Brand Logo
        logo_size = 180
        center_x = WIDTH // 2
        center_y = 380
        
        # Pulsing Radial Glow
        glow_radius = int(220 + 25 * math.sin(st * 4))
        draw.ellipse([center_x - glow_radius, center_y - glow_radius, center_x + glow_radius, center_y + glow_radius], fill=(25, 45, 15))
        
        if logo_img:
            big_logo = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            img.paste(big_logo, (center_x - logo_size // 2, center_y - logo_size // 2), mask=big_logo.split()[3])
            
        # Title
        draw.text((center_x - 180, 520), "sdd", font=font_hero_bold, fill=TEXT_WHITE)
        draw.text((center_x - 60, 520), ".infra", font=font_hero_bold, fill=ACCENT_LIME)
        
        # Tagline
        draw.text((center_x - 440, 620), "Specification-Driven Infrastructure Management", font=font_h1_bold, fill=TEXT_WHITE)
        draw.text((center_x - 390, 700), "AI Proposes · Deterministic Systems Gate · Real Infra Deploys", font=font_h2_bold, fill=TEXT_MUTED)
        
        # CTA Buttons Strip
        btn_y = 800
        # Button 1: Web App
        draw_rounded_rect(draw, [center_x - 450, btn_y, center_x - 30, btn_y + 80], radius=40, fill=ACCENT_LIME)
        draw.text((center_x - 380, btn_y + 24), "ai-infra-six.vercel.app", font=font_body_bold, fill=(0, 0, 0))
        
        # Button 2: GitHub CLI
        draw_rounded_rect(draw, [center_x + 30, btn_y, center_x + 450, btn_y + 80], radius=40, fill=(20, 24, 34), outline=PANEL_BORDER, width=2)
        draw.text((center_x + 80, btn_y + 24), "github.com/dumbspin/ai_infra", font=font_body_bold, fill=TEXT_WHITE)
        
        # Footer sub
        draw.text((center_x - 170, 930), "Built by Ayush Dwivedi · 100% Open Source", font=font_mono_sm, fill=TEXT_DIM)

    return np.array(img.convert("RGB"))

def make_video():
    out_dir = Path(r"d:\ai-infra\brag-output")
    out_dir.mkdir(parents=True, exist_ok=True)
    video_path = out_dir / "brag.mp4"
    poster_path = out_dir / "brag.jpg"
    
    # Render Best-Frame Poster (Scene 5 settled outro)
    print("Generating poster thumbnail...")
    poster_frame = render_frame(17.5)
    Image.fromarray(poster_frame).save(poster_path, quality=95)
    print(f"Saved poster to {poster_path}")
    
    # Select audio track
    audio_path = Path(r"d:\ai-infra\.agents\skills\brag\skills\brag\assets\music\happy-beats-business-moves-vol-1-by-ende-dot-app.mp3")
    audio_clip = None
    if audio_path.exists():
        print(f"Loading music from {audio_path}...")
        audio_clip = AudioFileClip(str(audio_path)).subclipped(0, DURATION)
    
    # Generate Video Clip
    print("Synthesizing 1080p 60fps video frames...")
    clip = VideoClip(render_frame, duration=DURATION)
    
    if audio_clip:
        clip = clip.with_audio(audio_clip)
        
    print(f"Rendering {video_path}...")
    clip.write_videofile(
        str(video_path),
        fps=FPS,
        codec="libx264",
        audio_codec="aac" if audio_clip else None,
        preset="fast"
    )
    print("Video rendering complete: " + str(video_path))

if __name__ == "__main__":
    make_video()
