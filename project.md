Build a **fun, retro-minimalistic interactive web app** called **"Tap Madness"**, using **HTML + CSS + JavaScript** with **Firebase** for realtime updates and data storage.

✅ The website must be **dark mode only**, with a **retro aesthetic**:
- Pixel-style fonts
- Terminal-like text and timer
- Big glowing buttons and minimal boxy layout
- No modern gradients — use solid colors, outlines, and neon glows

---
# 🔥 Tap Madness — Realtime Multiplayer Tapping Challenge

## 🧠 What is it?

A fun, anonymous, realtime web game where users from around the world **tap a giant button together** to reach a shared goal (e.g., 1 million taps). No logins. No rules. Just tap.

Perfect for communities like Reddit, JKReact subreddit bros, and more!

---

## 🎯 Goal

- Tap to increase the shared counter.
- Reach the challenge goal together.
- No "winners" — but track:
  - Time taken to reach the goal
  - Top tappers
  - Milestone achievers (10K, 100K, etc.)

---

## 🔁 Reusability

- Admin can **start a new challenge** with a goal.
- Once the challenge ends or is reset, everything resets:
  - Counter
  - User scores
  - Leaderboard
  - Local storage (usernames etc.)

- New challenge can then begin fresh.

---

## 🖥 Screens Overview

### Player Screens:
1. **Active Challenge**
   - Big TAP button
   - Live counter
   - Timer, tap speed, leaderboard (optional)
   - User nickname

2. **Goal Reached Celebration**
   - “We did it!” screen
   - Time taken
   - Leaderboard
   - Share buttons

3. **Reset / Waiting Room**
   - Challenge has ended/reset
   - “Waiting for next challenge…”

4. **Leaderboard (optional tab)**
   - Top tappers today
   - All-time top tappers
   - User’s own rank

### Admin Screens:
5. **Admin Dashboard (hidden URL)**
   - Set new goal
   - Start challenge
   - Monitor stats (taps/sec, top users)
   - Reset challenge (clears everything)
   - Optional: broadcast message

---

## ⚙️ Firebase Structure (Simplified)

```json
"challenge": {
  "status": "active", // or "reset" or "completed"
  "goal": 1000000,
  "counter": 238471,
  "start_time": 1724576000000,
  "end_time": null,
  "milestones": {
    "10000": "TapBro45"
  }
},
"users": {
  "TappyGhost001": {
    "taps": 182,
    "joined": 17245810000
  }
}
```

---

## 🧼 Local Storage Reset Logic

- Each user’s username and session is stored in `localStorage`.
- On `challenge/status = "reset"`:
  - All online users clear localStorage
  - Show reset message
  - Page reloads or moves to waiting screen
- Offline users will auto-clear on next visit if `challenge_id` mismatch is detected

```js
firebase.database().ref('challenge/status').on('value', (snap) => {
  if (snap.val() === 'reset') {
    localStorage.removeItem('tapmadness_username');
    localStorage.removeItem('tapmadness_user_id');
    alert("Challenge has been reset!");
    location.reload();
  }
});
```

---

## 🌐 Tech Stack

- **Frontend**: HTML + CSS + Vanilla JavaScript
- **Realtime DB**: Firebase Realtime Database
- **Hosting**: Firebase Hosting or Netlify
- **User data**: Stored in Firebase, username in localStorage

---

## 🧩 Fun Features

- Anonymous auto-generated nicknames
- Live counter and emoji animations
- Streak combos, fun sound effects
- Easter egg on 69,420th tap 🎉
- Celebrations on milestones
- Tap speed indicator

---

## 🔐 Admin Controls

- `/admin` route (protected by token or hidden access)
- Start a new challenge
- Reset challenge (clears all)
- View stats: total taps, top users, tap speed
- Optional: simulate taps (for testing)

---

## ✅ Summary

| Feature            | Status |
|--------------------|--------|
| Realtime counter   | ✅     |
| Reusable challenges| ✅     |
| Local data clearing| ✅     |
| Leaderboard        | ✅     |
| Admin control panel| ✅     |
| Anonymous play     | ✅     |

---

Let the broskies unite. Let the taps begin. 🫡🔥
