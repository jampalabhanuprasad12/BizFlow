# BizFlow – Smart Business Back Office

BizFlow is a browser-based back office for small salons and beauty studios to manage customers, invoices, payments, expenses, payment reminders and cash-flow forecasts.

## Features

- **Dashboard**: a summary of money in, money out and what needs attention.
- **Customers**: profiles, invoice and payment history, and pending balances.
- **Invoices**: GST-ready, printable, with status tracking.
- **Payments**: full and partial payments, with duplicate and overpayment protection.
- **Reminders**: grouped by how late they are; copy or open WhatsApp with a prefilled message; follow-up history.
- **Expenses and upcoming bills**: recurring bills, paid/unpaid status, and alerts.
- **Cash-flow forecast**: 30, 60 and 90 day views.
- **What-If simulator**: payment-delay scenarios that never change real records.
- **Smart Action Center**: a prioritised list of what to do next.
- **Reports**: with CSV download.
- **Settings**: backup, restore and CSV export.

## Tech stack

- React 18
- Vite
- Tailwind CSS v3
- react-router-dom
- Recharts
- lucide-react

## Requirements

- Node.js 18 or newer
- npm

## Setup

```bash
npm install        # install dependencies
npm run dev        # start the dev server (opens at http://127.0.0.1:5173)
npm run build      # production build, written to dist/
npm run preview    # preview the production build locally
```

## Data storage

All data stays in the browser's localStorage under the key `bizflow:data:v1`. Nothing is sent to a server. Clearing site data deletes it, so export a backup from Settings regularly.

## Environment variables

None required. There is no backend and no API keys.

## Project structure

- `src/pages`: one file per screen.
- `src/components`: `ui`, `layout`, `customers`, `invoices`, `payments`, `reminders`, `expenses`, `dashboard`, `settings`.
- `src/lib`: pure calculation modules.
- `src/store`: `DataContext`, the single data source.
- `src/data`: sample data.

## Security notes

- No secrets are used.
- Data is not transmitted anywhere.
- The app never sends WhatsApp or email messages itself. It prepares them for the owner to send.

## Known limitations

- Local-only storage on one browser.
- No multi-user login.
- Currency is fixed to INR.

## License

Not yet specified. Add a LICENSE file before publishing.
