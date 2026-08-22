"""Crisis detection and supportive response (FR-16, PRD Section 14, Story 4.3).

This runs BEFORE any career logic and before any LLM call. A student in distress must
never be routed through a career-advice pipeline first, and the response must never
depend on an external service being reachable — so the crisis reply is a fixed,
locally-generated message with real helpline numbers, not a generated one.

Detection is deliberately over-inclusive. A false positive costs a student one
unnecessary supportive message; a false negative costs far more.
"""

from __future__ import annotations

import re

# Indian national helplines. Verified against the government sources cited in
# docs/architecture/security-and-privacy.md; review on the same cycle as the catalogue.
CRISIS_HELPLINES: list[dict[str, str]] = [
    {
        "name": "Tele-MANAS",
        "number": "14416",
        "detail": "Government of India mental health support. Free, 24x7, in many languages.",
    },
    {
        "name": "KIRAN Mental Health Helpline",
        "number": "1800-599-0019",
        "detail": "Ministry of Social Justice and Empowerment. Free, 24x7, 13 languages.",
    },
    {
        "name": "Emergency services",
        "number": "112",
        "detail": "For immediate danger to life.",
    },
]

# Phrases indicating self-harm, suicidal ideation, or acute distress. Word-boundary
# matched so 'exam killed me' style hyperbole is caught by intent phrases rather than
# by a bare word like 'kill'.
CRISIS_PATTERNS: tuple[str, ...] = (
    r"\bkill(ing)?\s+my\s?self\b",
    r"\bkill\s+me\b",
    r"\bend(ing)?\s+(my\s+life|it\s+all)\b",
    r"\bsuicid(e|al)\b",
    r"\bself[\s-]?harm\b",
    r"\bcut(ting)?\s+my\s?self\b",
    r"\bhurt(ing)?\s+my\s?self\b",
    r"\bwant\s+to\s+die\b",
    r"\bdon'?t\s+want\s+to\s+(live|be\s+alive)\b",
    r"\bno\s+(reason|point)\s+(to|in)\s+liv(e|ing)\b",
    r"\bbetter\s+off\s+(dead|without\s+me)\b",
    r"\bnot\s+worth\s+living\b",
    r"\bjump\s+(off|from)\s+(a\s+)?(building|bridge|terrace|roof)\b",
    r"\bhang\s+my\s?self\b",
    r"\boverdose\b",
    r"\bcan'?t\s+(go\s+on|take\s+(it|this)\s+any\s?more)\b",
    r"\btired\s+of\s+living\b",
    r"\bnobody\s+would\s+miss\s+me\b",
    r"\bmy\s+(family|parents)\s+would\s+be\s+better\s+off\s+without\s+me\b",
)

_COMPILED = tuple(re.compile(pattern, re.IGNORECASE) for pattern in CRISIS_PATTERNS)


def detect_crisis(text: str) -> bool:
    """True when the text shows signs of self-harm risk or acute distress."""
    if not text:
        return False
    normalized = re.sub(r"\s+", " ", text)
    return any(pattern.search(normalized) for pattern in _COMPILED)


def build_crisis_response() -> str:
    """The fixed supportive reply.

    Written to be calm and non-clinical, and to avoid the two failure modes that matter
    here: dismissing the feeling, and burying the helpline under paragraphs. It carries
    no career content at all — that conversation can wait.
    """
    lines = [
        "It sounds like you are going through something really heavy right now, and I "
        "am glad you said it out loud.",
        "",
        "I am a career guidance assistant, so I am not the right kind of help for this "
        "— but people who are trained for exactly this are available right now, free, "
        "and they will not judge you:",
        "",
    ]
    for helpline in CRISIS_HELPLINES:
        lines.append(f"  • {helpline['name']} — {helpline['number']}")
        lines.append(f"    {helpline['detail']}")
    lines.extend(
        [
            "",
            "If you can, please also tell one person near you — a parent, a teacher, an "
            "older sibling, anyone you trust.",
            "",
            "No exam result and no career decision is worth your life. Those choices can "
            "all be remade later. A counselor from our team has been notified and can "
            "reach out to you.",
        ]
    )
    return "\n".join(lines)
