# Long-Term Audit Plan (Refined)
## QR Thermal Label App

---

## ✅ Requirements Confirmed

| Aspect | Requirement |
|--------|-------------|
| **Platform** | Desktop primary, Mobile support required |
| **Offline** | View/Print cached OK offline, Add Customer requires online (show indicator) |
| **Scale** | ~1000 customers per branch |
| **Security** | Internal only, password auth per branch, unpublished domain |
| **GuestBook** | Low priority - experimental, exhibition use only |

---

## 🎯 Prioritized Roadmap (Live Status)

### Phase 1: Critical & Quick Wins ⚡ (COMPLETED)
- [x] **Move API URL to `.env`**
- [x] **Add Online/Offline indicator**
- [x] **Block Add Customer when offline**
- [x] **Session expiry** (7 days)
- [x] **Fix all toast dismissal issues**

### Phase 2: Performance & Scale 📈 (MOSTLY COMPLETE)
- [x] **Virtualization everywhere** (CustomerSearch, BatchModal)
- [x] **Memoize list items** (CustomerCard)
- [x] **Lazy load heavy components** (AdminPanel, GuestBook, BatchModal)
- [x] **Local QR Generation**
- [ ] **GuestBook Virtualization** (Low priority, currently standard list)

### Phase 3: UI/UX Polish 🎨 (COMPLETED)
- [x] **Responsive refinements** (Touch-friendly base, layout tweaks)
- [x] **Consistent modal behavior**
- [x] **Loading states everywhere**
- [x] **Desktop enhancements** (Hover states)
- [ ] **Keyboard shortcuts** (Ctrl+P, Esc) - *Pending*

### Phase 4: Architecture Cleanup 🏗️ (ONGOING)
- [x] **Create CustomerContext**
- [x] **Extract large components** (GuestBook refactor done)
- [x] **Consolidate CSS** (Variables & scoped CSS)
- [ ] **Add PropTypes** (Skipped in favor of rapid iteration)

### Phase 5: Testing & Verification 📚 (IN PROGRESS)
- [x] **Unit tests** (idGenerator.js)
- [ ] **Integration tests** (Auth flow)
- [ ] **Documentation** (Inline JSDoc exists, README needs update)

### Phase 6: Printer & Batch Tools 🖨️ (COMPLETED)
- [x] **Native Printer Context** (WebUSB/Bluetooth/Serial)
- [x] **Batch ID Generator** (PDF/Canvas/ZIP)
- [x] **Smart Format Detection** (Excel/CSV)

---

## 📊 Estimated Total Effort (Remaining)
| Phase | Status | Priority |
|-------|-------|----------|
| Phase 4: Architecture | 🟡 Partial | Low |
| Phase 5: Testing | 🟢 Done | Completed |
| **Firebase Migration** | 📅 **Feb 8** | **Next Major** |


---

## 🚀 Immediate Next Steps (Print & Logic Unification)

### 1. Unify Print Logic
- [x] **Refactor `PrintPreview.jsx`**
  - Remove `escPosEncoder` dependency.
  - Implement `renderLabelToCanvas` + `canvasToRaster` (same as Batch).
  - Add "Print Config" controls (Width/Height/Gap) to Single Print UI.

### 2. Fix Alignment & Margins
- [x] **Refactor `printHelpers.js`**
  - Add explicit margin support (padding) to `renderLabelToCanvas` to prevent content from touching the edge (which causes the cutoff).
  - Ensure `0x0C` (Form Feed) is consistently applied.

---

## 🚀 Immediate Next Steps

I am currently working on **Phase 3: UI/UX Polish**:
1. Responsive refinements (Touch & Keyboard)
2. Consistent modal behavior (Backdrop close)
3. Loading states everywhere
4. Desktop enhancements (Shortcuts)

# Feature: Infinite Scroll & Larger Batch
## Goal
Replace manual "Load More" button with automatic infinite scroll and increase batch size to improve user experience.

## Proposed Changes
### [MODIFY] [CustomerSearch.jsx](file:///d:/PROGRAM/qr-thermal-label-app/src/components/CustomerSearch.jsx)
- **State:** Increase `visibleLimit` increment (from 20 to 50).
- **Logic:** Implement `IntersectionObserver` to trigger loading next batch when a sentinel element comes into view.
- **UI:** Replace "Load More" button with a loading spinner/sentinel div.

# Feature: Smart Relevance Search
## Goal
Improve search experience by ranking results based on relevance (Name > City > Branch) instead of simple filtering. Support "Name City" queries intuitively.

## Proposed Changes
### [MODIFY] [CustomerSearch.jsx](file:///d:/PROGRAM/qr-thermal-label-app/src/components/CustomerSearch.jsx)
- **Logic:** Replace simple `filter` with `map` (score) -> `sort` -> `filter`.
- **Scoring Algorithm:**
    - ID Match: 100pts
    - Name StartsWith: 50pts
    - Name Includes: 20pts
    - City Match: 10pts
    - Multi-term handling: Sum of scores.

# Feature: Mobile Responsive Polish
## Goal
Optimize the application for mobile usage (Smartphone/Tablet) to ensure usability in warehouse/field conditions.

## Proposed Changes
### [MODIFY] [App.css](file:///d:/PROGRAM/qr-thermal-label-app/src/App.css)
- **Global:** Ensure all interactive elements (buttons, inputs) have `min-height: 44px`.
- **Layout:** Adjust padding for mobile viewports (`@media (max-width: 600px)`).

### [MODIFY] [CustomerSearch.jsx](file:///d:/PROGRAM/qr-thermal-label-app/src/components/CustomerSearch.css)
- **Header:** Stack "Branch Filter" and "Search Bar" vertically on mobile to prevent overcrowding.
- **Floating Action:** Ensure the floating "Scan" button is safely above the mobile browser bottom bar.

### [MODIFY] [BatchGeneratorModal.css](file:///d:/PROGRAM/qr-thermal-label-app/src/components/BatchGeneratorModal.css)
- **Steps:** Make the step indicator horizontal scrollable or compact on mobile.
- **Table:** Ensure the preview table scrolls horizontally without breaking layout.

# Feature: GuestBook Refactor (Unification)
## Goal
Standardize `GuestBook.jsx` to use the same Data Context and UI Design System as the rest of the app.

## Proposed Changes
### [MODIFY] [GuestBook.jsx](file:///d:/PROGRAM/qr-thermal-label-app/src/components/GuestBook.jsx)
- **Data Source:** Switch from `getCustomersLite` (API) to `useCustomer()` (Context).
- **UI:** Replace inline styles with `view-toggles` and `page-card` classes.
- **Search:** Implement the same "Weighted Scoring" logic for manual check-in search suggestions.
- **Scan Logic:** Reuse `CustomerContext` primarily for matching scans.

