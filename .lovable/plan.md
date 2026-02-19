
# Add Dark Mode Toggle

## Why This Is the Quickest Win
- The `next-themes` package is already installed
- Dark mode CSS variables are already fully defined in `src/index.css` (lines 77-130+)
- Only 3 small changes needed

## Changes

### 1. Create Theme Provider (`src/components/ThemeProvider.tsx`)
- Wrap `next-themes`'s `ThemeProvider` with sensible defaults (`attribute="class"`, `defaultTheme="system"`, `storageKey="book-generator-theme"`)

### 2. Create Dark Mode Toggle Button (`src/components/DarkModeToggle.tsx`)
- A simple button with Sun/Moon icons from `lucide-react`
- Uses `useTheme()` from `next-themes` to toggle between light and dark
- Styled to match the existing header button style (rounded, bordered)

### 3. Update `src/App.tsx`
- Wrap the app content with the new `ThemeProvider`
- Add the `DarkModeToggle` button to the header (next to the Sign Out button)

### 4. Update `index.html`
- Ensure no flash of unstyled content by keeping the html tag clean (next-themes handles the class injection)

## Technical Details
- No database changes
- No new dependencies (next-themes already installed)
- No API calls
- Two new small component files, two minor edits to existing files
