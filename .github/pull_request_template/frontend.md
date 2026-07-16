## 🖥️ Frontend Pull Request

### Overview
Briefly describe what changes have been made on the frontend.

### Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] UI/UX improvement
- [ ] Refactoring
- [ ] Performance improvement
- [ ] Other (please specify):

### Code Quality Checklist
- [ ] Code follows the project's coding standards and style guide
- [ ] All TypeScript types are properly defined (no `any` types used)
- [ ] No ESLint errors or warnings (`cd frontend && npm run lint`)
- [ ] No `console.log` or debugging statements left in code
- [ ] Code is DRY — no unnecessary duplication
- [ ] Functions and variables have clear, descriptive names
- [ ] Complex logic has explanatory comments
- [ ] Dead/commented-out code has been removed

### UI/UX Checklist
- [ ] UI changes match the design specifications/mockups
- [ ] All interactive elements have appropriate hover/focus/active states
- [ ] Loading states implemented for async operations
- [ ] Error states and messages are user-friendly
- [ ] Empty states handled appropriately
- [ ] Form validation provides clear, real-time feedback
- [ ] Success/confirmation messages displayed where appropriate

### Responsiveness & Accessibility
- [ ] Tested on mobile (320px–480px)
- [ ] Tested on tablet (768px–1024px)
- [ ] Tested on desktop (1280px+)
- [ ] All images have appropriate `alt` text
- [ ] Semantic HTML elements used (`header`, `nav`, `main`, `section`, etc.)
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text) — note: full WCAG validation requires manual testing with assistive technologies
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] ARIA labels added where native semantics are insufficient
- [ ] Focus indicators are visible

### Testing Checklist
- [ ] All existing tests pass (`cd frontend && npm test`)
- [ ] New unit tests added for new components/services
- [ ] Component tests cover edge cases and error scenarios
- [ ] Manual testing completed in development environment
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)

### Performance Checklist
- [ ] No unnecessary re-renders or infinite loops
- [ ] Large lists use pagination (not unbounded)
- [ ] Images optimized and lazy-loaded where appropriate
- [ ] No memory leaks (RxJS subscriptions properly unsubscribed)
- [ ] Bundle size impact is acceptable (`npm run build` output reviewed)

### Security Checklist
- [ ] User input sanitized to prevent XSS
- [ ] Sensitive data (passwords, tokens) not logged or exposed
- [ ] No API keys or secrets hardcoded in frontend code
- [ ] Auth tokens stored securely

### API Contract
- [ ] Any changed request/response shapes are reflected in generated contracts (`npm run contracts:sync` from root)
- [ ] `npm run contracts:check` passes with no drift

### How to Test
1.
2.
3.

**Expected Behavior:**

### Edge Cases to Verify
- 
- 

### Screenshots / Videos
<!-- Required for UI changes — attach before/after screenshots or a screen recording -->

**Before:**

**After:**

**Mobile View (if applicable):**

### Related Issues / PRs
Closes #
Related to #

### Additional Notes
