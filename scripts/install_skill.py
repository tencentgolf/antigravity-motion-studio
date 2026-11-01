#!/usr/bin/env python3
"""
Cross-Agent Skill Installer for Antigravity Motion Studio (`scripts/install_skill.py`).

Installs the `motion-video` skill (pre-configured with your local clone path) into:
1. Google Antigravity / Gemini CLI: `~/.gemini/config/skills/motion-video/SKILL.md`
2. Claude Code: `~/.claude/skills/motion-video/SKILL.md` and `~/.claude/commands/motion-video.md`
3. OpenAI Codex CLI: `~/.codex/skills/motion-video/SKILL.md`

Usage:
  python scripts/install_skill.py --target all
  python scripts/install_skill.py --target antigravity
  python scripts/install_skill.py --target claude
  python scripts/install_skill.py --target codex
"""

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Install the motion-video skill for Antigravity/Gemini, Claude Code, and/or Codex"
    )
    parser.add_argument(
        "--target",
        choices=["all", "antigravity", "gemini", "claude", "codex"],
        default="all",
        help="Which AI coding agent(s) to install the skill for (default: all)",
    )
    args = parser.parse_args()

    studio_root = Path(__file__).resolve().parent.parent
    template_path = studio_root / "skills" / "motion-video" / "SKILL.md"
    skill_content = template_path.read_text(encoding="utf-8").replace(
        "__STUDIO_PATH__", str(studio_root)
    )

    home = Path.home()
    targets = (
        ["antigravity", "claude", "codex"]
        if args.target == "all"
        else ["antigravity" if args.target == "gemini" else args.target]
    )

    for t in targets:
        if t == "antigravity":
            dest = home / ".gemini" / "config" / "skills" / "motion-video" / "SKILL.md"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(skill_content, encoding="utf-8")
            print(f"[install] Installed Antigravity / Gemini skill -> {dest}")

        elif t == "claude":
            # 1. Claude Code Skill directory
            skill_dest = home / ".claude" / "skills" / "motion-video" / "SKILL.md"
            skill_dest.parent.mkdir(parents=True, exist_ok=True)
            skill_dest.write_text(skill_content, encoding="utf-8")
            # 2. Claude Code global `/motion-video` slash command
            cmd_dest = home / ".claude" / "commands" / "motion-video.md"
            cmd_dest.parent.mkdir(parents=True, exist_ok=True)
            cmd_dest.write_text(skill_content, encoding="utf-8")
            print(f"[install] Installed Claude Code skill -> {skill_dest}")
            print(f"[install] Installed Claude Code /motion-video command -> {cmd_dest}")

        elif t == "codex":
            codex_dest = home / ".codex" / "skills" / "motion-video" / "SKILL.md"
            codex_dest.parent.mkdir(parents=True, exist_ok=True)
            codex_dest.write_text(skill_content, encoding="utf-8")
            print(f"[install] Installed Codex CLI skill -> {codex_dest}")


if __name__ == "__main__":
    main()
