"""Auth, RBAC, and the minor-consent gate (Stories 1.4, 2.3 — FR-20)."""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient

from tests.conftest import auth_header, register


async def test_register_returns_a_usable_token(client: AsyncClient) -> None:
    token = await register(client, "new@example.com")
    assert token["token_type"] == "bearer"
    assert token["role"] == "student"

    me = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert me.status_code == 200
    assert me.json()["email"] == "new@example.com"


async def test_duplicate_email_is_rejected(client: AsyncClient) -> None:
    await register(client, "dupe@example.com")
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dupe@example.com",
            "password": "another-password",
            "full_name": "Other",
            "role": "student",
        },
    )
    assert response.status_code == 409


async def test_login_succeeds_and_wrong_password_fails_identically(client: AsyncClient) -> None:
    await register(client, "login@example.com", password="correct-horse-battery")

    ok = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "correct-horse-battery"},
    )
    assert ok.status_code == 200

    bad_password = await client.post(
        "/api/v1/auth/login", json={"email": "login@example.com", "password": "wrong"}
    )
    unknown_email = await client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "wrong"}
    )
    # Identical responses: a different message would reveal which emails are registered.
    assert bad_password.status_code == unknown_email.status_code == 401
    assert bad_password.json()["detail"] == unknown_email.json()["detail"]


async def test_password_over_bcrypt_limit_is_rejected_not_truncated(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "long@example.com",
            "password": "x" * 100,
            "full_name": "Long",
            "role": "student",
        },
    )
    assert response.status_code == 422


async def test_protected_route_requires_a_token(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer nonsense"})
    ).status_code == 401


async def test_counselor_queue_is_closed_to_students(
    client: AsyncClient, student: dict[str, Any]
) -> None:
    response = await client.get("/api/v1/counselor/queue", headers=student["headers"])
    assert response.status_code == 403


# --------------------------------------------------------------------------------------
# The minor-consent gate (FR-20)
# --------------------------------------------------------------------------------------
async def test_minor_profile_starts_with_the_gate_closed(
    client: AsyncClient, minor_payload: dict[str, Any]
) -> None:
    token = await register(client, "minor@example.com")
    created = await client.post(
        "/api/v1/profile", json=minor_payload, headers=auth_header(token)
    )
    assert created.status_code == 201
    assert created.json()["consent_type"] == "guardian_consent_minor"
    assert created.json()["consent_given_by"] is None

    status_response = await client.get("/api/v1/profile/status", headers=auth_header(token))
    body = status_response.json()
    assert body["consent_required"] is True
    assert body["consent_recorded"] is False
    assert body["can_generate_recommendations"] is False
    assert "guardian" in body["blocking_reason"].lower()


async def test_evaluate_is_403_for_a_minor_without_consent(
    client: AsyncClient, catalogue: Any, minor_payload: dict[str, Any]
) -> None:
    token = await register(client, "ungated@example.com")
    await client.post("/api/v1/profile", json=minor_payload, headers=auth_header(token))

    response = await client.post(
        "/api/v1/recommendations/evaluate", headers=auth_header(token)
    )
    assert response.status_code == 403
    assert response.json()["detail"] == (
        "Guardian consent is required for minors before generating recommendations"
    )


async def test_guardian_consent_unlocks_evaluation(
    client: AsyncClient, catalogue: Any, minor_payload: dict[str, Any]
) -> None:
    student_token = await register(client, "gated@example.com")
    profile = (
        await client.post(
            "/api/v1/profile", json=minor_payload, headers=auth_header(student_token)
        )
    ).json()
    guardian_token = await register(client, "guardian@example.com", role="guardian")

    consent = await client.post(
        "/api/v1/auth/minor-consent",
        json={
            "student_profile_id": profile["id"],
            "guardian_email": "guardian@example.com",
            "guardian_full_name": "Guardian Name",
            "relationship_to_student": "Mother",
            "consent_confirmed": True,
        },
        headers=auth_header(guardian_token),
    )
    assert consent.status_code == 200
    assert consent.json()["consent_given_by"] is not None

    evaluated = await client.post(
        "/api/v1/recommendations/evaluate", headers=auth_header(student_token)
    )
    assert evaluated.status_code == 200


async def test_a_student_cannot_consent_for_themselves(
    client: AsyncClient, minor_payload: dict[str, Any]
) -> None:
    token = await register(client, "selfconsent@example.com")
    profile = (
        await client.post("/api/v1/profile", json=minor_payload, headers=auth_header(token))
    ).json()

    response = await client.post(
        "/api/v1/auth/minor-consent",
        json={
            "student_profile_id": profile["id"],
            "guardian_email": "selfconsent@example.com",
            "guardian_full_name": "Me Myself",
            "relationship_to_student": "Self",
            "consent_confirmed": True,
        },
        headers=auth_header(token),
    )
    assert response.status_code == 400
    assert "cannot record guardian consent for their own" in response.json()["detail"]


async def test_unconfirmed_consent_is_rejected(
    client: AsyncClient, minor_payload: dict[str, Any]
) -> None:
    token = await register(client, "unconfirmed@example.com")
    profile = (
        await client.post("/api/v1/profile", json=minor_payload, headers=auth_header(token))
    ).json()
    guardian_token = await register(client, "g2@example.com", role="guardian")

    response = await client.post(
        "/api/v1/auth/minor-consent",
        json={
            "student_profile_id": profile["id"],
            "guardian_email": "g2@example.com",
            "guardian_full_name": "Guardian",
            "relationship_to_student": "Father",
            "consent_confirmed": False,
        },
        headers=auth_header(guardian_token),
    )
    assert response.status_code == 422


async def test_adult_stage_needs_no_guardian_consent(
    client: AsyncClient, student: dict[str, Any]
) -> None:
    body = (await client.get("/api/v1/profile/status", headers=student["headers"])).json()
    assert body["consent_required"] is False
    assert body["can_generate_recommendations"] is True


async def test_moving_into_a_minor_stage_recloses_the_gate(
    client: AsyncClient, student: dict[str, Any], minor_payload: dict[str, Any]
) -> None:
    """Re-onboarding into a minor stage must not inherit adult self-consent."""
    response = await client.post(
        "/api/v1/profile", json=minor_payload, headers=student["headers"]
    )
    assert response.status_code == 201
    assert response.json()["consent_type"] == "guardian_consent_minor"
    assert response.json()["consent_given_by"] is None

    status_response = await client.get("/api/v1/profile/status", headers=student["headers"])
    assert status_response.json()["can_generate_recommendations"] is False
