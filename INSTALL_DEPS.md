# 🚀 Quick Dependency Fix

## Missing Dependencies Error

If you're seeing errors about missing modules like `node-cron`, run this command:

```bash
# In the project root directory
pnpm install

# Or if that doesn't work, manually install the missing packages:
pnpm add node-cron @types/node-cron nodemailer @types/nodemailer
```

## Alternative Commands

If you're not using pnpm:

```bash
# Using npm
npm install

# Using yarn  
yarn install
```

## After Installation

Restart your development server:

```bash
pnpm dev
# or
npm run dev
# or  
yarn dev
```

## What These Dependencies Enable

- **node-cron**: Automated interview reminders and scheduling
- **nodemailer**: Email notifications and calendar invites

## If You Don't Need Interview Features

The system will run without these dependencies, but interview scheduling and email notifications will be disabled.

---

The error you saw should be resolved after running `pnpm install`!