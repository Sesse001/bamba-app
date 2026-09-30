# Bamba

A South African language-learning and translation contribution platform.

Learn isiZulu, Sesotho, Xitsonga, and more — while contributing new language knowledge that helps preserve them for future generations.

---

## What Bamba is

Bamba is **two connected things**:

- **📚 Learn** — Short lessons in South African languages. Reveal expressions, learn multiple valid ways to say something, track your progress.
- **🌍 Contribute** — Add your own expressions. Every contribution becomes structured, queryable language data.

Unlike traditional language apps, Bamba never presents translations as "correct" or "incorrect." Regional variants, formal/casual registers, and community alternatives are all first-class.

---

## Current state (V2 rebuild)

**Working on-device:**
- Guest-first auth, upgradeable to email/password (same UID, all data preserved)
- Language picker (isiZulu, Sesotho, Xitsonga — plus 8 catalogued for future)
- Learning flow: prompt → reveal translations → try your own
- Contribution submission with status tracking
- My Contributions screen
- Per-language progress tracking
- Language switching with preserved state
- Onboarding (first-launch only)
- Daily reminder preference (plumbing only — scheduling deferred)
- Standardized error handling across all screens
- Firestore rules locked down to owner-only for user data

**Not yet built:**
- Actual daily reminder scheduling
- Voice / audio pronunciation
- Multiple-choice practice mode
- Community voting on contributions
- Admin / sub-admin reviewer workflow
- Web version
- App icon / branding (in progress)

---

## Tech stack

- **Expo SDK 54** + Expo Router (file-based routing)
- **Firebase** (Auth + Firestore)
- **AsyncStorage** (local cache for auth + language preference)
- **expo-notifications**, **expo-local-authentication** (installed, partially wired)

---

## Getting started

### Prerequisites

- Node.js 18+
- Expo Go on your phone (for development)
- A Firebase project (see setup below)

### Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/Sesse001/bamba-app.git
   cd bamba-app