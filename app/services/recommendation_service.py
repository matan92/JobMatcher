def calculate_recommendation_score(job, candidate):
    rule_score = 0
    semantic_score = 0

    # -----------------------------------
    # 1. LOCATION SCORING
    # -----------------------------------
    if candidate.location.lower() == job.location.lower():
        rule_score += 25      # exact match
    else:
        rule_score += 10      # still acceptable, but lower score

    # -----------------------------------
    # 2. SALARY FILTERING + SCORING
    # -----------------------------------
    # Candidate must not exceed job salary_max
    if job.salary_max is not None:
        if candidate.salary_expectation > job.salary_max:
            return None  # candidate is too expensive → reject
        else:
            rule_score += 25  # salary acceptable

    # Candidate expects too little? Still okay.
    # salary_min is optional → no effect

    # -----------------------------------
    # 3. REQUIRED LANGUAGES (strict filtering)
    # -----------------------------------
    required_langs = set(job.required_languages or [])
    candidate_langs = set(candidate.languages or [])

    if required_langs:
        overlap = len(required_langs & candidate_langs)

        if overlap == 0:
            return None  # missing ALL required languages
        elif overlap == len(required_langs):
            rule_score += 20  # full match
        else:
            rule_score += 10  # partial match

    # -----------------------------------
    # 4. MANDATORY REQUIREMENTS (strict)
    # "requirements" = must-have skills
    # -----------------------------------
    mandatory = set(job.requirements or [])
    candidate_exp_text = " ".join(candidate.experience).lower()

    # All mandatory skills must appear in experience
    for req in mandatory:
        if req.lower() not in candidate_exp_text:
            return None  # missing a must-have skill

    rule_score += 20

    # -----------------------------------
    # 5. ADVANTAGES (soft match)
    # "advantages" = nice-to-have skills
    # -----------------------------------
    advantages = job.advantages or []
    adv_matches = 0

    for adv in advantages:
        if adv.lower() in candidate_exp_text:
            adv_matches += 1

    semantic_score += min(20, adv_matches * 5)  # max 20 points

    # -----------------------------------
    # 6. SEMANTIC EXPERIENCE BONUS
    # (the more relevant the experience, the better)
    # -----------------------------------
    semantic_score += min(20, len(candidate.experience) * 2)

    # -----------------------------------
    # 7. FINAL SCORE (clamped to 0–100)
    # -----------------------------------
    final_score = min(100, rule_score + semantic_score)

    return {
        "candidate": candidate,
        "score": final_score,
        "rule_score": rule_score,
        "semantic_score": semantic_score
    }
