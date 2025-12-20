# 🎬 YouTube Title Processor

**AI-powered YouTube title optimization built with Motia workflows**

Turn raw YouTube titles into **viral, SEO-optimized, and brand-safe recommendations** — with a clear AI-driven decision on *what to publish*.

---

## 🚨 Problem
Creators struggle with:

- Choosing the *right* title
- Balancing **virality vs SEO**
- Making decisions based on intuition, not data

Even great videos fail due to poor titles → **low CTR, low reach**.

---

## 💡 Solution
**YouTube Title Processor** uses **Motia’s unified backend runtime** to:

- Analyze recent YouTube videos from a channel
- Generate **3 optimized title variants per video**:
  - 🔥 Viral (emotion + curiosity)
  - 🔍 SEO (keyword-rich & discoverable)
  - 🏷 Professional (brand-safe & clean)
- Score titles for viral potential
- 🏆 **Automatically recommend the BEST title** with reasoning
- Deliver a **clean, decision-ready email report**

No dashboards. No clutter. Just decisions.

---

## ✨ Key Features

### 🧪 A/B/C Title Testing
- Viral → emotional & curiosity-driven
- SEO → keyword-optimized for search
- Professional → brand-safe tone

### 🏆 AI “Best Pick” Recommendation
- Compares title performance scores
- Picks the highest-impact title
- Explains *why* it won

### 🖼 Thumbnail Text Generator
- 3 short, emotional thumbnail phrases per video
- Optimized for CTR (3–4 words max)

### 📬 Email-First UX
- Clean, readable SaaS-style report
- Judges understand output in **< 30 seconds**
- Perfect for creators who want fast decisions

---

## 🧠 Why Motia?
This project deeply leverages **Motia’s core strengths**:

- **Steps as a single core primitive**
- Event-driven workflows
- Durable state management
- Clean separation of concerns
- Production-ready execution model

No extra queues, cron jobs, or background services required.

---

## 🔄 Workflow Architecture

1. **API Step** – Submit channel name & email
2. **Resolve Channel Step** – Fetch channel details
3. **Fetch Videos Step** – Get recent uploads
4. **AI Title Step** – Generate variants, scores & recommendation
5. **Email Step** – Send final report
6. **Error Handler Step** – Graceful failure handling

All orchestrated using **Motia workflows**.

## 🎥 Execution Walkthrough (Screen Recordings)

📌 **Full-quality screen recordings are hosted via GitHub Releases**  
(Recommended for judges — no compression, no broken previews)

---

### ▶️ Motia Workflow Execution (Workbench)
Shows the unified workflow and step execution inside Motia.

🔗 https://github.com/Ruturaj-007/viral-youtube-title-processor/releases/download/v1-demo/motia_workbench.mp4

---

### ▶️ Motia CLI Logs (Runtime)
Demonstrates real-time execution, state transitions, and observability.

🔗 https://github.com/Ruturaj-007/viral-youtube-title-processor/releases/download/v1-demo/terminal_logs.mp4

---

### ▶️ Final Email Output & AI Recommendation
Walkthrough of the generated report, summary, and **AI-selected best title**.

🔗 https://github.com/Ruturaj-007/viral-youtube-title-processor/releases/download/v1-demo/email_system.mp4


## 🛠 Tech Stack

- **Motia** – workflows & steps
- **Gemini API** – AI title generation
- **Resend** – email delivery
- **TypeScript**

---

## 🚀 Future Improvements

- Weighted scoring (SEO vs brand vs viral)
- Batch channel analysis
- Creator performance tracking

---

## 🙌 Built For

**Backend Reloaded Hackathon**  
WeMakeDevs × Motia
![Backend reloade](screenrecordings/Backend_Reloaded_Hackathon.png)
