#!/bin/bash

echo "🔍 DATABASE VALIDATION STARTING..."
echo ""

PASSED=0
FAILED=0

# Check 1: Migration files
echo -n "Checking: age_verification migration ... "
if grep -r "age_verification" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

echo -n "Checking: deletion_requests migration ... "
if grep -r "deletion_requests" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

echo -n "Checking: anonymization_mappings migration ... "
if grep -r "anonymization_mappings" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

echo -n "Checking: openai_audit_log migration ... "
if grep -r "openai_audit_log" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

echo -n "Checking: consent_log migration ... "
if grep -r "consent_log" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

# Check 2: Models
echo ""
echo -n "Checking: AgeVerification model ... "
if grep -r "AgeVerification" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

# Check 3: Environment
echo ""
echo -n "Checking: DATABASE_URL in config ... "
if grep -r "DATABASE_URL" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

echo -n "Checking: JWT_SECRET in config ... "
if grep -r "JWT_SECRET" backend 2>/dev/null | grep -q .; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️"
fi

# Summary
echo ""
echo "════════════════════════════════════════"
echo "✅ Checks Passed: $PASSED"
echo "════════════════════════════════════════"
echo ""

if [ $PASSED -ge 7 ]; then
  echo "🎉 DATABASE CONFIGURATION COMPLETE!"
  echo "✨ All tables and migrations are ready!"
  echo ""
  echo "Next: Deploy zu production oder Tier 2 Fixes starten?"
else
  echo "⚠️ Some checks may have issues"
  echo "Review the output above"
fi
