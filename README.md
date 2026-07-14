# 大山脚浸信教会官网 – Bukit Mertajam Baptist Chinese Church (BMBCC) Website

Welcome to the newly rebuilt, highly functional, and fully responsive website for **Bukit Mertajam Baptist Chinese Church (BMBCC)**!

This project has been completely redesigned and engineered from scratch using **React, Vite, and Tailwind CSS**. It replicates and completes the original design from [fongway94.wordpress.com](https://fongway94.wordpress.com/) while adding a powerful **instant client-side Admin Panel** that allows the church administration to easily update everything without paying a single cent in monthly hosting or database subscriptions.

---

## 🌟 Key Features

1. **Bilingual Support (English / Chinese - 🚀 Toggle Instantly)**
   - All components, navigation menus, and content pieces have dual-language support. A simple toggle at the top navigation lets users switch languages seamlessly.

2. **No Subscription Fees & Hassle-Free Hosting**
   - The website can be hosted **100% free of charge** on **GitHub Pages**, **Vercel**, or **Netlify**. There are zero database or subscription fees required.
   
3. **Interactive Admin Panel (`/admin`)**
   - **General Settings**: Update Church Name, Slogan, and Contact Details.
   - **Live Theme Customization**: Change the entire website's brand theme color instantly (Emerald, Indigo, Blue, Violet, Amber, Rose) using dynamic CSS custom properties.
   - **Service Timetable Editor**: Add, modify, or delete church services, schedules, times, locations, and languages.
   - **Event Manager**: Create and publish new upcoming events with pictures, location, date, time, and full description.
   - **Ministry Content Management**: Edit cards, details, and pictures of major ministries (Neighborly Community Care, Five Loaves & Two Fishes, Spring of Grace Elderly Day Care, etc.).
   - **Banner Carousel Management**: Control homepage slide images, captions, and text descriptions.

4. **Zero-Database Git-as-CMS / LocalStorage Pattern**
   - All modifications are automatically persisted inside the administrator's browser's local storage for real-time preview and editing.
   - **JSON Backup & Restore**: An easy "Export JSON" button lets you download the entire customized site layout as a file. If you make a mistake, you can re-import the file in seconds to restore it, or commit it to your GitHub repository (`src/data/initialData.js`) to make your changes public for all users!

---

## 🚀 How to Set Up Free Hosting on GitHub Pages

This project comes pre-configured with a **GitHub Actions** CI/CD deployment file. When you push your updates to the repository, GitHub will build and host your website for free!

1. Go to your repository settings on GitHub (**Settings** > **Pages**).
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Push your code to your working branch (or merge it to `main`).
4. GitHub will automatically deploy your site! Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`.

---

## 🛡️ Admin Panel & Credentials

- To access the Admin panel:
  - Click on the **Admin (盾牌/登录)** icon in the top-right navigation bar, or select it from the mobile menu.
  - Enter the administrator password.
  - **Default Password**: `bmbccadmin123` (You can customize this password inside the Settings panel).

---

## 🛠️ Local Development & Execution

To run and preview the website on your local machine:

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Local Dev Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```
Generates a highly optimized static bundle inside the `dist/` directory, ready to be served from any web server.

---

## 📁 Project Architecture & Files Created
- `src/App.jsx`: Main routing, header, footer, interactive views (Home, About Us, Ministries, Timetable, Events), and the fully featured Admin dashboard editor.
- `src/data/initialData.js`: Centralized bilingual database configuration for sliders, weekly services, events, contact details, and pastor team bios.
- `src/index.css`: Imports Tailwind utility and configures standard base elements.
- `vite.config.js` & `tailwind.config.js`: Custom assets resolver using relative paths for hassle-free deployments and CSS-variables-mapped dynamic theme coloring.
- `.github/workflows/deploy.yml`: Automated GitHub Pages pipeline.
